import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReconciliationService } from './reconciliation.service.js';
import type { TopUpRequestService } from './topup-request.service.js';
import type { BillingService } from './billing.service.js';
import type Stripe from 'stripe';
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Unit tests for ReconciliationService
 * Validates: Requirements 3.2, 3.3
 */

function makeStripeEvent(type: string, paymentIntentId: string, metadata: Record<string, string> = {}): Stripe.Event {
    return {
        type,
        data: {
            object: {
                id: paymentIntentId,
                amount: 1000,
                metadata: {
                    userId: '42',
                    creditsToAdd: '1000',
                    topUpRequestId: '7',
                    ...metadata,
                },
            } as unknown as Stripe.PaymentIntent,
        },
    } as Stripe.Event;
}

function makeMockStripe(event: Stripe.Event) {
    return {
        webhooks: {
            constructEvent: vi.fn().mockReturnValue(event),
        },
    } as unknown as Stripe;
}

function makeMockTopUpRequestService(overrides: Partial<TopUpRequestService> = {}): TopUpRequestService {
    return {
        findByStripePaymentIntentId: vi.fn(),
        markSucceeded: vi.fn().mockResolvedValue(undefined),
        markFailed: vi.fn().mockResolvedValue(undefined),
        createStripeTopUp: vi.fn(),
        submitCashTopUp: vi.fn(),
        listUserTopUps: vi.fn(),
        getUploadUrl: vi.fn(),
        ...overrides,
    } as unknown as TopUpRequestService;
}

function makeMockBillingService(): BillingService {
    return {
        addCredits: vi.fn().mockResolvedValue({ id: 99 }),
        calculateCreditsFromUsd: vi.fn(),
    } as unknown as BillingService;
}

// Stub env for tests
vi.mock('../../config/env.js', () => ({
    env: {
        STRIPE_ENABLED: true,
        STRIPE_WEBHOOK_SECRET: 'test-secret',
        NODE_ENV: 'test',
    },
}));

describe('ReconciliationService — Idempotency', () => {
    it('calls billingService.addCredits only once when webhook is received twice for the same PaymentIntent', async () => {
        const paymentIntentId = 'pi_test_123';
        const event = makeStripeEvent('payment_intent.succeeded', paymentIntentId);
        const stripe = makeMockStripe(event);
        const billingService = makeMockBillingService();

        // First call: status is PENDING_APPROVAL → should process
        const topUpRequestService = makeMockTopUpRequestService({
            findByStripePaymentIntentId: vi.fn()
                .mockResolvedValueOnce({
                    id: 7,
                    status: 'PENDING_APPROVAL',
                    stripePaymentIntentId: paymentIntentId,
                })
                // Second call: status is already SUCCEEDED → should skip
                .mockResolvedValueOnce({
                    id: 7,
                    status: 'SUCCEEDED',
                    stripePaymentIntentId: paymentIntentId,
                }),
        });

        const service = new ReconciliationService(stripe, topUpRequestService, billingService);

        // First webhook call
        await service.handleStripeWebhook(Buffer.from('{}'), 'sig1');
        // Second webhook call (duplicate)
        await service.handleStripeWebhook(Buffer.from('{}'), 'sig2');

        // addCredits should only have been called once
        expect(billingService.addCredits).toHaveBeenCalledTimes(1);
        expect(topUpRequestService.markSucceeded).toHaveBeenCalledTimes(1);
    });

    it('does not call billingService.addCredits when TopUpRequest is already SUCCEEDED', async () => {
        const paymentIntentId = 'pi_already_done';
        const event = makeStripeEvent('payment_intent.succeeded', paymentIntentId);
        const stripe = makeMockStripe(event);
        const billingService = makeMockBillingService();

        const topUpRequestService = makeMockTopUpRequestService({
            findByStripePaymentIntentId: vi.fn().mockResolvedValue({
                id: 5,
                status: 'SUCCEEDED',
                stripePaymentIntentId: paymentIntentId,
            }),
        });

        const service = new ReconciliationService(stripe, topUpRequestService, billingService);
        await service.handleStripeWebhook(Buffer.from('{}'), 'sig');

        expect(billingService.addCredits).not.toHaveBeenCalled();
    });

    it('marks TopUpRequest as FAILED on payment_intent.payment_failed', async () => {
        const paymentIntentId = 'pi_failed_456';
        const event = makeStripeEvent('payment_intent.payment_failed', paymentIntentId);
        const stripe = makeMockStripe(event);
        const billingService = makeMockBillingService();

        const topUpRequestService = makeMockTopUpRequestService({
            findByStripePaymentIntentId: vi.fn().mockResolvedValue({
                id: 8,
                status: 'PENDING_APPROVAL',
                stripePaymentIntentId: paymentIntentId,
            }),
        });

        const service = new ReconciliationService(stripe, topUpRequestService, billingService);
        await service.handleStripeWebhook(Buffer.from('{}'), 'sig');

        expect(topUpRequestService.markFailed).toHaveBeenCalledWith(8);
        expect(billingService.addCredits).not.toHaveBeenCalled();
    });
});

describe('BillingService — Structural: no Stripe SDK import', () => {
    it('billing.service.ts does not import the Stripe SDK', () => {
        const filePath = resolve('src/domains/wallet/billing.service.ts');
        const content = readFileSync(filePath, 'utf-8');

        // The file must not import 'stripe' (case-insensitive check for the package name)
        expect(content).not.toMatch(/from ['"]stripe['"]/);
        expect(content).not.toMatch(/require\(['"]stripe['"]\)/);
    });
});
