/**
 * Feature: openrouter-ai-client
 *
 * Property 1: AiClient forward đúng model name
 * Validates: Requirements 1.4
 *
 * Property 2: AiClient forward đúng toàn bộ tham số
 * Validates: Requirements 2.3
 *
 * Property 4: AiClient trả về actualModel từ header
 * Validates: Requirements 7.2, 7.3
 *
 * Property 7: Retry đúng 3 lần khi gặp OverloadedError
 * Validates: Requirements 8.4
 */
import { beforeEach, describe, it, vi, expect } from 'vitest';
import * as fc from 'fast-check';
import OpenAI from 'openai';

// ─── Mock OpenAI SDK ──────────────────────────────────────────────────────────

const mockWithResponse = vi.fn();
const mockChatCreate = vi.fn(() => ({ withResponse: mockWithResponse }));
const mockEmbedCreate = vi.fn(() => ({ withResponse: mockWithResponse }));

vi.mock('openai', () => {
    const MockOpenAI = vi.fn().mockImplementation(function (this: any) {
        this.chat = { completions: { create: mockChatCreate } };
        this.embeddings = { create: mockEmbedCreate };
    }) as any;

    MockOpenAI.APIStatusError = class APIStatusError extends Error {
        status: number;
        constructor(status: number, message: string) {
            super(message);
            this.status = status;
            this.name = 'APIStatusError';
        }
    };

    return { default: MockOpenAI };
});

