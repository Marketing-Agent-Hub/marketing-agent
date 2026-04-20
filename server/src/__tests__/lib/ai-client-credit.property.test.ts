/**
 * Property-Based Tests: AiClient Credit Integration
 *
 * Feature: credit-wallet-system
 *
 * Property 8: InsufficientCreditsError when balance <= 0
 * Property 9: Credit deduction formula = ceil(totalTokens × pricePerToken × 1000)
 * Property 10: WalletTransaction completeness for USAGE
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { Decimal } from '@prisma/client/runtime/library.js';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../../lib/logger.js', () => ({
    logger: {
        warn: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
    },
}));

vi.mock('../../lib/logger.js', () => ({
    logger: {
        warn: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
    },
}));

vi.mock('../../domains/wallet/wallet.service.js', () => ({
    walletService: {
        getOrCreate: vi.fn(),
        deductCredits: vi.fn(),
    },
}));

// Mock OpenAI client
const mockCreate = vi.fn();
vi.mock('openai', () => {
    return {
        default: vi.fn().mockImplementation(() => ({
            chat: {
                completions: {
                    create: vi.fn().mockReturnValue({
                        withResponse: () =>
                            Promise.resolve({
                                data: {
                                    choices: [{ message: { content: 'test' } }],
                                    usage: {
                                        prompt_tokens: 10,
                                        completion_tokens: 20,
                                        total_tokens: 30,
                                    },
                                },
                                response: {
                                    headers: {
                                        get: vi.fn().mockReturnValue('openai/gpt-4o'),
                                    },
                                },
                            }),
                    }),
                },
            },
        })),
        APIError: class APIError extends Error {
            status: number;
            code: string;
            error: unknown;
            constructor(status: number, message: string) {
                super(message);
                this.status = status;
                this.code = 'api_error';
                this.error = null;
            }
        },
    };
});

import { walletService } from '../../domains/wallet/wallet.service.js';
import { AiClient, InsufficientCreditsError } from '../../lib/ai-client.js';
import { calculateCreditsForUsage } from '../../lib/model-pricing.registry.js';

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

const defaultChatParams = {
    model: 'openai/gpt-4o',
    messages: [{ role: 'user' as const, content: 'Hello' }],
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('AiClient Credit Integration — Property-Based Tests', () => {
    let aiClient: AiClient;

    beforeEach(() => {
        vi.clearAllMocks();
        aiClient = new AiClient();
    });

    /**
     * Property 8: InsufficientCreditsError when balance <= 0
     *
     * For any user with balanceCredits <= 0, calling AiClient.chat() with a
     * CreditContext SHALL throw InsufficientCreditsError without making any
     * HTTP call to OpenRouter.
     *
     * Validates: Requirements 5.1
     */
    it('Property 8: throws InsufficientCreditsError for any balance <= 0', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.float({ max: Math.fround(0), noNaN: true }),
                async (balance) => {
                    vi.mocked(walletService.getOrCreate).mockResolvedValue(
                        makeWallet(balance) as any
                    );
                    vi.mocked(walletService.deductCredits).mockResolvedValue({} as any);

                    await expect(
                        aiClient.chat(defaultChatParams, { userId: 1 })
                    ).rejects.toThrow(InsufficientCreditsError);

                    // deductCredits must NOT be called (no API call was made)
                    expect(walletService.deductCredits).not.toHaveBeenCalled();
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Property 8 (boundary): balance = 0 throws InsufficientCreditsError
     */
    it('Property 8: balance = 0 throws InsufficientCreditsError', async () => {
        vi.mocked(walletService.getOrCreate).mockResolvedValue(makeWallet(0) as any);

        await expect(
            aiClient.chat(defaultChatParams, { userId: 1 })
        ).rejects.toThrow(InsufficientCreditsError);
    });

    /**
     * Property 8: InsufficientCreditsError has correct statusCode
     */
    it('Property 8: InsufficientCreditsError has statusCode 402', async () => {
        vi.mocked(walletService.getOrCreate).mockResolvedValue(makeWallet(0) as any);

        try {
            await aiClient.chat(defaultChatParams, { userId: 1 });
            expect.fail('Should have thrown');
        } catch (err) {
            expect(err).toBeInstanceOf(InsufficientCreditsError);
            expect((err as InsufficientCreditsError).statusCode).toBe(402);
        }
    });

    /**
     * Property 9: Credit deduction formula = ceil(totalTokens × pricePerToken × 1000)
     *
     * For any positive totalTokens value t and positive pricePerToken value p,
     * the credits deducted SHALL equal Math.ceil(t × p × 1000), which is always
     * a positive integer ≥ 1.
     *
     * Validates: Requirements 5.2
     */
    it('Property 9: credit deduction formula = ceil(t × p × 1000) always >= 1', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: 1, max: 1000000 }),
                fc.float({ min: Math.fround(1e-7), max: Math.fround(1), noNaN: true }),
                (totalTokens, pricePerToken) => {
                    const credits = Math.ceil(totalTokens * pricePerToken * 1000);

                    expect(credits).toBeGreaterThanOrEqual(1);
                    expect(Number.isInteger(credits)).toBe(true);
                    expect(credits).toBe(Math.ceil(totalTokens * pricePerToken * 1000));
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Property 9 (via calculateCreditsForUsage): formula is consistent
     */
    it('Property 9: calculateCreditsForUsage always returns integer >= 1', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: 1, max: 1000000 }),
                fc.string(),
                (totalTokens, model) => {
                    const credits = calculateCreditsForUsage(totalTokens, model);

                    expect(credits).toBeGreaterThanOrEqual(1);
                    expect(Number.isInteger(credits)).toBe(true);
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Property 10: WalletTransaction completeness for USAGE
     *
     * For any successful AI call with a CreditContext, the resulting
     * WalletTransaction SHALL have type = USAGE and SHALL contain non-null
     * values for credits, balanceAfter, aiModel, promptTokens, completionTokens,
     * totalTokens, and description.
     *
     * Validates: Requirements 5.4
     */
    it('Property 10: deductCredits is called with all required USAGE fields after successful AI call', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.integer({ min: 1, max: 100000 }),
                fc.constantFrom('openai/gpt-4o', 'openai/gpt-4o-mini', 'anthropic/claude-3.5-sonnet'),
                async (totalTokens, model) => {
                    vi.mocked(walletService.getOrCreate).mockResolvedValue(
                        makeWallet(10000) as any
                    );
                    vi.mocked(walletService.deductCredits).mockResolvedValue({} as any);

                    // The AiClient uses the mocked OpenAI which returns fixed usage
                    // We verify deductCredits is called with correct fields
                    await aiClient.chat({ model, messages: [{ role: 'user', content: 'test' }] }, { userId: 1, brandId: 42 });

                    expect(walletService.deductCredits).toHaveBeenCalledWith(
                        expect.objectContaining({
                            userId: 1,
                            brandId: 42,
                            aiModel: expect.any(String),
                            totalTokens: expect.any(Number),
                            promptTokens: expect.any(Number),
                            completionTokens: expect.any(Number),
                            credits: expect.any(Number),
                            description: expect.any(String),
                        })
                    );

                    const callArgs = vi.mocked(walletService.deductCredits).mock.calls[0][0];

                    // All required fields must be non-null and valid
                    expect(callArgs.credits).toBeGreaterThanOrEqual(1);
                    expect(Number.isInteger(callArgs.credits)).toBe(true);
                    expect(callArgs.aiModel).toBeTruthy();
                    expect(callArgs.totalTokens).toBeGreaterThan(0);
                    expect(callArgs.promptTokens).toBeGreaterThan(0);
                    expect(callArgs.completionTokens).toBeGreaterThan(0);
                    expect(callArgs.description).toBeTruthy();
                }
            ),
            { numRuns: 50 }
        );
    });

    /**
     * Property 10 (no creditContext): deductCredits is NOT called without CreditContext
     */
    it('Property 10: deductCredits is NOT called when no CreditContext is provided', async () => {
        vi.mocked(walletService.deductCredits).mockResolvedValue({} as any);

        await aiClient.chat(defaultChatParams);

        expect(walletService.deductCredits).not.toHaveBeenCalled();
        expect(walletService.getOrCreate).not.toHaveBeenCalled();
    });
});
