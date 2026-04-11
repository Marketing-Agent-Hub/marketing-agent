/**
 * Feature: openrouter-ai-client, Property 5: actualModel được lưu vào ai_results
 * Validates: Requirements 7.4
 *
 * For any actualModel returned from aiClient.chat(), after Stage A or Stage B
 * successfully processes an item, that actualModel value must be saved to the
 * `model` column of the `ai_results` table — not the model name from settings.
 */
import { beforeEach, describe, it, vi } from 'vitest';
import * as fc from 'fast-check';
import type OpenAI from 'openai';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockAiClientChat = vi.fn();

vi.mock('../../../lib/ai-client.js', () => ({
    aiClient: { chat: mockAiClientChat },
    OpenRouterCreditError: class OpenRouterCreditError extends Error {
        readonly statusCode = 402;
        constructor() { super('credit'); this.name = 'OpenRouterCreditError'; }
    },
    OpenRouterOverloadedError: class OpenRouterOverloadedError extends Error {
        readonly statusCode = 529;
        constructor() { super('overloaded'); this.name = 'OpenRouterOverloadedError'; }
    },
}));

const mockSettingGetModel = vi.fn();
vi.mock('../../../lib/setting.service.js', () => ({
    settingService: { getModel: mockSettingGetModel },
}));

const mockPrismaItemFindUnique = vi.fn();
const mockPrismaAiResultCreate = vi.fn();
const mockPrismaItemUpdate = vi.fn();
const mockPrismaAiResultFindFirst = vi.fn();

vi.mock('../../../db/index.js', () => ({
    prisma: {
        item: {
            findUnique: mockPrismaItemFindUnique,
            update: mockPrismaItemUpdate,
        },
        aiResult: {
            create: mockPrismaAiResultCreate,
            findFirst: mockPrismaAiResultFindFirst,
        },
    },
}));

vi.mock('../../../config/ai.config.js', () => ({
    AI_CONFIG: { STAGE_A_ENABLED: true, STAGE_B_ENABLED: true },
}));

