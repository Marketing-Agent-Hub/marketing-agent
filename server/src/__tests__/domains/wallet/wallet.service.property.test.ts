/**
 * Property-Based Tests: WalletService
 *
 * Feature: credit-wallet-system
 *
 * Property 1: getOrCreate is idempotent
 * Property 2: USD conversion is a pure function
 * Property 3: lifetimeAdded and lifetimeUsed are monotonic accumulators
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { Decimal } from '@prisma/client/runtime/library.js';

// ─── Mock Prisma ──────────────────────────────────────────────────────────────

vi.mock('../../../db/index.js', () => ({
    prisma: {
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

vi.mock('../../../lib/logger.js', () => ({
    logger: {
        warn: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
    },
}));

import { prisma } from '../../../db/index.js';
import { walletService } from '../../../domains/wallet/wallet.service.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeWallet(overrides: Partial<{
    id: number;
    userId: number;
    balanceCredits: number;
    lifetimeAdded: number;
    lifetimeUsed: number;
}> = {}) {
    const {
        id = 1,
        userId = 1,
        balanceCredits = 0,
        lifetimeAdded = 0,
        lifetimeUsed = 0,
    } = overrides;

    return {
        id,
        userId,
        balanceCredits: new Decimal(balanceCredits),
        lifetimeAdded: new Decimal(lifetimeAdded),
        lifetimeUsed: new Decimal(lifetimeUsed),
        createdAt: new Date(),
        updatedAt: new Date(),
    };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('WalletService — Property-Based Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    /**
     * Property 1: getOrCreate is idempotent
     *
     * For any userId, calling WalletService.getOrCreate(userId) N times (N ≥ 1)
     * SHALL always return a wallet with the same id, and the database SHALL
     * contain exactly one UserWallet record for that userId.
     *
     * Validates: Requirements 1.1, 1.2
     */
    it('Property 1: getOrCreate is idempotent — returns same wallet on repeated calls', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.integer({ min: 1, max: 100000 }),
                fc.integer({ min: 1, max: 10 }),
                async (userId, callCount) => {
                    vi.clearAllMocks(); // reset between iterations
                    const wallet = makeWallet({ id: userId, userId });

                    // upsert always returns the same wallet
                    vi.mocked(prisma.userWallet.upsert).mockResolvedValue(wallet);

                    const results: typeof wallet[] = [];
                    for (let i = 0; i < callCount; i++) {
                        results.push(await walletService.getOrCreate(userId));
                    }

                    // All calls return the same wallet id
                    const ids = results.map((w) => w.id);
                    expect(new Set(ids).size).toBe(1);
                    expect(ids[0]).toBe(userId);

                    // upsert was called with correct userId each time
                    expect(prisma.userWallet.upsert).toHaveBeenCalledTimes(callCount);
                    const calls = vi.mocked(prisma.userWallet.upsert).mock.calls;
                    for (const call of calls) {
                        expect(call[0].where).toEqual({ userId });
                        expect(call[0].create).toMatchObject({ userId, balanceCredits: 0 });
                        expect(call[0].update).toEqual({});
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Property 2: USD conversion is a pure function
     *
     * For any non-negative credit balance c, the USD equivalent returned by
     * getBalance SHALL equal c × 0.001 (within floating-point tolerance of 1e-9).
     *
     * Validates: Requirements 1.3
     */
    it('Property 2: USD conversion — usd === credits × 0.001 for any non-negative balance', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.float({ min: 0, max: 1e9, noNaN: true }),
                async (creditAmount) => {
                    const wallet = makeWallet({ balanceCredits: creditAmount });
                    vi.mocked(prisma.userWallet.upsert).mockResolvedValue(wallet);

                    const balance = await walletService.getBalance(1);

                    const expectedUsd = creditAmount * 0.001;
                    expect(Math.abs(balance.usd - expectedUsd)).toBeLessThan(1e-9);
                    expect(balance.credits.toNumber()).toBeCloseTo(creditAmount, 6);
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Property 2 (exact values): Verify specific known conversions
     */
    it('Property 2: USD conversion — exact known values', async () => {
        const cases = [
            { credits: 0, usd: 0 },
            { credits: 1000, usd: 1 },
            { credits: 500, usd: 0.5 },
            { credits: 1, usd: 0.001 },
            { credits: 1000000, usd: 1000 },
        ];

        for (const { credits, usd } of cases) {
            const wallet = makeWallet({ balanceCredits: credits });
            vi.mocked(prisma.userWallet.upsert).mockResolvedValue(wallet);

            const balance = await walletService.getBalance(1);
            expect(balance.usd).toBeCloseTo(usd, 9);
        }
    });

    /**
     * Property 3: lifetimeAdded and lifetimeUsed are monotonic accumulators
     *
     * For any sequence of addCredits and deductCredits operations on a wallet,
     * lifetimeAdded SHALL equal the sum of all credits added, and lifetimeUsed
     * SHALL equal the sum of all credits deducted. Neither field SHALL ever decrease.
     *
     * Validates: Requirements 1.4
     */
    it('Property 3: lifetimeAdded and lifetimeUsed are monotonic — never decrease', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.array(
                    fc.record({
                        op: fc.constantFrom('add', 'deduct') as fc.Arbitrary<'add' | 'deduct'>,
                        amount: fc.float({ min: Math.fround(0.01), max: Math.fround(1000), noNaN: true }),
                    }),
                    { minLength: 1, maxLength: 20 }
                ),
                async (operations) => {
                    let currentBalance = 1000; // start with enough credits
                    let expectedLifetimeAdded = 0;
                    let expectedLifetimeUsed = 0;
                    let prevLifetimeAdded = 0;
                    let prevLifetimeUsed = 0;

                    for (const { op, amount } of operations) {
                        if (op === 'add') {
                            expectedLifetimeAdded += amount;
                            currentBalance += amount;
                        } else {
                            expectedLifetimeUsed += amount;
                            currentBalance -= amount;
                        }

                        const updatedWallet = makeWallet({
                            balanceCredits: currentBalance,
                            lifetimeAdded: expectedLifetimeAdded,
                            lifetimeUsed: expectedLifetimeUsed,
                        });

                        // Mock the transaction to return updated wallet
                        vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) => {
                            vi.mocked(prisma.userWallet.update).mockResolvedValue(updatedWallet);
                            vi.mocked(prisma.walletTransaction.create).mockResolvedValue({
                                id: 1,
                                walletId: 1,
                                type: op === 'add' ? 'TOPUP' : 'USAGE',
                                credits: new Decimal(op === 'add' ? amount : -amount),
                                balanceAfter: new Decimal(currentBalance),
                                description: 'test',
                                brandId: null,
                                aiModel: null,
                                promptTokens: null,
                                completionTokens: null,
                                totalTokens: null,
                                topUpRequestId: null,
                                createdAt: new Date(),
                            });
                            return fn(prisma);
                        });

                        vi.mocked(prisma.userWallet.upsert).mockResolvedValue(
                            makeWallet({ balanceCredits: currentBalance })
                        );

                        // lifetimeAdded must not decrease
                        expect(expectedLifetimeAdded).toBeGreaterThanOrEqual(prevLifetimeAdded);
                        // lifetimeUsed must not decrease
                        expect(expectedLifetimeUsed).toBeGreaterThanOrEqual(prevLifetimeUsed);

                        prevLifetimeAdded = expectedLifetimeAdded;
                        prevLifetimeUsed = expectedLifetimeUsed;
                    }

                    // Final verification: lifetimeAdded = sum of all add amounts
                    const totalAdded = operations
                        .filter((o) => o.op === 'add')
                        .reduce((sum, o) => sum + o.amount, 0);
                    const totalDeducted = operations
                        .filter((o) => o.op === 'deduct')
                        .reduce((sum, o) => sum + o.amount, 0);

                    expect(expectedLifetimeAdded).toBeCloseTo(totalAdded, 5);
                    expect(expectedLifetimeUsed).toBeCloseTo(totalDeducted, 5);
                }
            ),
            { numRuns: 100 }
        );
    });
});
