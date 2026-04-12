import { db } from '../../db/index.js';

export class ItemService {
    async getItems(params: {
        status?: string;
        sourceId?: number;
        limit: number;
        offset: number;
        search?: string;
    }) {
        const { status, sourceId, limit, offset, search } = params;

        const where: any = {
            ...(status && { status }),
            ...(sourceId && { sourceId }),
            ...(search && {
                OR: [
                    { title: { contains: search, mode: 'insensitive' } },
                    { link: { contains: search, mode: 'insensitive' } },
                    { snippet: { contains: search, mode: 'insensitive' } },
                ],
            }),
        };

        const [items, total] = await Promise.all([
            db.item.findMany({
                where,
                include: {
                    source: { select: { id: true, name: true } },
                    article: { select: { id: true, mainImageUrl: true, imageList: true } },
                    aiResults: {
                        select: { id: true, stage: true, isAllowed: true, importanceScore: true },
                        orderBy: { createdAt: 'desc' },
                    },
                },
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip: offset,
            }),
            db.item.count({ where }),
        ]);

        return { items, total, limit, offset };
    }

    async getItemById(id: number) {
        return db.item.findUnique({
            where: { id },
            include: {
                source: true,
                article: true,
                aiResults: { orderBy: { createdAt: 'desc' } },
            },
        });
    }

    async getReadyItems(params: {
        limit: number;
        offset: number;
        sortBy: 'importance' | 'date' | 'recent';
        sourceId?: number;
        topicTag?: string;
        fromDate?: string;
        toDate?: string;
    }) {
        const { limit, offset, sortBy, sourceId, topicTag, fromDate, toDate } = params;
        const where: any = {
            status: 'WRITER_DONE',
            ...(sourceId && { sourceId }),
        };

        if (fromDate || toDate) {
            where.publishedAt = {};
            if (fromDate) where.publishedAt.gte = new Date(fromDate);
            if (toDate) where.publishedAt.lte = new Date(toDate);
        }

        const needsTopicFilter = !!topicTag;
        let orderBy: any = { createdAt: 'desc' };
        if (sortBy === 'date') {
            orderBy = { publishedAt: 'desc' };
        }

        const [allItems, total] = await Promise.all([
            db.item.findMany({
                where,
                include: {
                    source: { select: { id: true, name: true, trustScore: true } },
                    article: { select: { id: true, mainImageUrl: true, imageList: true } },
                    aiResults: {
                        where: { stage: { in: ['A', 'B'] } },
                        select: {
                            id: true,
                            stage: true,
                            isAllowed: true,
                            topicTags: true,
                            importanceScore: true,
                            oneLineSummary: true,
                            fullArticle: true,
                            model: true,
                            createdAt: true,
                        },
                        orderBy: { createdAt: 'desc' },
                    },
                },
                orderBy: sortBy !== 'importance' ? orderBy : { createdAt: 'desc' },
                take: needsTopicFilter ? limit * 3 : limit,
                skip: offset,
            }),
            db.item.count({ where }),
        ]);

        let filteredItems = allItems;
        if (needsTopicFilter) {
            filteredItems = allItems.filter(item => {
                const stageA = item.aiResults.find(r => r.stage === 'A');
                return stageA?.topicTags.includes(topicTag!);
            });
        }

        if (sortBy === 'importance') {
            filteredItems.sort((a, b) => {
                const scoreA = a.aiResults.find(r => r.stage === 'A')?.importanceScore || 0;
                const scoreB = b.aiResults.find(r => r.stage === 'A')?.importanceScore || 0;
                return scoreB - scoreA;
            });
        }

        const items = filteredItems.slice(0, limit).map(item => {
            const stageA = item.aiResults.find(r => r.stage === 'A');
            const stageB = item.aiResults.find(r => r.stage === 'B');

            return {
                id: item.id,
                title: item.title,
                link: item.link,
                publishedAt: item.publishedAt,
                createdAt: item.createdAt,
                source: item.source,
                mainImageUrl: item.article?.mainImageUrl,
                imageList: item.article?.imageList || [],
                importanceScore: stageA?.importanceScore,
                topicTags: stageA?.topicTags || [],
                oneLineSummary: stageA?.oneLineSummary,
                fullArticle: stageB?.fullArticle,
                aiModel: stageB?.model,
                aiProcessedAt: stageB?.createdAt,
            };
        });

        return {
            items,
            total: needsTopicFilter ? filteredItems.length : total,
            limit,
            offset,
            sortBy,
        };
    }

    async getItemsStats() {
        const stats = await db.item.groupBy({
            by: ['status'],
            _count: { id: true },
        });

        const statusCounts = stats.reduce((acc, stat) => {
            acc[stat.status] = stat._count.id;
            return acc;
        }, {} as Record<string, number>);

        const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const [recentCount, usedCount] = await Promise.all([
            db.item.count({ where: { createdAt: { gte: last24Hours } } }),
            db.item.count({ where: { status: 'USED' } }),
        ]);

        return {
            byStatus: statusCounts,
            recentCount,
            usedCount,
            total: stats.reduce((sum, stat) => sum + stat._count.id, 0),
        };
    }

    async deleteAllItems() {
        return db.item.deleteMany({
            where: {
                status: { not: 'WRITER_DONE' },
            },
        });
    }

    async deleteAllReadyItems() {
        return db.item.deleteMany({
            where: {
                status: 'WRITER_DONE',
            },
        });
    }

    async deleteItems(ids: number[]) {
        return db.item.deleteMany({
            where: { id: { in: ids } },
        });
    }
}

export const itemService = new ItemService();
