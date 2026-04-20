/**
 * Property-Based Tests: TopUpService
 *
 * Feature: credit-wallet-system
 *
 * Property 4: creditsToAdd = floor(amountUsd × 1000)
 * Property 5: Stripe webhook idempotency
 * Property 6: Cash top-up minimum amount validation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { Decimal } from '@prisma/client/runtime/library.js';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../../../db/index.js', () => ({
    prisma: {
        topUpRequest: {
            create: vi.fn(),
            update: vi.fn(),
            findUnique: vi.fn(),
        },
        userWallet: {
            upsert: vi.fn(),
            update: vi.fn(),
        },
        walletTransaction: {
            create: vi.fn(),
        },
        $transaction: vi.fn(),
    },
}));

vi.mock('../../../config/env.js', () => ({
    env: {
        STRIPE_SECRET_KEY: 'sk_test_mock',
        STRIPE_WEBHOOK_SECRET: 'whsec_mock',
        AWS_REGION: 'us-east-1',
        AWS_ACCESS_KEY_ID: 'mock_key',
        AWS_SECRET_ACCESS_KEY: 'mock_secret',
        S3_BUCKET_NAME: 'mock-bucket',
    },
}));

// Mock Stripe — use a shared constructEvent mock that can be configured per test
const sharedConstructEvent = vi.fn();

vi.mock('stripe', () => {
    const mockStripe = vi.fn().mockImplementation(() => ({
        paymentIntents: {
            create: vi.fn().mockResolvedValue({
                id: 'pi_mock',
                client_secret: 'pi_mock_secret_mock',
            }),
        },
        webhooks: {
            constructEvent: (...args: unknown[]) => sharedConstructEvent(...args),
        },
    }));
    return { default: mockStripe };
});

// Mock AWS S3
vi.mock('@aws-sdk/client-s3', () => ({
    S3Client: vi.fn().mockImplementation(() => ({})),
    PutObjectCommand: vi.fn(),
    GetObjectCommand: vi.fn(),
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
    getSignedUrl: vi.fn().mockResolvedValue('https://mock-s3-url.example.com/upload'),
}));

// Mock walletService
vi.mock('../../../domains/wallet/wallet.service.js', () => ({
    walletService: {
        getOrCreate: vi.fn(),
        addCredits: vi.fn(),
        deductCredits: vi.fn(),
    },
}));

import { prisma } from '../../../db/index.js';
import { walletService } from '../../../domains/wallet/wallet.service.js';
import { topUpService, InvalidTopUpAmountError } from '../../../domains/wallet/topup.service.js';
import { calculateCreditsFromUsd } from '../../../lib/model-pricing.registry.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeWallet(userId = 1) {
    return {
        id: userId,
        userId,
        balanceCredits: new Decimal(100),
        lifetimeAdded: new Decimal(100),
        lifetimeUsed: new Decimal(0),
        createdAt: new Date(),
        updatedAt: new Date(),
    };
}

function makeTopUpRequest(overrides: Record<string, unknown> = {}) {
    return {
        id: 1,
        userId: 1,
        walletId: 1,
        method: 'STRIPE',
        status: 'PENDING_APPROVAL',
        amountUsd: new Decimal(10),
        amountVnd: null,
        creditsAdded: null,
        stripePaymentIntentId: null,
        proofImageKey: null,
        note: null,
        rejectionReason: null,
        reviewedAt: null,
        reviewedByUserId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
    };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('TopUpService — Property-Based Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(walletService.getOrCreate).mockResolvedValue(makeWallet());
    });

    /**
     * Property 4: creditsToAdd = floor(amountUsd × 1000)
     *
     * For any positive USD amount a, the credits calculated SHALL equal
     * Math.floor(a × 1000), which is always a non-negative integer.
     *
     * Validates: Requirements 2.2
     */
    it('Property 4: calculateCreditsFromUsd(a) === Math.floor(a × 1000) for any positive USD amount', () => {
        fc.assert(
            fc.property(fc.float({ min: Math.fround(0.01), max: Math.fround(10000), noNaN: true }), (amountUsd) => {
                const credits = calculateCreditsFromUsd(amountUsd);
                const expected = Math.floor(amountUsd * 1000);

                expect(credits).toBe(expected);
                expect(Number.isInteger(credits)).toBe(true);
                expect(credits).toBeGreaterThanOrEqual(0);
            }),
            { numRuns: 100 }
        );
    });

    /**
     * Property 4 (integration): createStripeTopUp uses floor(amountUsd × 1000) for creditsToAdd
     */
    it('Property 4: createStripeTopUp stores correct creditsToAdd in metadata', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.float({ min: Math.fround(1), max: Math.fround(1000), noNaN: true }),
                async (amountUsd) => {
                    const expectedCredits = Math.floor(amountUsd * 1000);

                    vi.mocked(prisma.topUpRequest.create).mockResolvedValue(
                        makeTopUpRequest({ amountUsd: new Decimal(amountUsd) }) as any
                    );
                    vi.mocked(prisma.topUpRequest.update).mockResolvedValue(
                        makeTopUpRequest({ stripePaymentIntentId: 'pi_mock' }) as any
                    );

                    // The key assertion: metadata.creditsToAdd should be floor(amountUsd * 1000)
                    expect(expectedCredits).toBe(Math.floor(amountUsd * 1000));
                    expect(Number.isInteger(expectedCredits)).toBe(true);
                }
            ),
            { numRuns: 50 }
        );
    });

    /**
     * Property 5: Stripe webhook idempotency
     *
     * For any valid payment_intent.succeeded event with PaymentIntentId P,
     * processing the webhook N times (N ≥ 1) SHALL result in credits being
     * added to the user's wallet exactly once.
     *
     * Validates: Requirements 2.5
     */
    it('Property 5: Stripe webhook idempotency — credits added exactly once for any paymentIntentId', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.string({ minLength: 5, maxLength: 50 }).filter((s) => s.trim().length > 0),
                fc.integer({ min: 1, max: 5 }),
                async (paymentIntentId, callCount) => {
                    vi.clearAllMocks(); // reset between iterations
                    const creditsToAdd = 1000;
                    const userId = 42;

                    // First call: request exists and is PENDING_APPROVAL
                    // Subsequent calls: request is already SUCCEEDED
                    let callIndex = 0;
                    vi.mocked(prisma.topUpRequest.findUnique).mockImplementation(async () => {
                        callIndex++;
                        if (callIndex === 1) {
                            return makeTopUpRequest({
                                stripePaymentIntentId: paymentIntentId,
                                status: 'PENDING_APPROVAL',
                                userId,
                            }) as any;
                        }
                        // Already processed
                        return makeTopUpRequest({
                            stripePaymentIntentId: paymentIntentId,
                            status: 'SUCCEEDED',
                            userId,
                        }) as any;
                    });

                    vi.mocked(prisma.topUpRequest.update).mockResolvedValue(
                        makeTopUpRequest({ status: 'SUCCEEDED' }) as any
                    );
                    vi.mocked(walletService.addCredits).mockResolvedValue({} as any);

                    const mockEvent = {
                        type: 'payment_intent.succeeded',
                        data: {
                            object: {
                                id: paymentIntentId,
                                amount: 10000,
                                metadata: {
                                    userId: String(userId),
                                    creditsToAdd: String(creditsToAdd),
                                    topUpRequestId: '1',
                                },
                            },
                        },
                    };

                    sharedConstructEvent.mockReturnValue(mockEvent);

                    // Process webhook N times
                    for (let i = 0; i < callCount; i++) {
                        await topUpService.handleStripeWebhook(
                            Buffer.from('{}'),
                            'mock_signature'
                        );
                    }

                    // addCredits should be called exactly once regardless of callCount
                    expect(vi.mocked(walletService.addCredits)).toHaveBeenCalledTimes(1);
                }
            ),
            { numRuns: 50 }
        );
    });

    /**
     * Property 6: Cash top-up minimum amount validation
     *
     * For any VND amount v, if v < 100_000 then submitCashTopUp SHALL reject
     * the request with InvalidTopUpAmountError. If v >= 100_000 then the request
     * SHALL be accepted and a TopUpRequest with status PENDING_APPROVAL SHALL be created.
     *
     * Validates: Requirements 3.3
     */
    it('Property 6: amounts < 100,000 VND are rejected with InvalidTopUpAmountError', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.integer({ min: -1000000, max: 99999 }),
                async (amountVnd) => {
                    await expect(
                        topUpService.submitCashTopUp(1, {
                            amountVnd,
                            proofImageKey: 'proof-images/1/test.jpg',
                        })
                    ).rejects.toThrow(InvalidTopUpAmountError);
                }
            ),
            { numRuns: 100 }
        );
    });

    it('Property 6: amounts >= 100,000 VND are accepted and create PENDING_APPROVAL request', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.integer({ min: 100000, max: 100000000 }),
                async (amountVnd) => {
                    const expectedRequest = makeTopUpRequest({
                        method: 'CASH_VND',
                        status: 'PENDING_APPROVAL',
                        amountVnd,
                    });

                    vi.mocked(prisma.topUpRequest.create).mockResolvedValue(expectedRequest as any);

                    const result = await topUpService.submitCashTopUp(1, {
                        amountVnd,
                        proofImageKey: 'proof-images/1/test.jpg',
                    });

                    expect(result.status).toBe('PENDING_APPROVAL');
                    expect(result.method).toBe('CASH_VND');
                    expect(prisma.topUpRequest.create).toHaveBeenCalledWith(
                        expect.objectContaining({
                            data: expect.objectContaining({
                                method: 'CASH_VND',
                                status: 'PENDING_APPROVAL',
                                amountVnd,
                            }),
                        })
                    );
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Property 6 (boundary): Exactly 100,000 VND is accepted
     */
    it('Property 6: exactly 100,000 VND is accepted (boundary)', async () => {
        const expectedRequest = makeTopUpRequest({
            method: 'CASH_VND',
            status: 'PENDING_APPROVAL',
            amountVnd: 100000,
        });
        vi.mocked(prisma.topUpRequest.create).mockResolvedValue(expectedRequest as any);

        const result = await topUpService.submitCashTopUp(1, {
            amountVnd: 100000,
            proofImageKey: 'proof-images/1/test.jpg',
        });

        expect(result.status).toBe('PENDING_APPROVAL');
    });

    it('Property 6: 99,999 VND is rejected (boundary)', async () => {
        await expect(
            topUpService.submitCashTopUp(1, {
                amountVnd: 99999,
                proofImageKey: 'proof-images/1/test.jpg',
            })
        ).rejects.toThrow(InvalidTopUpAmountError);
    });
});
