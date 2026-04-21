import Stripe from 'stripe';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import type { PrismaClient, TopUpRequest } from '@prisma/client';
import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';
import { InvalidTopUpAmountError } from '../../shared/errors/app-error.js';

export interface CashTopUpParams {
    amountVnd: number;
    proofImageKey: string;
    note?: string;
}

export interface IWalletService {
    addCredits(params: {
        userId: number;
        credits: number;
        type: string;
        description: string;
        topUpRequestId?: number;
        brandId?: number;
    }): Promise<unknown>;
    getOrCreate(userId: number): Promise<{ id: number }>;
}

export class TopUpRequestService {
    constructor(
        private readonly prisma: PrismaClient,
        private readonly stripe: Stripe | null,
        private readonly s3: S3Client,
    ) { }

    /**
     * Create a Stripe PaymentIntent for credit top-up.
     * Returns clientSecret for frontend to confirm payment.
     */
    async createStripeTopUp(
        userId: number,
        amountUsd: number
    ): Promise<{ clientSecret: string; topUpRequestId: number }> {
        if (!this.stripe || !env.STRIPE_ENABLED) {
            const { StripeFeatureDisabledError } = await import('../../shared/errors/app-error.js');
            throw new StripeFeatureDisabledError();
        }

        const { calculateCreditsFromUsd } = await import('../../lib/model-pricing.registry.js');
        const creditsToAdd = calculateCreditsFromUsd(amountUsd);

        // Ensure wallet exists
        const wallet = await this.prisma.userWallet.upsert({
            where: { userId },
            create: { userId, balanceCredits: 0, lifetimeAdded: 0, lifetimeUsed: 0 },
            update: {},
        });

        // Create TopUpRequest record first
        const topUpRequest = await this.prisma.topUpRequest.create({
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
        await this.prisma.topUpRequest.update({
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
     * Submit a cash (VND) top-up request.
     * Minimum amount: 100,000 VND.
     */
    async submitCashTopUp(
        userId: number,
        params: CashTopUpParams
    ): Promise<TopUpRequest> {
        const { amountVnd, proofImageKey, note } = params;

        if (amountVnd < 100_000) {
            throw new InvalidTopUpAmountError();
        }

        const wallet = await this.prisma.userWallet.upsert({
            where: { userId },
            create: { userId, balanceCredits: 0, lifetimeAdded: 0, lifetimeUsed: 0 },
            update: {},
        });

        const topUpRequest = await this.prisma.topUpRequest.create({
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
            '[TopUpRequestService] Cash top-up request submitted'
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
            this.prisma.topUpRequest.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                skip,
                take: pageSize,
            }),
            this.prisma.topUpRequest.count({ where: { userId } }),
        ]);

        return { items, total };
    }

    /**
     * Generate a presigned S3 PUT URL for uploading a proof-of-payment image.
     * Valid for 15 minutes.
     */
    async getUploadUrl(userId: number): Promise<{ uploadUrl: string; key: string }> {
        const key = `proof-images/${userId}/${Date.now()}-${randomUUID()}`;

        const command = new PutObjectCommand({
            Bucket: env.S3_BUCKET,
            Key: key,
            ContentType: 'image/*',
        });

        const uploadUrl = await getSignedUrl(this.s3, command, { expiresIn: 15 * 60 }); // 15 min

        return { uploadUrl, key };
    }

    /**
     * Find a TopUpRequest by its Stripe PaymentIntent ID.
     */
    async findByStripePaymentIntentId(id: string): Promise<TopUpRequest | null> {
        return this.prisma.topUpRequest.findUnique({
            where: { stripePaymentIntentId: id },
        });
    }

    /**
     * Mark a TopUpRequest as SUCCEEDED.
     */
    async markSucceeded(id: number, creditsAdded: number): Promise<void> {
        await this.prisma.topUpRequest.update({
            where: { id },
            data: {
                status: 'SUCCEEDED',
                creditsAdded,
            },
        });
    }

    /**
     * Mark a TopUpRequest as FAILED.
     */
    async markFailed(id: number): Promise<void> {
        await this.prisma.topUpRequest.update({
            where: { id },
            data: { status: 'FAILED' },
        });
    }
}
