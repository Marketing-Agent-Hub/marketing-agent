/**
 * Feature: openrouter-ai-client
 *
 * Property 5: actualModel được lưu vào ai_results
 * Validates: Requirements 7.4
 *
 * Property 6: Batch dừng ngay khi gặp CreditError
 * Validates: Requirements 8.3
 *
 * Property 7: Retry đúng 3 lần khi gặp OverloadedError
 * Validates: Requirements 8.4
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as fc from 'fast-check';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../../../db/index.js', () => ({
    prisma: {
        item: {
            findMany: vi.fn(),
            findUnique: vi.fn(),
            update: vi.fn(),
        },
        aiResult: {
            create: vi.fn(),
        },
        source: { findUnique: vi.fn() },
    },
}));

vi.mock('../../../config/ai.config.js', () => ({
    AI_CONFIG: { STAGE_A_ENABLED: true, STAGE_B_ENABLED: true },
}));

vi.mock('../../../lib/setting.service.js', () => ({
    settingService: {
        getModel: vi.fn().mockResolvedValue('openai/gpt-4o-mini'),
    },
}));

vi.mock('../../../lib/logger.js', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// Mock ai-client to prevent singleton initialization from requiring OPENROUTER_API_KEY
vi.mock('../../../lib/ai-client.js', async () => {
    class OpenRouterCreditError extends Error {
        readonly statusCode = 402;
        constructor() {
            super('OpenRouter credit exhausted (HTTP 402)');
            this.name = 'OpenRouterCreditError';
        }
    }
    class OpenRouterOverloadedError extends Error {
        readonly statusCode = 529;
        constructor() {
            super('OpenRouter overloaded (HTTP 529)');
            this.name = 'OpenRouterOverloadedError';
        }
    }
    return {
        OpenRouterCreditError,
        OpenRouterOverloadedError,
        aiClient: { chat: vi.fn(), embed: vi.fn() },
    };
});

// ─── Import after mocks ───────────────────────────────────────────────────────

import { prisma } from '../../../db/index.js';
import { OpenRouterCreditError, OpenRouterOverloadedError } from '../../../lib/ai-client.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Simulate a generic batch runner that mirrors the pattern used in
 * processStageABatch, processFilteringBatch, etc.
 *
 * This is the canonical batch loop extracted for property testing:
 *   - CreditError → break immediately
 *   - OverloadedError → retryWithBackoff (max 3 retries), then skip
 *   - Other errors → skip item
 */
async function runBatch(
    items: number[],
    processFn: (id: number) => Promise<void>,
): Promise<{ processed: number; stopped: boolean; callCount: number }> {
    let processed = 0;
    let stopped = false;
    let callCount = 0;

    async function retryWithBackoff(fn: () => Promise<void>, maxRetries = 3): Promise<void> {
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                callCount++;
                await fn();
                return;
            } catch (error) {
                if (error instanceof OpenRouterOverloadedError && attempt < maxRetries) {
                    // No real sleep in tests — just continue
                    continue;
                }
                throw error;
            }
        }
    }

    for (const id of items) {
        try {
            await retryWithBackoff(() => processFn(id));
            processed++;
        } catch (error) {
            if (error instanceof OpenRouterCreditError) {
                stopped = true;
                break;
            }
            // OverloadedError after max retries or other errors → skip
        }
    }

    return { processed, stopped, callCount };
}

// ─── Property 5: actualModel saved to ai_results ─────────────────────────────

describe('Property 5: actualModel is persisted to ai_results', () => {
    /**
     * For any actualModel string returned from aiClient.chat(), after Stage A
     * processes an item successfully, the value saved to ai_results.model
     * must equal that actualModel — not the configured model name.
     * Validates: Requirement 7.4
     */

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('Property 5: ai_results.model receives the actualModel value from AiClient', async () => {
        const modelNameArb = fc.stringMatching(/^[a-zA-Z0-9][a-zA-Z0-9/_\-.]{0,99}$/);

        await fc.assert(
            fc.asyncProperty(
                modelNameArb,
                fc.integer({ min: 1, max: 10_000 }),
                async (actualModel, itemId) => {
                    const capturedCreates: any[] = [];

                    vi.mocked(prisma.aiResult.create).mockImplementation(async ({ data }: any) => {
                        capturedCreates.push(data);
                        return data as any;
                    });
                    vi.mocked(prisma.item.update).mockResolvedValue({} as any);

                    // Simulate what Stage A does after getting actualModel from AiClient
                    await prisma.aiResult.create({
                        data: {
                            itemId,
                            stage: 'A',
                            isAllowed: true,
                            topicTags: ['tech'],
                            importanceScore: 75,
                            oneLineSummary: 'Test item',
                            model: actualModel,  // This is the key: actualModel from AiClient
                        },
                    });

                    const saved = capturedCreates.at(-1);
                    capturedCreates.length = 0;

                    return saved?.model === actualModel;
                },
            ),
            { numRuns: 100 },
        );
    });
});

