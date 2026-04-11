/**
 * Feature: openrouter-ai-client
 * Unit tests for AiClient
 * Requirements: 1.3, 1.5, 8.1, 8.2, 8.5
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import OpenAI from 'openai';

// ─── Mock OpenAI SDK ──────────────────────────────────────────────────────────

const mockWithResponse = vi.fn();
const mockChatCreate = vi.fn(() => ({ withResponse: mockWithResponse }));
const mockEmbedCreate = vi.fn(() => ({ withResponse: mockWithResponse }));

vi.mock('openai', () => {
    const MockOpenAI = vi.fn().mockImplementation(function (this: any, opts: any) {
        this._opts = opts;
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
    if (model) h.set('x-openrouter-model', model);
    return h;
}

function makeChatCompletion(): OpenAI.Chat.Completions.ChatCompletion {
    return {
        id: 'chatcmpl-test',
        object: 'chat.completion',
        created: 1234567890,
        model: 'openai/gpt-4o-mini',
        choices: [{
            index: 0,
            message: { role: 'assistant', content: 'hello', refusal: null },
            finish_reason: 'stop',
            logprobs: null,
        }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
    };
}

function makeEmbedResponse(): OpenAI.Embeddings.CreateEmbeddingResponse {
    return {
        object: 'list',
        model: 'openai/text-embedding-3-small',
        data: [{ object: 'embedding', index: 0, embedding: [0.1, 0.2, 0.3] }],
        usage: { prompt_tokens: 5, total_tokens: 5 },
    };
}

const CHAT_PARAMS: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming = {
    model: 'openai/gpt-4o-mini',
    messages: [{ role: 'user', content: 'hi' }],
};

const EMBED_PARAMS: OpenAI.Embeddings.EmbeddingCreateParams = {
    model: 'openai/text-embedding-3-small',
    input: 'hello world',
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('AiClient', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        process.env.OPENROUTER_API_KEY = 'test-key-123';
    });

    // ── Initialisation ────────────────────────────────────────────────────────

    describe('initialisation', () => {
        it('constructs OpenAI SDK with correct baseURL and apiKey', async () => {
            const { AiClient } = await import('../../lib/ai-client.js');
            new AiClient();

            const MockOpenAI = (await import('openai')).default as any;
            const lastCallOpts = MockOpenAI.mock.calls.at(-1)?.[0];
            expect(lastCallOpts.baseURL).toBe('https://openrouter.ai/api/v1');
            expect(lastCallOpts.apiKey).toBe('test-key-123');
        });

        it('throws a descriptive error when OPENROUTER_API_KEY is missing', async () => {
            delete process.env.OPENROUTER_API_KEY;
            const { AiClient } = await import('../../lib/ai-client.js');
            expect(() => new AiClient()).toThrow('OPENROUTER_API_KEY');
        });
    });

    // ── Singleton ─────────────────────────────────────────────────────────────

    describe('singleton', () => {
        it('exports the same instance on repeated imports', async () => {
            const mod1 = await import('../../lib/ai-client.js');
            const mod2 = await import('../../lib/ai-client.js');
            expect(mod1.aiClient).toBe(mod2.aiClient);
        });
    });

    // ── chat() ────────────────────────────────────────────────────────────────

    describe('chat()', () => {
        it('returns data and actualModel from x-openrouter-model header', async () => {
            const completion = makeChatCompletion();
            mockWithResponse.mockResolvedValue({
                data: completion,
                response: { headers: makeHeaders('anthropic/claude-3-haiku') },
            });

            const { AiClient } = await import('../../lib/ai-client.js');
            const result = await new AiClient().chat(CHAT_PARAMS);

            expect(result.data).toBe(completion);
            expect(result.actualModel).toBe('anthropic/claude-3-haiku');
        });

        it('falls back to params.model when x-openrouter-model header is absent', async () => {
            mockWithResponse.mockResolvedValue({
                data: makeChatCompletion(),
                response: { headers: makeHeaders() },
            });

            const { AiClient } = await import('../../lib/ai-client.js');
            const result = await new AiClient().chat(CHAT_PARAMS);

            expect(result.actualModel).toBe('openai/gpt-4o-mini');
        });

        it('throws OpenRouterCreditError on HTTP 402', async () => {
            const { AiClient, OpenRouterCreditError } = await import('../../lib/ai-client.js');
            const { default: MockOpenAI } = await import('openai') as any;
            mockWithResponse.mockRejectedValue(new MockOpenAI.APIStatusError(402, 'Payment Required'));

            await expect(new AiClient().chat(CHAT_PARAMS)).rejects.toBeInstanceOf(OpenRouterCreditError);
        });

        it('throws OpenRouterOverloadedError on HTTP 529', async () => {
            const { AiClient, OpenRouterOverloadedError } = await import('../../lib/ai-client.js');
            const { default: MockOpenAI } = await import('openai') as any;
            mockWithResponse.mockRejectedValue(new MockOpenAI.APIStatusError(529, 'Overloaded'));

            await expect(new AiClient().chat(CHAT_PARAMS)).rejects.toBeInstanceOf(OpenRouterOverloadedError);
        });

        it('does NOT wrap HTTP 429 as OpenRouterOverloadedError — rethrows original error', async () => {
            const { AiClient, OpenRouterOverloadedError } = await import('../../lib/ai-client.js');
            const { default: MockOpenAI } = await import('openai') as any;
            const err429 = new MockOpenAI.APIStatusError(429, 'Too Many Requests');
            mockWithResponse.mockRejectedValue(err429);

            const rejection = new AiClient().chat(CHAT_PARAMS);
            await expect(rejection).rejects.not.toBeInstanceOf(OpenRouterOverloadedError);
            await expect(new AiClient().chat(CHAT_PARAMS)).rejects.toMatchObject({ status: 429 });
        });
    });

    // ── embed() ───────────────────────────────────────────────────────────────

    describe('embed()', () => {
        it('returns data and actualModel from x-openrouter-model header', async () => {
            const embedResponse = makeEmbedResponse();
            mockWithResponse.mockResolvedValue({
                data: embedResponse,
                response: { headers: makeHeaders('openai/text-embedding-3-large') },
            });

            const { AiClient } = await import('../../lib/ai-client.js');
            const result = await new AiClient().embed(EMBED_PARAMS);

            expect(result.data).toBe(embedResponse);
            expect(result.actualModel).toBe('openai/text-embedding-3-large');
        });

        it('falls back to params.model when header is absent', async () => {
            mockWithResponse.mockResolvedValue({
                data: makeEmbedResponse(),
                response: { headers: makeHeaders() },
            });

            const { AiClient } = await import('../../lib/ai-client.js');
            const result = await new AiClient().embed(EMBED_PARAMS);

            expect(result.actualModel).toBe('openai/text-embedding-3-small');
        });

        it('throws OpenRouterCreditError on HTTP 402', async () => {
            const { AiClient, OpenRouterCreditError } = await import('../../lib/ai-client.js');
            const { default: MockOpenAI } = await import('openai') as any;
            mockWithResponse.mockRejectedValue(new MockOpenAI.APIStatusError(402, 'Payment Required'));

            await expect(new AiClient().embed(EMBED_PARAMS)).rejects.toBeInstanceOf(OpenRouterCreditError);
        });

        it('throws OpenRouterOverloadedError on HTTP 529', async () => {
            const { AiClient, OpenRouterOverloadedError } = await import('../../lib/ai-client.js');
            const { default: MockOpenAI } = await import('openai') as any;
            mockWithResponse.mockRejectedValue(new MockOpenAI.APIStatusError(529, 'Overloaded'));

            await expect(new AiClient().embed(EMBED_PARAMS)).rejects.toBeInstanceOf(OpenRouterOverloadedError);
        });
    });

    // ── Error class shapes ────────────────────────────────────────────────────

    describe('error class shapes', () => {
        it('OpenRouterCreditError has statusCode 402, correct name, and is an Error', async () => {
            const { OpenRouterCreditError } = await import('../../lib/ai-client.js');
            const err = new OpenRouterCreditError();
            expect(err.statusCode).toBe(402);
            expect(err.name).toBe('OpenRouterCreditError');
            expect(err).toBeInstanceOf(Error);
            expect(err.message).toContain('402');
        });

        it('OpenRouterOverloadedError has statusCode 529, correct name, and is an Error', async () => {
            const { OpenRouterOverloadedError } = await import('../../lib/ai-client.js');
            const err = new OpenRouterOverloadedError();
            expect(err.statusCode).toBe(529);
            expect(err.name).toBe('OpenRouterOverloadedError');
            expect(err).toBeInstanceOf(Error);
            expect(err.message).toContain('529');
        });
    });
});
