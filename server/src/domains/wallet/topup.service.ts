import Stripe from 'stripe';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { prisma } from '../../db/index.js';
import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';
import { walletService } from './wallet.service.js';
import { calculateCreditsFromUsd } from '../../lib/model-pricing.registry.js';
import type { TopUpRequest } from '@prisma/client';

export class InvalidTopUpAmountError extends Error {
    readonly statusCode = 400;
    readonly code = 'INVALID_AMOUNT';
    constructor(message = 'Minimum cash top-up amount is 100,000 VND') {
        super(message);
        this.name = 'InvalidTopUpAmountError';
    }
}

class TopUpService {
    private stripe: Stripe;
    private s3: S3Client;

    constructor() {
        this.stripe = new Stripe(env.STRIPE_SECRET_KEY, {
            apiVersion: '2025-04-30.basil',
        });

        this.s3 = new S3Client({
            region: env.AWS_REGION,
            credentials: {
                accessKeyId: env.AWS_ACCESS_KEY_ID,
                secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
            },
        });
    }

    /**
     * Create a Stripe PaymentIntent for credit top-up.
     * Returns clientSecret for frontend to confirm payment.
     */
    async createStripeTopUp(
        userId: number,
        amountUsd: number
    ): Promise<{ clientSecret: string; topUpRequestId: number }> {
        const creditsToAdd = calculateCreditsFromUsd(amountUsd);

        // Ensure wallet exists
        const wallet = await walletService.getOrCreate(userId);

        // Create TopUpRequest record first
        const topUpRequest = await prisma.topUpRequest.create({
            data: {
                userId,
                walletId: wallet.id,
                method: 'STRIPE',
                status: 'PENDING_APPROVAL',
                amountUsd,
            },
        });

        // Create Stripe PaymentIntent
        const paymentIntent = await this.stripe.paymentIntents.create({
            amount: Math.round(amountUsd * 100), // convert to cents
            currency: 'usd',
            metadata: {
                userId: String(userId),
                creditsToAdd: String(creditsToAdd),
                topUpRequestId: String(topUpRequest.id),
            },
        });

        // Update TopUpRequest with stripePaymentIntentId
        await prisma.topUpRequest.update({
            where: { id: topUpRequest.id },
            data: { stripePaymentIntentId: paymentIntent.id },
        });

        if (!paymentIntent.client_secret) {
            throw new Error('Stripe PaymentIntent did not return a client_secret');
        }

        return {
            clientSecret: paymentIntent.client_secret,
            topUpRequestId: topUpRequest.id,
        };
    }

    /**
     * Handle Stripe webhook events.
     * Verifies signature and processes payment_intent.succeeded / payment_intent.payment_failed.
     * Idempotent: duplicate webhooks for the same PaymentIntent are safely ignored.
     */
    async handleStripeWebhook(rawBody: Buffer, signature: string): Promise<void> {
        let event: Stripe.Event;

        try {
            event = this.stripe.webhooks.constructEvent(
                rawBody,
                signature,
                env.STRIPE_WEBHOOK_SECRET
            );
        } catch (err) {
            logger.warn({ err }, '[TopUpService] Stripe webhook signature verification failed');
            throw err;
        }

        if (event.type === 'payment_intent.succeeded') {
            const paymentIntent = event.data.object as Stripe.PaymentIntent;
            await this.handlePaymentSucceeded(paymentIntent);
        } else if (event.type === 'payment_intent.payment_failed') {
            const paymentIntent = event.data.object as Stripe.PaymentIntent;
            await this.handlePaymentFailed(paymentIntent);
        }
        // Other event types are ignored
    }

    private async handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
        const { id: stripePaymentIntentId, metadata } = paymentIntent;

        // Idempotency check: skip if already processed
        const existing = await prisma.topUpRequest.findUnique({
            where: { stripePaymentIntentId },
        });

