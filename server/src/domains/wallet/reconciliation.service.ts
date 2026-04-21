import Stripe from 'stripe';
import { logger } from '../../lib/logger.js';
import { env } from '../../config/env.js';
import { StripeFeatureDisabledError } from '../../shared/errors/app-error.js';
import type { TopUpRequestService } from './topup-request.service.js';
import type { BillingService } from './billing.service.js';

export class ReconciliationService {
    constructor(
        private readonly stripe: Stripe,
        private readonly topUpRequestService: TopUpRequestService,
        private readonly billingService: BillingService,
    ) { }

    /**
     * Handle Stripe webhook events.
     * Verifies signature and processes payment_intent.succeeded / payment_intent.payment_failed.
     * Idempotent: duplicate webhooks for the same PaymentIntent are safely ignored.
     */
    async handleStripeWebhook(rawBody: Buffer, signature: string): Promise<void> {
        if (!env.STRIPE_ENABLED || !env.STRIPE_WEBHOOK_SECRET) {
            throw new StripeFeatureDisabledError();
        }

        let event: Stripe.Event;

        try {
            event = this.stripe.webhooks.constructEvent(
                rawBody,
                signature,
                env.STRIPE_WEBHOOK_SECRET
            );
        } catch (err) {
            logger.warn({ err }, '[ReconciliationService] Stripe webhook signature verification failed');
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

        // Idempotency check: find TopUpRequest by stripePaymentIntentId
        const existing = await this.topUpRequestService.findByStripePaymentIntentId(stripePaymentIntentId);

        if (!existing) {
            logger.warn(
                { stripePaymentIntentId },
                '[ReconciliationService] No TopUpRequest found for PaymentIntent'
            );
            return;
        }

        // Skip if already SUCCEEDED (idempotency)
        if (existing.status === 'SUCCEEDED') {
            logger.info(
                { stripePaymentIntentId, topUpRequestId: existing.id },
                '[ReconciliationService] Webhook already processed (idempotent), skipping'
            );
            return;
        }

        const creditsToAdd = Number(metadata.creditsToAdd);
        const userId = Number(metadata.userId);

        // Add credits to wallet via BillingService (only after idempotency check passes)
        const transaction = await this.billingService.addCredits({
            userId,
            credits: creditsToAdd,
            type: 'TOPUP',
            description: `Stripe top-up: ${(paymentIntent.amount / 100).toFixed(2)} USD`,
            topUpRequestId: existing.id,
        });

        // Mark TopUpRequest as SUCCEEDED
        await this.topUpRequestService.markSucceeded(existing.id, creditsToAdd);

        logger.info(
            { userId, creditsToAdd, transactionId: (transaction as { id?: number })?.id, topUpRequestId: existing.id },
            '[ReconciliationService] Stripe payment succeeded, credits added'
        );
    }

    private async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
        const { id: stripePaymentIntentId } = paymentIntent;

        const existing = await this.topUpRequestService.findByStripePaymentIntentId(stripePaymentIntentId);

        if (!existing) {
            logger.warn(
                { stripePaymentIntentId },
                '[ReconciliationService] No TopUpRequest found for failed PaymentIntent'
            );
            return;
        }

        await this.topUpRequestService.markFailed(existing.id);

        logger.info(
            { stripePaymentIntentId, topUpRequestId: existing.id },
            '[ReconciliationService] Stripe payment failed, TopUpRequest marked FAILED'
        );
    }
}