vi.mock('../../../lib/logger.js', () => ({
    logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

// ─── Arbitraries ─────────────────────────────────────────────────────────────

// Valid model name strings (e.g. "openai/gpt-4o", "anthropic/claude-3-haiku")
const modelNameArb = fc.stringMatching(/^[a-zA-Z0-9][a-zA-Z0-9/_\-.]{0,99}$/);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeStageAItem(itemId: number) {
    return {
        id: itemId,
        title: 'Test article title for stage A processing',
        snippet: 'A short snippet',
        publishedAt: new Date('2024-01-01'),
        status: 'READY_FOR_AI',
        contentHash: 'hash-abc',
        source: { name: 'Test Source' },
    };
}

function makeStageBItem(itemId: number) {
    return {
        id: itemId,
        title: 'Test article title for stage B processing',
        snippet: 'A short snippet',
        publishedAt: new Date('2024-01-01'),
        status: 'AI_STAGE_A_DONE',
        contentHash: 'hash-def',
        source: { name: 'Test Source' },
        article: { truncatedContent: 'Full article content here for stage B processing.' },
        aiResults: [{
            stage: 'A',
            isAllowed: true,
            topicTags: ['tech'],
            importanceScore: 80,
            oneLineSummary: 'A summary',
            createdAt: new Date(),
        }],
    };
}

function makeChatCompletion(content: string): OpenAI.Chat.Completions.ChatCompletion {
    return {
        id: 'chatcmpl-test',
        object: 'chat.completion',
        created: 1234567890,
        model: 'test-model',
        choices: [{
            index: 0,
            message: { role: 'assistant', content, refusal: null },
            finish_reason: 'stop',
            logprobs: null,
        }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
    };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Property 5: actualModel được lưu vào ai_results', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockPrismaAiResultCreate.mockResolvedValue({});
        mockPrismaItemUpdate.mockResolvedValue({});
        mockPrismaAiResultFindFirst.mockResolvedValue(null);
        mockSettingGetModel.mockResolvedValue('openai/gpt-4o-mini');
    });

    it('Property 5a: Stage A saves actualModel (from aiClient.chat) to ai_results.model', async () => {
        /**
         * For any actualModel string returned by aiClient.chat(), processStageA must
         * write that exact value to ai_results.model — not the model name from settings.
         * Validates: Requirements 7.4
         */
        const { processStageA } = await import(
            '../../../domains/content-intelligence/ai-stage-a.service.js'
        );

        const stageAResponseJson = JSON.stringify({
            isAllowed: true,
            topicTags: ['tech'],
            importanceScore: 75,
            oneLineSummary: 'Summary',
            reason: 'Relevant',
        });

        await fc.assert(
            fc.asyncProperty(modelNameArb, async (actualModel) => {
                vi.clearAllMocks();
                mockPrismaAiResultCreate.mockResolvedValue({});
                mockPrismaItemUpdate.mockResolvedValue({});
                mockSettingGetModel.mockResolvedValue('openai/gpt-4o-mini');
                mockPrismaItemFindUnique.mockResolvedValue(makeStageAItem(1));
                mockAiClientChat.mockResolvedValue({
                    data: makeChatCompletion(stageAResponseJson),
                    actualModel,
                });

                await processStageA(1);

                const createCall = mockPrismaAiResultCreate.mock.calls[0]?.[0];
                // The model field in ai_results must equal the actualModel from aiClient.chat()
                return createCall?.data?.model === actualModel;
            }),
            { numRuns: 100 },
        );
    });

    it('Property 5b: Stage B saves actualModel (from aiClient.chat) to ai_results.model', async () => {
        /**
         * For any actualModel string returned by aiClient.chat(), processStageB must
         * write that exact value to ai_results.model — not the model name from settings.
         * Validates: Requirements 7.4
         */
        const { processStageB } = await import(
            '../../../domains/content-intelligence/ai-stage-b.service.js'
        );

        const stageBResponseJson = JSON.stringify({
            fullArticle: 'Đây là bài viết Facebook đầy đủ với nội dung chi tiết và phong phú, đủ dài để vượt qua validation tối thiểu 100 ký tự.',
        });

        await fc.assert(
            fc.asyncProperty(modelNameArb, async (actualModel) => {
                vi.clearAllMocks();
                mockPrismaAiResultCreate.mockResolvedValue({});
                mockPrismaItemUpdate.mockResolvedValue({});
                mockPrismaAiResultFindFirst.mockResolvedValue(null);
                mockSettingGetModel.mockResolvedValue('openai/gpt-4o');
                mockPrismaItemFindUnique.mockResolvedValue(makeStageBItem(2));
                mockAiClientChat.mockResolvedValue({
                    data: makeChatCompletion(stageBResponseJson),
                    actualModel,
                });

                await processStageB(2);

                const createCall = mockPrismaAiResultCreate.mock.calls[0]?.[0];
                // The model field in ai_results must equal the actualModel from aiClient.chat()
                return createCall?.data?.model === actualModel;
            }),
            { numRuns: 100 },
        );
    });

    it('Property 5c: actualModel differs from settings model — ai_results.model uses actualModel', async () => {
        /**
         * When OpenRouter returns a different model than requested (fallback),
         * the actualModel (from header) must be saved — not the settings model name.
         * This verifies Requirement 7.4: "không dùng tên model từ settings vì có thể đã bị fallback".
         * Validates: Requirements 7.4
         */
        const { processStageA } = await import(
            '../../../domains/content-intelligence/ai-stage-a.service.js'
        );

        const stageAResponseJson = JSON.stringify({
            isAllowed: true,
            topicTags: [],
            importanceScore: 60,
            oneLineSummary: 'Test',
            reason: 'ok',
        });

        await fc.assert(
            fc.asyncProperty(modelNameArb, modelNameArb, async (settingsModel, actualModel) => {
                vi.clearAllMocks();
                mockPrismaAiResultCreate.mockResolvedValue({});
                mockPrismaItemUpdate.mockResolvedValue({});
                // Settings returns one model name
                mockSettingGetModel.mockResolvedValue(settingsModel);
                mockPrismaItemFindUnique.mockResolvedValue(makeStageAItem(3));
                // aiClient returns a different actualModel (simulating OpenRouter fallback)
                mockAiClientChat.mockResolvedValue({
                    data: makeChatCompletion(stageAResponseJson),
                    actualModel,
                });

                await processStageA(3);

                const createCall = mockPrismaAiResultCreate.mock.calls[0]?.[0];
                // Must save actualModel, not settingsModel
                return createCall?.data?.model === actualModel;
            }),
            { numRuns: 100 },
        );
    });
});