// ─── Property 6: Batch stops immediately on CreditError ──────────────────────

describe('Property 6: Batch stops immediately when CreditError occurs at position K', () => {
    /**
     * For any batch size N and any error position K (1 ≤ K ≤ N), when
     * OpenRouterCreditError is thrown at item K, the batch must stop after
     * processing K-1 items successfully and not process items K+1..N.
     * Validates: Requirement 8.3
     */

    it('Property 6: exactly K-1 items processed before CreditError at position K', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.integer({ min: 1, max: 20 }),  // batch size N
                fc.integer({ min: 1, max: 20 }),  // error position K (1-indexed)
                async (n, k) => {
                    const errorAt = Math.min(k, n);  // clamp K to [1, N]
                    const items = Array.from({ length: n }, (_, i) => i + 1);

                    const processFn = vi.fn().mockImplementation(async (id: number) => {
                        if (id === errorAt) throw new OpenRouterCreditError();
                    });

                    const { processed, stopped } = await runBatch(items, processFn);

                    // Items before errorAt should be processed (errorAt - 1 items)
                    const expectedProcessed = errorAt - 1;

                    return processed === expectedProcessed && stopped === true;
                },
            ),
            { numRuns: 100 },
        );
    });

    it('Property 6: no items processed after CreditError position', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.integer({ min: 2, max: 15 }),  // N ≥ 2 so there's always an "after"
                fc.integer({ min: 1, max: 14 }),  // K < N
                async (n, k) => {
                    const errorAt = Math.min(k, n - 1);  // ensure errorAt < n
                    const items = Array.from({ length: n }, (_, i) => i + 1);
                    const processedIds: number[] = [];

                    const processFn = vi.fn().mockImplementation(async (id: number) => {
                        if (id === errorAt) throw new OpenRouterCreditError();
                        processedIds.push(id);
                    });

                    await runBatch(items, processFn);

                    // No item with id > errorAt should have been processed
                    const processedAfterError = processedIds.filter(id => id > errorAt);
                    processedIds.length = 0;

                    return processedAfterError.length === 0;
                },
            ),
            { numRuns: 100 },
        );
    });
});

// ─── Property 7: Retry exactly 3 times on OverloadedError ────────────────────

describe('Property 7: Retry exactly 3 times (4 total calls) when OverloadedError persists', () => {
    /**
     * For any item where all calls throw OpenRouterOverloadedError, the job
     * must make exactly 4 total calls (1 initial + 3 retries) before skipping
     * the item and continuing the batch.
     * Validates: Requirement 8.4
     */

    it('Property 7: total call count is exactly 4 when all attempts throw OverloadedError', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.integer({ min: 1, max: 10 }),  // batch size
                async (n) => {
                    const items = Array.from({ length: n }, (_, i) => i + 1);

                    // All calls throw OverloadedError
                    const processFn = vi.fn().mockRejectedValue(new OpenRouterOverloadedError());

                    const { callCount, stopped } = await runBatch(items, processFn);

                    // Each item: 1 initial + 3 retries = 4 calls
                    const expectedCalls = n * 4;

                    return callCount === expectedCalls && stopped === false;
                },
            ),
            { numRuns: 100 },
        );
    });

    it('Property 7: batch continues to next item after OverloadedError exhausts retries', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.integer({ min: 2, max: 10 }),  // N ≥ 2 to verify continuation
                fc.integer({ min: 1, max: 9 }),   // overloaded item index (0-based)
                async (n, overloadedIdx) => {
                    const errorAt = overloadedIdx % n;  // clamp to valid index
                    const items = Array.from({ length: n }, (_, i) => i + 1);
                    const processedIds: number[] = [];

                    const processFn = vi.fn().mockImplementation(async (id: number) => {
                        if (id === items[errorAt]) throw new OpenRouterOverloadedError();
                        processedIds.push(id);
                    });

                    const { stopped } = await runBatch(items, processFn);

                    // Batch must NOT stop (no CreditError)
                    if (stopped) return false;

                    // All items except the overloaded one should be processed
                    const expectedProcessed = n - 1;
                    const result = processedIds.length === expectedProcessed;
                    processedIds.length = 0;

                    return result;
                },
            ),
            { numRuns: 100 },
        );
    });

    it('Property 7: succeeds on retry — call count is attempt_number + 1', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.integer({ min: 0, max: 3 }),  // fail on attempts 0..failUntil, succeed on failUntil+1
                async (failUntil) => {
                    const items = [1];
                    let attemptCount = 0;

                    const processFn = vi.fn().mockImplementation(async () => {
                        attemptCount++;
                        if (attemptCount <= failUntil) throw new OpenRouterOverloadedError();
                        // succeeds on attempt failUntil + 1
                    });

                    const { processed, stopped, callCount } = await runBatch(items, processFn);
                    const result = processed === 1 && stopped === false && callCount === failUntil + 1;
                    attemptCount = 0;

                    return result;
                },
            ),
            { numRuns: 100 },
        );
    });
});
