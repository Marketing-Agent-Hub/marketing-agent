import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ingestSource } from '../domains/content-intelligence/ingest.service.js';
import { processStageA } from '../domains/content-intelligence/ai-stage-a.service.js';
import { trendSignalService } from '../domains/content-intelligence/trend-signal.service.js';
import { trendMatchingService } from '../domains/content-intelligence/trend-matching.service.js';
import { ContentService } from '../domains/content/content.service.js';

const sources = [{
    id: 1,
    name: 'AI News',
    type: 'RSS',
    config: {},
    rssUrl: 'https://example.com/rss',
    enabled: true,
    fetchIntervalMinutes: 15,
    lastFetchedAt: null,
    lastFetchStatus: null,
    itemsCount: 0,
}];

const items: any[] = [];
const aiResults: any[] = [];
const trendSignals: any[] = [];
const brandTrendMatches: any[] = [];

vi.mock('../db/index.js', () => ({
    prisma: {
        source: {
            findUnique: vi.fn(async ({ where }: any) => sources.find(source => source.id === where.id) ?? null),
            findMany: vi.fn(async () => sources.filter(source => source.enabled)),
            update: vi.fn(async ({ where, data }: any) => {
                const source = sources.find(entry => entry.id === where.id);
                if (!source) return null;
                Object.assign(source, data);
                return source;
            }),
        },
        item: {
            create: vi.fn(async ({ data }: any) => {
                const item = {
                    id: items.length + 1,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    snippet: null,
                    publishedAt: null,
                    filterReason: null,
                    ...data,
                };
                items.push(item);
                return item;
            }),
            findUnique: vi.fn(async ({ where, include }: any) => {
                const item = items.find(entry => entry.id === where.id);
                if (!item) return null;
                if (!include) return item;
                return {
                    ...item,
                    source: include.source ? { name: 'AI News' } : undefined,
                    article: include.article ? { truncatedContent: item.snippet ?? item.title } : undefined,
                    aiResults: include.aiResults
                        ? aiResults
                            .filter(result => result.itemId === item.id && (!include.aiResults.where?.stage || result.stage === include.aiResults.where.stage))
                            .slice(0, include.aiResults.take ?? aiResults.length)
                        : undefined,
                };
            }),
            findMany: vi.fn(async ({ where, take, include }: any) => {
                let result = [...items];
                if (where?.status?.in) {
                    result = result.filter(item => where.status.in.includes(item.status));
                } else if (where?.status) {
                    result = result.filter(item => item.status === where.status);
                }
                if (include?.source || include?.aiResults) {
                    result = result.map(item => ({
                        ...item,
                        source: { name: 'AI News' },
                        aiResults: aiResults
                            .filter(ai => ai.itemId === item.id && (!include.aiResults?.where?.stage || ai.stage === include.aiResults.where.stage))
                            .slice(0, include.aiResults?.take ?? aiResults.length),
                    }));
                } else if (where?.status === 'READY_FOR_AI' || where?.status === 'AI_STAGE_A_DONE') {
                    result = result.map(item => ({ id: item.id }));
                }
                return typeof take === 'number' ? result.slice(0, take) : result;
            }),
            update: vi.fn(async ({ where, data }: any) => {
                const item = items.find(entry => entry.id === where.id);
                if (!item) return null;
                Object.assign(item, data);
                return item;
            }),
        },
        aiResult: {
            create: vi.fn(async ({ data }: any) => {
                const result = {
                    id: aiResults.length + 1,
                    createdAt: new Date(),
                    ...data,
                };
                aiResults.push(result);
                return result;
            }),
            findFirst: vi.fn(async () => null),
        },
        brand: {
            findUnique: vi.fn(async ({ where, include }: any) => {
                if (where.id !== 7) return null;
                return {
                    id: 7,
                    workspaceId: 99,
                    name: 'AI Copilot CRM',
                    industry: 'AI CRM',
                    profile: include?.profile ? { summary: 'AI CRM for sales teams', toneGuidelines: {} } : undefined,
                    pillars: include?.pillars ? [{ id: 3, name: 'AI CRM', description: 'AI copilots for CRM teams' }] : undefined,
                };
            }),
        },
        strategySlot: {
            findMany: vi.fn(async () => ([{
                id: 21,
                brandId: 7,
                channel: 'FACEBOOK',
                status: 'PLANNED',
                scheduledFor: new Date(),
                pillarId: 3,
                funnelStage: 'Awareness',
            }])),
            update: vi.fn(async () => ({})),
        },
        contentBrief: {
            create: vi.fn(async ({ data }: any) => ({ id: 501, ...data })),
        },
        contentDraft: {
            create: vi.fn(async ({ data }: any) => ({ id: 601, ...data })),
        },
        generationRun: {
            create: vi.fn(async () => ({ id: 801 })),
            update: vi.fn(async () => ({})),
        },
        trendSignal: {
            upsert: vi.fn(async ({ where, create, update }: any) => {
                const existing = trendSignals.find(signal => signal.itemId === where.itemId);
                if (existing) {
                    Object.assign(existing, update);
                    return existing;
                }
                const signal = { id: trendSignals.length + 1, createdAt: new Date(), matchedAt: new Date(), ...create };
                trendSignals.push(signal);
                return signal;
            }),
            findMany: vi.fn(async () => [...trendSignals]),
        },
        brandTrendMatch: {
            upsert: vi.fn(async ({ where, create, update }: any) => {
                const existing = brandTrendMatches.find(match =>
                    match.brandId === where.brandId_trendSignalId.brandId &&
                    match.trendSignalId === where.brandId_trendSignalId.trendSignalId
                );
                if (existing) {
                    Object.assign(existing, update);
                    return existing;
                }
                const match = { id: brandTrendMatches.length + 1, matchedAt: new Date(), ...create };
                brandTrendMatches.push(match);
                return match;
            }),
            findMany: vi.fn(async ({ where, take }: any) => brandTrendMatches
                .filter(match => match.brandId === where.brandId)
                .slice(0, take ?? brandTrendMatches.length)
                .map(match => ({
                    ...match,
                    trendSignal: trendSignals.find(signal => signal.id === match.trendSignalId),
                }))),
        },
    },
    db: {
        item: {
            findMany: vi.fn(),
            count: vi.fn(),
            findUnique: vi.fn(),
            deleteMany: vi.fn(),
        },
    },
}));

