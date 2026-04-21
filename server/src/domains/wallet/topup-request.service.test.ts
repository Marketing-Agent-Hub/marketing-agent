// Feature: server-architecture-refactor, Property 4: For any integer amountVnd in [0, 99_999], submitCashTopUp() SHALL throw InvalidTopUpAmountError; for any amountVnd >= 100_000, SHALL not throw
import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';
import { TopUpRequestService } from './topup-request.service.js';
import { InvalidTopUpAmountError } from '../../shared/errors/app-error.js';
import type { PrismaClient } from '@prisma/client';
import type { S3Client } from '@aws-sdk/client-s3';

/**
 * Validates: Requirements 3.5
 *
 * Property 4: TopUpRequestService — Invalid Amount Rejection
 * For any integer amountVnd in [0, 99_999], submitCashTopUp() SHALL throw InvalidTopUpAmountError.
 * For any amountVnd >= 100_000, submitCashTopUp() SHALL not throw InvalidTopUpAmountError.
 */

function makeMockPrisma() {
    return {
        userWallet: {
            upsert: vi.fn().mockResolvedValue({ id: 1, userId: 1 }),
        },
        topUpRequest: {
            create: vi.fn().mockResolvedValue({
                id: 1,
                userId: 1,
                walletId: 1,
                method: 'CASH_VND',
                status: 'PENDING_APPROVAL',
                amountVnd: 100_000,
                proofImageKey: 'test-key',
                note: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            }),
        },
    } as unknown as PrismaClient;
}

function makeMockS3() {
    return {} as unknown as S3Client;
}

describe('TopUpRequestService — Property 4: Invalid Amount Rejection', () => {
    let prisma: PrismaClient;
    let service: TopUpRequestService;

    beforeEach(() => {
        prisma = makeMockPrisma();
        service = new TopUpRequestService(prisma, null, makeMockS3());
    });

    it('throws InvalidTopUpAmountError for any amountVnd in [0, 99_999]', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.integer({ min: 0, max: 99_999 }),
                async (amountVnd) => {
                    await expect(
                        service.submitCashTopUp(1, {
                            amountVnd,
                            proofImageKey: 'some-key',
                        })
                    ).rejects.toThrow(InvalidTopUpAmountError);
                }
            ),
            { numRuns: 100 }
        );
    });

    it('does NOT throw InvalidTopUpAmountError for any amountVnd >= 100_000', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.integer({ min: 100_000, max: 10_000_000 }),
                async (amountVnd) => {
                    // Reset mock for each run
                    (prisma.topUpRequest.create as ReturnType<typeof vi.fn>).mockResolvedValue({
                        id: 1,
                        userId: 1,
                        walletId: 1,
                        method: 'CASH_VND',
                        status: 'PENDING_APPROVAL',
                        amountVnd,
                        proofImageKey: 'test-key',
                        note: null,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    });

                    await expect(
                        service.submitCashTopUp(1, {
                            amountVnd,
                            proofImageKey: 'some-key',
                        })
                    ).resolves.not.toThrow();
                }
            ),
            { numRuns: 100 }
        );
    });
});