        if (!existing) {
            logger.warn(
                { stripePaymentIntentId },
                '[TopUpService] No TopUpRequest found for PaymentIntent'
            );
            return;
        }

        if (existing.status === 'SUCCEEDED') {
            logger.info(
                { stripePaymentIntentId, topUpRequestId: existing.id },
                '[TopUpService] Webhook already processed (idempotent), skipping'
            );
            return;
        }

        const creditsToAdd = Number(metadata.creditsToAdd);
        const userId = Number(metadata.userId);

        // Add credits to wallet
        const transaction = await walletService.addCredits({
            userId,
            credits: creditsToAdd,
            type: 'TOPUP',
            description: `Stripe top-up: $${(paymentIntent.amount / 100).toFixed(2)} USD`,
            topUpRequestId: existing.id,
        });

        // Update TopUpRequest to SUCCEEDED
        await prisma.topUpRequest.update({
            where: { id: existing.id },
            data: {
                status: 'SUCCEEDED',
                creditsAdded: creditsToAdd,
            },
        });

        logger.info(
            { userId, creditsToAdd, transactionId: transaction.id, topUpRequestId: existing.id },
            '[TopUpService] Stripe payment succeeded, credits added'
        );
    }

    private async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
        const { id: stripePaymentIntentId } = paymentIntent;

        const existing = await prisma.topUpRequest.findUnique({
            where: { stripePaymentIntentId },
        });

        if (!existing) {
            logger.warn(
                { stripePaymentIntentId },
                '[TopUpService] No TopUpRequest found for failed PaymentIntent'
            );
            return;
        }

        await prisma.topUpRequest.update({
            where: { id: existing.id },
            data: { status: 'FAILED' },
        });

        logger.info(
            { stripePaymentIntentId, topUpRequestId: existing.id },
            '[TopUpService] Stripe payment failed, TopUpRequest marked FAILED'
        );
    }

    /**
     * Generate a presigned S3 PUT URL for uploading a proof-of-payment image.
     * Valid for 15 minutes.
     */
    async getUploadUrl(userId: number): Promise<{ uploadUrl: string; key: string }> {
        const key = `proof-images/${userId}/${Date.now()}-${randomUUID()}`;

        const command = new PutObjectCommand({
            Bucket: env.S3_BUCKET_NAME,
            Key: key,
            ContentType: 'image/*',
        });

        const uploadUrl = await getSignedUrl(this.s3, command, { expiresIn: 15 * 60 }); // 15 min

        return { uploadUrl, key };
    }

    /**
     * Submit a cash (VND) top-up request.
     * Minimum amount: 100,000 VND.
     */
    async submitCashTopUp(
        userId: number,
        params: { amountVnd: number; proofImageKey: string; note?: string }
    ): Promise<TopUpRequest> {
        const { amountVnd, proofImageKey, note } = params;

        if (amountVnd < 100_000) {
            throw new InvalidTopUpAmountError();
        }

        const wallet = await walletService.getOrCreate(userId);

        const topUpRequest = await prisma.topUpRequest.create({
            data: {
                userId,
                walletId: wallet.id,
                method: 'CASH_VND',
                status: 'PENDING_APPROVAL',
                amountVnd,
                proofImageKey,
                note: note ?? null,
            },
        });

        logger.info(
            { userId, amountVnd, topUpRequestId: topUpRequest.id },
            '[TopUpService] Cash top-up request submitted'
        );

        return topUpRequest;
    }

    /**
     * List top-up history for a user with pagination.
     */
    async listUserTopUps(
        userId: number,
        params: { page: number; pageSize: number }
    ): Promise<{ items: TopUpRequest[]; total: number }> {
        const { page, pageSize } = params;
        const skip = (page - 1) * pageSize;

        const [items, total] = await Promise.all([
            prisma.topUpRequest.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                skip,
                take: pageSize,
            }),
            prisma.topUpRequest.count({ where: { userId } }),
        ]);

        return { items, total };
    }
}

export const topUpService = new TopUpService();