vi.mock('../lib/plugins/plugin-registry.js', () => ({
    getPlugin: vi.fn(() => ({
        validateConfig: vi.fn(() => true),
        fetch: vi.fn(async () => [{ raw: 'rss-item' }]),
        parse: vi.fn(async (_raw: any, source: any) => ([{
            sourceId: source.id,
            guid: 'trend-1',
            title: 'AI CRM trend for sales teams',
            link: 'https://example.com/ai-crm-trend',
            snippet: 'AI CRM copilots are trending among sales teams',
            contentHash: 'hash-trend-1',
            publishedAt: new Date(),
        }])),
    })),
}));

vi.mock('../config/ai.config.js', () => ({
    openai: { chat: { completions: { create: vi.fn() } } },
    AI_CONFIG: {
        STAGE_A_MODEL: 'gpt-4o-mini',
        STAGE_B_MODEL: 'gpt-4o',
    },
}));

vi.mock('../shared/marketing/settings.js', () => ({
    getAIModel: vi.fn(async () => 'gpt-4o-mini'),
}));

vi.mock('../domains/monitoring/metric.service.js', () => ({
    metricService: {
        incrementCounter: vi.fn(async () => undefined),
        recordHistogram: vi.fn(async () => undefined),
    },
}));

vi.mock('../lib/logger.js', () => ({
    logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

import { openai } from '../config/ai.config.js';
import { prisma } from '../db/index.js';

describe('Unified content intelligence flow', () => {
    beforeEach(() => {
        items.length = 0;
        aiResults.length = 0;
        trendSignals.length = 0;
        brandTrendMatches.length = 0;
        vi.clearAllMocks();
    });

    it('runs ingest -> trend signal -> content generation with trend context', async () => {
        vi.mocked(openai.chat.completions.create)
            .mockResolvedValueOnce({
                choices: [{
                    message: {
                        content: JSON.stringify({
                            title: 'Trend Brief',
                            objective: 'Build awareness',
                            keyAngle: 'AI CRM momentum',
                            callToAction: 'Learn more',
                        })
                    }
                }],
                usage: { prompt_tokens: 10, completion_tokens: 20 },
            } as any)
            .mockResolvedValueOnce({
                choices: [{
                    message: {
                        content: JSON.stringify({
                            hook: 'AI CRM is accelerating',
                            body: 'Sales teams are adopting copilots faster than expected.',
                            cta: 'See what this means',
                            hashtags: ['#AI', '#CRM'],
                        })
                    }
                }],
                usage: { prompt_tokens: 10, completion_tokens: 20 },
            } as any);

        const ingestResult = await ingestSource(1);
        expect(ingestResult.success).toBe(true);
        expect(items).toHaveLength(1);

        await prisma.item.update({
            where: { id: items[0].id },
            data: { status: 'READY_FOR_AI' },
        } as any);

        const stageAResult = await processStageA(items[0].id);
        expect(stageAResult.success).toBe(true);

        const refreshResult = await trendSignalService.refreshRecentTrendSignals();
        expect(refreshResult.upserted).toBe(1);

        const matched = await trendMatchingService.matchBrandToRecentSignals(7);
        expect(matched).toBe(1);

        const contentService = new ContentService();
        await contentService.generateDailyContent(7, 3);

        expect(prisma.contentBrief.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                contentMode: 'trend-driven',
                sourceMetadata: expect.objectContaining({
                    trendSignals: expect.arrayContaining([
                        expect.objectContaining({
                            headline: 'AI CRM trend for sales teams',
                        }),
                    ]),
                }),
            }),
        }));
        expect(prisma.contentDraft.create).toHaveBeenCalled();
    });
});
