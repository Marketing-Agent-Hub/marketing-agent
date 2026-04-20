/**
 * Property-Based Tests: requireMinCredits Middleware
 *
 * Feature: credit-wallet-system
 *
 * Property 12: requireMinCredits middleware returns 402 when balance < minCredits
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { Decimal } from '@prisma/client/runtime/library.js';
import type { Request, Response, NextFunction } from 'express';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../../../domains/wallet/wallet.service.js', () => ({
    walletService: {
        getOrCreate: vi.fn(),
    },
}));

import { walletService } from '../../../domains/wallet/wallet.service.js';
import { requireMinCredits } from '../../../middleware/require-min-credits.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeWallet(balanceCredits: number) {
    return {
        id: 1,
        userId: 1,
        balanceCredits: new Decimal(balanceCredits),
        lifetimeAdded: new Decimal(100),
        lifetimeUsed: new Decimal(0),
        createdAt: new Date(),
        updatedAt: new Date(),
    };
}

function makeRequest(userId?: number): Partial<Request> {
    return {
        v2User: userId !== undefined ? ({ userId } as any) : undefined,
    };
}

function makeResponse(): { res: Partial<Response>; statusCode: number | null; body: unknown } {
    const ctx = { statusCode: null as number | null, body: null as unknown };
    const res: Partial<Response> = {
        status: vi.fn().mockImplementation((code: number) => {
            ctx.statusCode = code;
            return res;
        }),
        json: vi.fn().mockImplementation((data: unknown) => {
            ctx.body = data;
            return res;
        }),
    };
    return { res, statusCode: ctx.statusCode, body: ctx.body };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('requireMinCredits Middleware — Property-Based Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    /**
     * Property 12: requireMinCredits middleware returns 402 when balance < minCredits
     *
     * For any authenticated user with balanceCredits < minCredits, the
     * requireMinCredits(minCredits) middleware SHALL return HTTP 402 with
     * error.code = 'INSUFFICIENT_CREDITS' and SHALL NOT call next().
     *
     * Validates: Requirements 7.2
     */
    it('Property 12: returns 402 with INSUFFICIENT_CREDITS when balance < minCredits', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.integer({ min: 1, max: 10000 }),
                fc.float({ min: Math.fround(0), max: Math.fround(0.9999), noNaN: true }),
                async (minCredits, balanceFraction) => {
                    // balance is strictly less than minCredits
                    const balance = balanceFraction * minCredits;

                    vi.mocked(walletService.getOrCreate).mockResolvedValue(
                        makeWallet(balance) as any
                    );

                    const req = makeRequest(1);
                    const { res, statusCode } = makeResponse();
                    const next = vi.fn();

                    const middleware = requireMinCredits(minCredits);
                    await middleware(req as Request, res as Response, next as NextFunction);

                    // Must return 402
                    expect(res.status).toHaveBeenCalledWith(402);

                    // Must return INSUFFICIENT_CREDITS error code
                    expect(res.json).toHaveBeenCalledWith(
                        expect.objectContaining({
                            error: expect.objectContaining({
                                code: 'INSUFFICIENT_CREDITS',
                            }),
                        })
                    );

                    // Must NOT call next()
                    expect(next).not.toHaveBeenCalled();
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Property 12 (positive): next() is called when balance >= minCredits
     */
    it('Property 12: calls next() when balance >= minCredits', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.integer({ min: 1, max: 1000 }),
                fc.float({ min: 1, max: 2, noNaN: true }),
                async (minCredits, multiplier) => {
                    // balance is >= minCredits
                    const balance = minCredits * multiplier;

                    vi.mocked(walletService.getOrCreate).mockResolvedValue(
                        makeWallet(balance) as any
                    );

                    const req = makeRequest(1);
                    const { res } = makeResponse();
                    const next = vi.fn();

                    const middleware = requireMinCredits(minCredits);
                    await middleware(req as Request, res as Response, next as NextFunction);

                    // Must call next()
                    expect(next).toHaveBeenCalledTimes(1);

                    // Must NOT return 402
                    expect(res.status).not.toHaveBeenCalledWith(402);
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Property 12 (boundary): balance exactly equal to minCredits passes
     */
    it('Property 12: balance exactly equal to minCredits calls next()', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.integer({ min: 1, max: 10000 }),
                async (minCredits) => {
                    vi.mocked(walletService.getOrCreate).mockResolvedValue(
                        makeWallet(minCredits) as any
                    );

                    const req = makeRequest(1);
                    const { res } = makeResponse();
                    const next = vi.fn();

                    const middleware = requireMinCredits(minCredits);
                    await middleware(req as Request, res as Response, next as NextFunction);

                    expect(next).toHaveBeenCalledTimes(1);
                    expect(res.status).not.toHaveBeenCalledWith(402);
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Property 12 (no auth): next() is called when userId is missing (auth middleware handles it)
     */
    it('Property 12: calls next() when userId is not present (unauthenticated)', async () => {
        const req = makeRequest(undefined);
        const { res } = makeResponse();
        const next = vi.fn();

        const middleware = requireMinCredits(1);
        await middleware(req as Request, res as Response, next as NextFunction);

        expect(next).toHaveBeenCalledTimes(1);
        expect(walletService.getOrCreate).not.toHaveBeenCalled();
    });

    /**
     * Property 12 (default minCredits = 1): balance = 0 returns 402
     */
    it('Property 12: default minCredits=1 — balance=0 returns 402', async () => {
        vi.mocked(walletService.getOrCreate).mockResolvedValue(makeWallet(0) as any);

        const req = makeRequest(1);
        const { res } = makeResponse();
        const next = vi.fn();

        const middleware = requireMinCredits(); // default minCredits = 1
        await middleware(req as Request, res as Response, next as NextFunction);

        expect(res.status).toHaveBeenCalledWith(402);
        expect(next).not.toHaveBeenCalled();
    });

    /**
     * Property 12 (default minCredits = 1): balance = 1 calls next()
     */
    it('Property 12: default minCredits=1 — balance=1 calls next()', async () => {
        vi.mocked(walletService.getOrCreate).mockResolvedValue(makeWallet(1) as any);

        const req = makeRequest(1);
        const { res } = makeResponse();
        const next = vi.fn();

        const middleware = requireMinCredits(); // default minCredits = 1
        await middleware(req as Request, res as Response, next as NextFunction);

        expect(next).toHaveBeenCalledTimes(1);
        expect(res.status).not.toHaveBeenCalledWith(402);
    });
});
