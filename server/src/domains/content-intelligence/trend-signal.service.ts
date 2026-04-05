import { ItemStatus } from '@prisma/client';
import { prisma } from '../../db/index.js';

export class TrendSignalService {
    async refreshRecentTrendSignals(limit = 100): Promise<{ scanned: number; upserted: number }> {
        const prismaDynamic = prisma as any;
        const items = await prisma.item.findMany({
            where: {
                status: { in: [ItemStatus.AI_STAGE_A_DONE, ItemStatus.AI_STAGE_B_DONE] },
                aiResults: {
                    some: {
                        stage: 'A',
                        isAllowed: true,
                    },
                },
            },
            take: limit,
            orderBy: [{ publishedAt: 'desc' }, { updatedAt: 'desc' }],
            include: {
                source: { select: { name: true } },
                aiResults: { where: { stage: 'A' }, orderBy: { createdAt: 'desc' }, take: 1 },
            },
        });

        let upserted = 0;

        for (const item of items) {
            const stageA = item.aiResults[0];
            if (!stageA?.isAllowed) {
                continue;
            }

            await prismaDynamic.trendSignal.upsert({
                where: { itemId: item.id },
                create: {
                    itemId: item.id,
                    headline: item.title,
                    summary: stageA.oneLineSummary || item.snippet || item.title,
                    sourceName: item.source.name,
                    canonicalUrl: item.link,
                    publishedAt: item.publishedAt,
                    topicTags: stageA.topicTags,
                    importanceScore: stageA.importanceScore ?? undefined,
                },
                update: {
                    headline: item.title,
                    summary: stageA.oneLineSummary || item.snippet || item.title,
                    sourceName: item.source.name,
                    canonicalUrl: item.link,
                    publishedAt: item.publishedAt,
                    topicTags: stageA.topicTags,
                    importanceScore: stageA.importanceScore ?? undefined,
                },
            });

            upserted++;
        }

        return {
            scanned: items.length,
            upserted,
        };
    }
}

export const trendSignalService = new TrendSignalService();
