import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../db/index.js', () => ({
    prisma: {
        brand: { findUnique: vi.fn() },
        strategySlot: { findMany: vi.fn(), update: vi.fn() },
        contentBrief: { create: vi.fn(), findMany: vi.fn(), count: vi.fn(), findUnique: vi.fn(), updateMany: vi.fn() },
        contentDraft: { create: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
        generationRun: { create: vi.fn(), update: vi.fn() },
    },
}));

vi.mock('../../lib/ai-client.js', () => ({
    aiClient: { chat: vi.fn() },
    OpenRouterCreditError: class OpenRouterCreditError extends Error { },
    OpenRouterOverloadedError: class OpenRouterOverloadedError extends Error { },
}));

vi.mock('../../shared/marketing/settings.js', () => ({
    getAIModel: vi.fn().mockResolvedValue('gpt-4o-mini'),
}));

vi.mock('../../lib/logger.js', () => ({ logger: { error: vi.fn(), info: vi.fn() } }));
vi.mock('../../domains/content-intelligence/trend-signal.service.js', () => ({
    trendSignalService: {
        refreshRecentTrendSignals: vi.fn().mockResolvedValue({ created: 0, updated: 0 }),
    },
}));
vi.mock('../../domains/content-intelligence/trend-matching.service.js', () => ({
    trendMatchingService: {
        matchBrandToRecentSignals: vi.fn().mockResolvedValue([]),
        getRecentMatchesForBrand: vi.fn().mockResolvedValue([]),
    },
}));

import { prisma } from '../../db/index.js';
import { aiClient } from '../../lib/ai-client.js';
import { ContentService } from '../../domains/content/content.service.js';
import { trendMatchingService } from '../../domains/content-intelligence/trend-matching.service.js';

const mockBrand = { id: 1, workspaceId: 10, name: 'Acme', profile: { summary: 'CRM', toneGuidelines: {} }, pillars: [{ id: 1, name: 'Sales' }] };
const mockSlot = { id: 1, brandId: 1, channel: 'FACEBOOK', status: 'PLANNED', scheduledFor: new Date(), pillarId: 1, funnelStage: 'Awareness' };
const mockBrief = { id: 1, brandId: 1, title: 'Test Brief', objective: 'Awareness', keyAngle: 'Productivity', callToAction: 'Try now' };

describe('ContentService', () => {
    let service: ContentService;

    beforeEach(() => {
        service = new ContentService();
        vi.clearAllMocks();
        vi.mocked(prisma.brand.findUnique).mockResolvedValue(mockBrand as any);
        vi.mocked(prisma.generationRun.create).mockResolvedValue({ id: 99 } as any);
        vi.mocked(prisma.generationRun.update).mockResolvedValue({} as any);
        vi.mocked(prisma.contentBrief.create).mockResolvedValue(mockBrief as any);
        vi.mocked(prisma.contentDraft.create).mockResolvedValue({ id: 1 } as any);
        vi.mocked(prisma.strategySlot.update).mockResolvedValue({} as any);
    });

    it('creates briefs and drafts for planned slots', async () => {
        vi.mocked(prisma.strategySlot.findMany).mockResolvedValue([mockSlot] as any);
        vi.mocked(aiClient.chat)
            .mockResolvedValueOnce({
                data: {
                    choices: [{ message: { content: JSON.stringify({ title: 'T', objective: 'O', keyAngle: 'K', callToAction: 'C' }) } }],
                    usage: { prompt_tokens: 10, completion_tokens: 20 },
                } as any,
                actualModel: 'gpt-4o-mini',
            })
            .mockResolvedValueOnce({
                data: {
                    choices: [{ message: { content: JSON.stringify({ hook: 'H', body: 'B', cta: 'C', hashtags: ['#test'] }) } }],
                    usage: { prompt_tokens: 10, completion_tokens: 20 },
                } as any,
                actualModel: 'gpt-4o-mini',
            });

        await service.generateDailyContent(1, 3);

        expect(prisma.contentBrief.create).toHaveBeenCalled();
        expect(prisma.contentDraft.create).toHaveBeenCalled();
    });

    it('continues processing when a slot fails', async () => {
        const slot2 = { ...mockSlot, id: 2 };
        vi.mocked(prisma.strategySlot.findMany).mockResolvedValue([mockSlot, slot2] as any);
        vi.mocked(aiClient.chat)
            .mockRejectedValueOnce(new Error('OpenAI error slot 1'))
            .mockResolvedValue({
                data: {
                    choices: [{ message: { content: JSON.stringify({ title: 'T', objective: 'O', keyAngle: 'K', callToAction: 'C' }) } }],
                    usage: { prompt_tokens: 10, completion_tokens: 20 },
                } as any,
                actualModel: 'gpt-4o-mini',
            });

        await expect(service.generateDailyContent(1, 3)).resolves.toBeUndefined();
    });

    it('returns review queue with brief context', async () => {
        vi.mocked(prisma.contentDraft.findMany).mockResolvedValue([{
            id: 1, platform: 'FACEBOOK', status: 'IN_REVIEW',
            hook: 'Hook', body: 'Body', cta: 'CTA', hashtags: ['#test'],
            createdAt: new Date(),
            contentBrief: { title: 'Brief Title', objective: 'Awareness', keyAngle: 'Angle', sourceMetadata: null },
            sourceMetadata: null,
        }] as any);

        const queue = await service.getReviewQueue(1);

        expect(queue).toHaveLength(1);
        expect(queue[0].status).toBe('IN_REVIEW');
        expect(queue[0].brief.title).toBe('Brief Title');
    });

    it('marks generated content as trend-driven and stores trend snippets when matches exist', async () => {
        vi.mocked(prisma.strategySlot.findMany).mockResolvedValue([mockSlot] as any);
        vi.mocked(trendMatchingService.getRecentMatchesForBrand).mockResolvedValue([{
            relevanceScore: 0.92,
            trendSignal: {
                id: 11,
                headline: 'AI CRM trend',
                summary: 'Teams are adopting AI copilots',
                topicTags: ['ai', 'crm'],
                sourceName: 'TechCrunch',
            },
        }] as any);
        vi.mocked(aiClient.chat)
            .mockResolvedValueOnce({
                data: {
                    choices: [{ message: { content: JSON.stringify({ title: 'T', objective: 'O', keyAngle: 'K', callToAction: 'C' }) } }],
                    usage: { prompt_tokens: 10, completion_tokens: 20 },
                } as any,
                actualModel: 'gpt-4o-mini',
            })
            .mockResolvedValueOnce({
                data: {
                    choices: [{ message: { content: JSON.stringify({ hook: 'H', body: 'B', cta: 'C', hashtags: ['#test'] }) } }],
                    usage: { prompt_tokens: 10, completion_tokens: 20 },
                } as any,
                actualModel: 'gpt-4o-mini',
            });

        await service.generateDailyContent(1, 3);

        expect(prisma.contentBrief.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                contentMode: 'trend-driven',
                sourceMetadata: expect.objectContaining({
                    trendSignals: expect.arrayContaining([
                        expect.objectContaining({ id: 11, headline: 'AI CRM trend' }),
                    ]),
                }),
            }),
        }));
        expect(prisma.contentDraft.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                sourceMetadata: expect.objectContaining({
                    trendSignals: expect.arrayContaining([
                        expect.objectContaining({ id: 11, headline: 'AI CRM trend' }),
                    ]),
                }),
            }),
        }));
    });
});
