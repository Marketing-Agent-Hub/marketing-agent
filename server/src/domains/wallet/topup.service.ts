/**
 * Backward-compatibility shim for TopUpService.
 *
 * The original TopUpService god-class has been split into 3 focused use-case services:
 *   - TopUpRequestService  (topup-request.service.ts)
 *   - BillingService       (billing.service.ts)
 *   - ReconciliationService (reconciliation.service.ts)
 *
 * This file instantiates all 3 services and re-exports a `topUpService` object
 * with the same public interface as the original, so existing callers continue to work.
 */

import Stripe from 'stripe';
import { S3Client } from '@aws-sdk/client-s3';
import { prisma } from '../../db/index.js';
import { env } from '../../config/env.js';
import { walletService } from './wallet.service.js';
import { TopUpRequestService } from './topup-request.service.js';
import { BillingService } from './billing.service.js';
import { ReconciliationService } from './reconciliation.service.js';

// Re-export error classes from shared kernel
export { InvalidTopUpAmountError, StripeFeatureDisabledError } from '../../shared/errors/app-error.js';

// ─── Instantiate infrastructure clients ──────────────────────────────────────

const stripeClient: Stripe | null =
    env.STRIPE_ENABLED && env.STRIPE_SECRET_KEY
        ? new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2026-03-25.dahlia' })
        : null;

const s3Client = new S3Client({
    region: 'us-east-1',
    endpoint: env.S3_ENDPOINT,
    forcePathStyle: env.NODE_ENV !== 'production',
    credentials: {
        accessKeyId: env.S3_ACCESS_KEY,
        secretAccessKey: env.S3_SECRET_KEY,
    },
});

// ─── Instantiate use-case services ───────────────────────────────────────────

export const topUpRequestService = new TopUpRequestService(prisma, stripeClient, s3Client);

export const billingService = new BillingService(walletService);

export const reconciliationService = stripeClient
    ? new ReconciliationService(stripeClient, topUpRequestService, billingService)
    : null;

// ─── Backward-compatible `topUpService` facade ───────────────────────────────

/**
 * Facade that delegates to the 3 use-case services.
 * Maintains the same public interface as the original TopUpService.
 */
export const topUpService = {
    createStripeTopUp: topUpRequestService.createStripeTopUp.bind(topUpRequestService),
    submitCashTopUp: topUpRequestService.submitCashTopUp.bind(topUpRequestService),
    listUserTopUps: topUpRequestService.listUserTopUps.bind(topUpRequestService),
    getUploadUrl: topUpRequestService.getUploadUrl.bind(topUpRequestService),

    handleStripeWebhook: async (rawBody: Buffer, signature: string): Promise<void> => {
        if (!reconciliationService) {
            const { StripeFeatureDisabledError } = await import('../../shared/errors/app-error.js');
            throw new StripeFeatureDisabledError();
        }
        return reconciliationService.handleStripeWebhook(rawBody, signature);
    },
};