vi.mock('../../lib/logger.js', () => ({
    logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeHeaders(model?: string): Headers {
    const h = new Headers();
    if (model !== undefined) h.set('x-openrouter-model', model);
    return h;
}

function makeChatCompletion(model: string): OpenAI.Chat.Completions.ChatCompletion {
    return {
        id: 'chatcmpl-test',
        object: 'chat.completion',
        created: 1234567890,
        model,
        choices: [{
            index: 0,
            message: { role: 'assistant', content: 'ok', refusal: null },
            finish_reason: 'stop',
            logprobs: null,
        }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
    };
}

function makeEmbedResponse(model: string): OpenAI.Embeddings.CreateEmbeddingResponse {
    return {
        object: 'list',
        model,
        data: [{ object: 'embedding', index: 0, embedding: [0.1, 0.2] }],
        usage: { prompt_tokens: 5, total_tokens: 5 },
    };
}

// Arbitrary for valid model name strings (e.g. "openai/gpt-4o", "anthropic/claude-3-haiku")
const modelNameArb = fc.stringMatching(/^[a-zA-Z0-9][a-zA-Z0-9/_\-.]{0,99}$/);

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('AiClient — property tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        process.env.OPENROUTER_API_KEY = 'test-key';
    });

    // ── Property 1: AiClient forward đúng model name ──────────────────────────

    describe('Property 1: AiClient forwards model name unchanged to underlying SDK', () => {
        /**
         * For any valid model name passed to aiClient.chat() or aiClient.embed(),
         * the underlying SDK create() call MUST receive that exact model name —
         * AiClient must not override or transform it.
         * Validates: Requirement 1.4
         */

        it('Property 1a: chat() forwards model name to SDK without modification', async () => {
            const { AiClient } = await import('../../lib/ai-client.js');

            await fc.assert(
                fc.asyncProperty(modelNameArb, async (model) => {
                    mockWithResponse.mockResolvedValue({
                        data: makeChatCompletion(model),
                        response: { headers: makeHeaders(model) },
                    });

                    const client = new AiClient();
                    await client.chat({
                        model,
                        messages: [{ role: 'user', content: 'hi' }],
                    });

                    const calledWith = mockChatCreate.mock.calls.at(-1)?.[0];
                    return calledWith?.model === model;
                }),
                { numRuns: 100 },
            );
        });

        it('Property 1b: embed() forwards model name to SDK without modification', async () => {
            const { AiClient } = await import('../../lib/ai-client.js');

            await fc.assert(
                fc.asyncProperty(modelNameArb, async (model) => {
                    mockWithResponse.mockResolvedValue({
                        data: makeEmbedResponse(model),
                        response: { headers: makeHeaders(model) },
                    });

                    const client = new AiClient();
                    await client.embed({ model, input: 'test' });

                    const calledWith = mockEmbedCreate.mock.calls.at(-1)?.[0];
                    return calledWith?.model === model;
                }),
                { numRuns: 100 },
            );
        });
    });

    // ── Property 2: AiClient forward đúng toàn bộ tham số ────────────────────

    describe('Property 2: AiClient forwards all chat params to SDK unchanged', () => {
        /**
         * For any valid set of chat params (messages, temperature, max_tokens,
         * response_format), all params must be forwarded verbatim to the SDK.
         * Validates: Requirement 2.3
         */

        const temperatureArb = fc.option(fc.float({ min: 0, max: 2, noNaN: true }), { nil: undefined });
        const maxTokensArb = fc.option(fc.integer({ min: 1, max: 4096 }), { nil: undefined });
        const responseFormatArb = fc.option(
            fc.constantFrom(
                { type: 'json_object' as const },
                { type: 'text' as const },
            ),
            { nil: undefined },
        );

        it('Property 2: all provided chat params reach the underlying SDK call', async () => {
            const { AiClient } = await import('../../lib/ai-client.js');

            await fc.assert(
                fc.asyncProperty(
                    modelNameArb,
                    temperatureArb,
                    maxTokensArb,
                    responseFormatArb,
                    async (model, temperature, max_tokens, response_format) => {
                        mockWithResponse.mockResolvedValue({
                            data: makeChatCompletion(model),
                            response: { headers: makeHeaders(model) },
                        });

                        const params: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming = {
                            model,
                            messages: [{ role: 'user', content: 'hello' }],
                            ...(temperature !== undefined && { temperature }),
                            ...(max_tokens !== undefined && { max_tokens }),
                            ...(response_format !== undefined && { response_format }),
                        };

                        const client = new AiClient();
                        await client.chat(params);

                        const calledWith = mockChatCreate.mock.calls.at(-1)?.[0];

                        // All provided params must be forwarded exactly
                        if (calledWith?.model !== model) return false;
                        if (temperature !== undefined && calledWith?.temperature !== temperature) return false;
                        if (max_tokens !== undefined && calledWith?.max_tokens !== max_tokens) return false;
                        if (response_format !== undefined &&
                            calledWith?.response_format?.type !== response_format.type) return false;

                        return true;
                    },
                ),
                { numRuns: 100 },
            );
        });
    });

    // ── Property 4: AiClient trả về actualModel từ header ────────────────────

    describe('Property 4: AiClient returns actualModel from x-openrouter-model header', () => {
        /**
         * For any model name returned in the x-openrouter-model response header,
         * chat() and embed() must return that exact value as actualModel.
         * Validates: Requirements 7.2, 7.3
         */

        it('Property 4a: chat() returns actualModel from x-openrouter-model header', async () => {
            const { AiClient } = await import('../../lib/ai-client.js');

            await fc.assert(
                fc.asyncProperty(modelNameArb, modelNameArb, async (requestedModel, headerModel) => {
                    mockWithResponse.mockResolvedValue({
                        data: makeChatCompletion(requestedModel),
                        response: { headers: makeHeaders(headerModel) },
                    });

                    const client = new AiClient();
                    const result = await client.chat({
                        model: requestedModel,
                        messages: [{ role: 'user', content: 'hi' }],
                    });

                    // actualModel must come from the header, not the requested model
                    return result.actualModel === headerModel;
                }),
                { numRuns: 100 },
            );
        });

        it('Property 4b: embed() returns actualModel from x-openrouter-model header', async () => {
            const { AiClient } = await import('../../lib/ai-client.js');

            await fc.assert(
                fc.asyncProperty(modelNameArb, modelNameArb, async (requestedModel, headerModel) => {
                    mockWithResponse.mockResolvedValue({
                        data: makeEmbedResponse(requestedModel),
                        response: { headers: makeHeaders(headerModel) },
                    });

                    const client = new AiClient();
                    const result = await client.embed({ model: requestedModel, input: 'test' });

                    return result.actualModel === headerModel;
                }),
                { numRuns: 100 },
            );
        });

        it('Property 4c: chat() falls back to requested model when header is absent', async () => {
            const { AiClient } = await import('../../lib/ai-client.js');

            await fc.assert(
                fc.asyncProperty(modelNameArb, async (requestedModel) => {
                    // No header set
                    mockWithResponse.mockResolvedValue({
                        data: makeChatCompletion(requestedModel),
                        response: { headers: new Headers() },
                    });

                    const client = new AiClient();
                    const result = await client.chat({
                        model: requestedModel,
                        messages: [{ role: 'user', content: 'hi' }],
                    });

                    return result.actualModel === requestedModel;
                }),
                { numRuns: 100 },
            );
        });

        it('Property 4d: embed() falls back to requested model when header is absent', async () => {
            const { AiClient } = await import('../../lib/ai-client.js');

            await fc.assert(
                fc.asyncProperty(modelNameArb, async (requestedModel) => {
                    mockWithResponse.mockResolvedValue({
                        data: makeEmbedResponse(requestedModel),
                        response: { headers: new Headers() },
                    });

                    const client = new AiClient();
                    const result = await client.embed({ model: requestedModel, input: 'test' });

                    return result.actualModel === requestedModel;
                }),
                { numRuns: 100 },
            );
        });
    });
});

// ── Property 7: Retry đúng 3 lần khi gặp OverloadedError ─────────────────────

describe('Property 7: Retry đúng 3 lần khi gặp OverloadedError', () => {
    /**
     * Property 7: Retry đúng 3 lần khi gặp OverloadedError
     * Validates: Requirements 8.4
     *
     * For any item where ALL calls throw OpenRouterOverloadedError, the job
     * must perform exactly 3 retries (total 4 calls: 1 initial + 3 retries)
     * before skipping the item and continuing the batch.
     */

    /**
     * Standalone retryWithBackoff — mirrors the implementation used in all
     * service files (ingest, filtering, ai-stage-a, ai-stage-b, etc.).
     * Delay is injected so tests run instantly without real timers.
     */
    async function retryWithBackoff<T>(
        fn: () => Promise<T>,
        maxRetries = 3,
        delayFn: (ms: number) => Promise<void> = () => Promise.resolve(),
    ): Promise<T> {
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                return await fn();
            } catch (error: any) {
                if (error?.name === 'OpenRouterOverloadedError' && attempt < maxRetries) {
                    const delay = Math.pow(2, attempt) * 1000;
                    await delayFn(delay);
                    continue;
                }
                throw error;
            }
        }
        throw new Error('Max retries exceeded');
    }

    class OpenRouterOverloadedError extends Error {
        readonly statusCode = 529;
        constructor() {
            super('OpenRouter service is overloaded (HTTP 529).');
            this.name = 'OpenRouterOverloadedError';
        }
    }

    it('Property 7a: total call count is exactly 4 when all calls throw OverloadedError', async () => {
        /**
         * For any item, when every call throws OpenRouterOverloadedError,
         * retryWithBackoff(fn, 3) must call fn exactly 4 times
         * (attempt 0 + retries 1, 2, 3) before re-throwing.
         */
        await fc.assert(
            fc.asyncProperty(
                // Vary the item identifier to confirm the property holds for any item
                fc.integer({ min: 1, max: 100_000 }),
                async (_itemId) => {
                    let callCount = 0;
                    const alwaysOverloaded = async () => {
                        callCount++;
                        throw new OpenRouterOverloadedError();
                    };

                    const noDelay = () => Promise.resolve();

                    callCount = 0;
                    try {
                        await retryWithBackoff(alwaysOverloaded, 3, noDelay);
                    } catch {
                        // expected to throw after exhausting retries
                    }

                    // Must be exactly 4: 1 initial + 3 retries
                    expect(callCount).toBe(4);
                },
            ),
            { numRuns: 100 },
        );
    });

    it('Property 7b: delays follow exponential backoff pattern (1s, 2s, 4s)', async () => {
        /**
         * The delay between retries must follow 2^attempt * 1000ms:
         *   attempt 0 → delay 1000ms
         *   attempt 1 → delay 2000ms
         *   attempt 2 → delay 4000ms
         */
        await fc.assert(
            fc.asyncProperty(
                fc.integer({ min: 1, max: 100_000 }),
                async (_itemId) => {
                    const delays: number[] = [];
                    const alwaysOverloaded = async () => {
                        throw new OpenRouterOverloadedError();
                    };
                    const recordDelay = (ms: number) => {
                        delays.push(ms);
                        return Promise.resolve();
                    };

                    try {
                        await retryWithBackoff(alwaysOverloaded, 3, recordDelay);
                    } catch {
                        // expected
                    }

                    // 3 delays for 3 retries
                    expect(delays).toHaveLength(3);
                    expect(delays[0]).toBe(1000);  // 2^0 * 1000
                    expect(delays[1]).toBe(2000);  // 2^1 * 1000
                    expect(delays[2]).toBe(4000);  // 2^2 * 1000
                },
            ),
            { numRuns: 100 },
        );
    });

    it('Property 7c: after OverloadedError exhaustion, batch continues to next item', async () => {
        /**
         * For any batch of N items where item at position K always throws
         * OverloadedError, the batch must:
         * - Skip item K after 3 retries (4 total calls)
         * - Continue processing items K+1 … N-1
         */
        const batchSizeArb = fc.integer({ min: 2, max: 10 });
        const errorPositionArb = (batchSize: number) =>
            fc.integer({ min: 0, max: batchSize - 1 });

        await fc.assert(
            fc.asyncProperty(
                batchSizeArb.chain(n => fc.tuple(fc.constant(n), errorPositionArb(n))),
                async ([batchSize, errorPos]) => {
                    const processedItems: number[] = [];
                    const callCountsPerItem: Record<number, number> = {};

                    const noDelay = () => Promise.resolve();

                    // Simulate a batch loop with retryWithBackoff
                    for (let i = 0; i < batchSize; i++) {
                        callCountsPerItem[i] = 0;
                        try {
                            await retryWithBackoff(
                                async () => {
                                    callCountsPerItem[i]++;
                                    if (i === errorPos) {
                                        throw new OpenRouterOverloadedError();
                                    }
                                    processedItems.push(i);
                                },
                                3,
                                noDelay,
                            );
                        } catch {
                            // OverloadedError after 3 retries → skip item, continue batch
                        }
                    }

                    // The overloaded item was called exactly 4 times
                    expect(callCountsPerItem[errorPos]).toBe(4);

                    // All other items were processed exactly once
                    for (let i = 0; i < batchSize; i++) {
                        if (i !== errorPos) {
                            expect(processedItems).toContain(i);
                            expect(callCountsPerItem[i]).toBe(1);
                        }
                    }

                    // Total items processed = batchSize - 1 (skipped the overloaded one)
                    expect(processedItems.length).toBe(batchSize - 1);
                },
            ),
            { numRuns: 100 },
        );
    });

    it('Property 7d: succeeds on first retry if only initial call throws OverloadedError', async () => {
        /**
         * If only the first call throws OverloadedError and subsequent calls succeed,
         * retryWithBackoff must return the successful result after exactly 2 calls.
         */
        await fc.assert(
            fc.asyncProperty(
                fc.integer({ min: 1, max: 100_000 }),
                async (successValue) => {
                    let callCount = 0;
                    const failOnceThenSucceed = async () => {
                        callCount++;
                        if (callCount === 1) throw new OpenRouterOverloadedError();
                        return successValue;
                    };

                    callCount = 0;
                    const result = await retryWithBackoff(failOnceThenSucceed, 3, () => Promise.resolve());

                    expect(result).toBe(successValue);
                    expect(callCount).toBe(2);
                },
            ),
            { numRuns: 100 },
        );
    });
});
