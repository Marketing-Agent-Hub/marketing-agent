/**
 * Property-Based Tests: CashReviewService
 *
 * Feature: credit-wallet-system
 *
 * Property 7: Admin review state machine â€” only PENDING_APPROVAL is reviewable
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { Decimal } from '@prisma/client/runtime/library.js';

// â”€â”€â”€ Mocks â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

vi.mock('../../../db/index.js', () => ({
    prisma: {
        topUpRequest: {
            findUnique: vi.fn(),
            update: vi.fn(),
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
        S3_ENDPOINT: 'http://localhost:9000',
        S3_ACCESS_KEY: 'mock_key',
        S3_SECRET_KEY: 'mock_secret',
        S3_BUCKET: 'mock-bucket',
    },
}));

vi.mock('@aws-sdk/client-s3', () => ({
    S3Client: vi.fn().mockImplementation(() => ({})),
    GetObjectCommand: vi.fn(),
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
    getSignedUrl: vi.fn().mockResolvedValue('https://mock-s3-url.example.com/proof'),
}));

vi.mock('../../../domains/wallet/wallet.service.js', () => ({
    walletService: {
        getOrCreate: vi.fn(),
        addCredits: vi.fn(),
        deductCredits: vi.fn(),
    },
}));

import { prisma } from '../../../db/index.js';
import { walletService } from '../../../domains/wallet/wallet.service.js';
import {
    cashReviewService,
    TopUpRequestNotReviewableError,
} from '../../../domains/wallet/cash-review.service.js';

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type TopUpStatus = 'PENDING_APPROVAL' | 'SUCCEEDED' | 'FAILED' | 'REJECTED';

function makeTopUpRequest(status: TopUpStatus, overrides: Record<string, unknown> = {}) {
    return {
        id: 1,
        userId: 1,
        walletId: 1,
        method: 'CASH_VND',
        status,
        amountUsd: null,
        amountVnd: 500000,
        creditsAdded: null,
        stripePaymentIntentId: null,
        proofImageKey: 'proof-images/1/test.jpg',
        note: null,
        rejectionReason: null,
        reviewedAt: null,
        reviewedByUserId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
    };
}

// â”€â”€â”€ Tests â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe('CashReviewService â€” Property-Based Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    /**
     * Property 7: Admin review state machine â€” only PENDING_APPROVAL is reviewable
     *
     * For any TopUpRequest with status â‰  PENDING_APPROVAL, calling
     * CashReviewService.approve or CashReviewService.reject SHALL return an error
     * and SHALL NOT modify the wallet balance or create any WalletTransaction.
     *
     * Validates: Requirements 4.7
     */
    it('Property 7: approve() throws TopUpRequestNotReviewableError for non-PENDING_APPROVAL status', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.constantFrom('SUCCEEDED', 'FAILED', 'REJECTED') as fc.Arbitrary<TopUpStatus>,
                fc.integer({ min: 1, max: 10000 }),
                async (status, creditsToAdd) => {
                    vi.mocked(prisma.topUpRequest.findUnique).mockResolvedValue(
                        makeTopUpRequest(status) as any
                    );

                    await expect(
                        cashReviewService.approve(1, 99, creditsToAdd)
                    ).rejects.toThrow(TopUpRequestNotReviewableError);

                    // Wallet balance must NOT be modified
                    expect(walletService.addCredits).not.toHaveBeenCalled();
                    expect(walletService.deductCredits).not.toHaveBeenCalled();

                    // TopUpRequest must NOT be updated
                    expect(prisma.topUpRequest.update).not.toHaveBeenCalled();
                }
            ),
            { numRuns: 100 }
        );
    });

    it('Property 7: reject() throws TopUpRequestNotReviewableError for non-PENDING_APPROVAL status', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.constantFrom('SUCCEEDED', 'FAILED', 'REJECTED') as fc.Arbitrary<TopUpStatus>,
                fc.string({ minLength: 1, maxLength: 200 }),
                async (status, rejectionReason) => {
                    vi.mocked(prisma.topUpRequest.findUnique).mockResolvedValue(
                        makeTopUpRequest(status) as any
                    );

                    await expect(
                        cashReviewService.reject(1, 99, rejectionReason)
                    ).rejects.toThrow(TopUpRequestNotReviewableError);

                    // Wallet balance must NOT be modified
                    expect(walletService.addCredits).not.toHaveBeenCalled();
                    expect(walletService.deductCredits).not.toHaveBeenCalled();

                    // TopUpRequest must NOT be updated
                    expect(prisma.topUpRequest.update).not.toHaveBeenCalled();
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Property 7 (positive case): PENDING_APPROVAL requests CAN be approved
     */
    it('Property 7: approve() succeeds for PENDING_APPROVAL status', async () => {
        vi.mocked(prisma.topUpRequest.findUnique).mockResolvedValue(
            makeTopUpRequest('PENDING_APPROVAL') as any
        );
        vi.mocked(walletService.addCredits).mockResolvedValue({} as any);
        vi.mocked(prisma.topUpRequest.update).mockResolvedValue(
            makeTopUpRequest('SUCCEEDED') as any
        );

        await expect(cashReviewService.approve(1, 99, 500)).resolves.not.toThrow();
        expect(walletService.addCredits).toHaveBeenCalledTimes(1);
        expect(prisma.topUpRequest.update).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ status: 'SUCCEEDED' }),
            })
        );
    });

    /**
     * Property 7 (positive case): PENDING_APPROVAL requests CAN be rejected
     */
    it('Property 7: reject() succeeds for PENDING_APPROVAL status', async () => {
        vi.mocked(prisma.topUpRequest.findUnique).mockResolvedValue(
            makeTopUpRequest('PENDING_APPROVAL') as any
        );
        vi.mocked(prisma.topUpRequest.update).mockResolvedValue(
            makeTopUpRequest('REJECTED') as any
        );

        await expect(
            cashReviewService.reject(1, 99, 'Proof image unclear')
        ).resolves.not.toThrow();

        expect(walletService.addCredits).not.toHaveBeenCalled();
        expect(prisma.topUpRequest.update).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    status: 'REJECTED',
                    rejectionReason: 'Proof image unclear',
                }),
            })
        );
    });

    /**
     * Property 7 (error type): TopUpRequestNotReviewableError has correct statusCode
     */
    it('Property 7: TopUpRequestNotReviewableError has statusCode 409', async () => {
        vi.mocked(prisma.topUpRequest.findUnique).mockResolvedValue(
            makeTopUpRequest('SUCCEEDED') as any
        );

        try {
            await cashReviewService.approve(1, 99, 100);
            expect.fail('Should have thrown');
        } catch (err) {
            expect(err).toBeInstanceOf(TopUpRequestNotReviewableError);
            expect((err as TopUpRequestNotReviewableError).statusCode).toBe(409);
            expect((err as TopUpRequestNotReviewableError).code).toBe('NOT_REVIEWABLE');
        }
    });
});

