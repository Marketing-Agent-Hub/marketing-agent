import { Request, Response } from 'express';
import { asyncHandler } from '../lib/async-handler.js';
import { db } from '../db/index.js';
import { getItemsSchema, getItemByIdSchema, getReadyItemsSchema, deleteItemsSchema } from '../schemas/item.schema.js';

/**
 * Get items with filtering and pagination
 */
export const getItems = asyncHandler(async (req: Request, res: Response) => {
    const params = getItemsSchema.parse(req.query);
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
                source: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                article: {
                    select: {
                        id: true,
                        mainImageUrl: true,
                        imageList: true,
                    },
                },
                aiResults: {
                    select: {
                        id: true,
                        stage: true,
                        isAllowed: true,
                        importanceScore: true,
                    },
                    orderBy: {
                        createdAt: 'desc',
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
            take: limit,
            skip: offset,
        }),
        db.item.count({ where }),
    ]);

    res.json({
        success: true,
        data: {
            items,
            total,
            limit,
            offset,
        },
    });
});

/**
 * Get item by ID with full details
 */
export const getItemById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = getItemByIdSchema.parse(req.params);

    const item = await db.item.findUnique({
        where: { id },
        include: {
            source: true,
            article: true,
            aiResults: {
                orderBy: {
                    createdAt: 'desc',
                },
            },
        },
    });

    if (!item) {
        res.status(404).json({
            success: false,
            error: 'Item not found',
        });
        return;
    }

    res.json({
        success: true,
        data: item,
    });
});

/**
 * Get ready-to-publish items (AI_STAGE_B_DONE)
 * Returns items with full AI results including fullArticle
 */
export const getReadyItems = asyncHandler(async (req: Request, res: Response) => {
    const params = getReadyItemsSchema.parse(req.query);
    const { limit, offset, sortBy, sourceId, topicTag, fromDate, toDate } = params;

    // Build where clause
    const where: any = {
        status: 'AI_STAGE_B_DONE',
        ...(sourceId && { sourceId }),
    };

    // Date range filter
    if (fromDate || toDate) {
        where.publishedAt = {};
        if (fromDate) where.publishedAt.gte = new Date(fromDate);
        if (toDate) where.publishedAt.lte = new Date(toDate);
    }

    // Topic tag filter (filter in memory after fetching)
    const needsTopicFilter = !!topicTag;

    // Determine sort order
    let orderBy: any = { createdAt: 'desc' }; // Default
    if (sortBy === 'date') {
        orderBy = { publishedAt: 'desc' };
    }
    // For 'importance', we'll sort in memory using AI results

    const [allItems, total] = await Promise.all([
        db.item.findMany({
            where,
            include: {
                source: {
                    select: {
                        id: true,
                        name: true,
                        trustScore: true,
                    },
                },
                article: {
                    select: {
                        id: true,
                        mainImageUrl: true,
                        imageList: true,
                    },
                },
                aiResults: {
                    where: {
                        stage: { in: ['A', 'B'] },
                    },
                    select: {
                        id: true,
                        stage: true,
                        // Stage A fields
                        isAllowed: true,
                        topicTags: true,
                        importanceScore: true,
                        oneLineSummary: true,
                        // Stage B fields
                        fullArticle: true,
                        // Metadata
                        model: true,
                        createdAt: true,
                    },
                    orderBy: {
                        createdAt: 'desc',
                    },
                },
            },
            orderBy: sortBy !== 'importance' ? orderBy : { createdAt: 'desc' },
            // Fetch more if we need to filter by topic
            take: needsTopicFilter ? limit * 3 : limit,
            skip: offset,
        }),
        db.item.count({ where }),
    ]);

    // Filter by topic tag if specified
    let filteredItems = allItems;
    if (needsTopicFilter) {
        filteredItems = allItems.filter(item => {
            const stageA = item.aiResults.find(r => r.stage === 'A');
            return stageA?.topicTags.includes(topicTag!);
        });
    }

    // Sort by importance score if requested
    if (sortBy === 'importance') {
        filteredItems.sort((a, b) => {
            const scoreA = a.aiResults.find(r => r.stage === 'A')?.importanceScore || 0;
            const scoreB = b.aiResults.find(r => r.stage === 'A')?.importanceScore || 0;
            return scoreB - scoreA;
        });
    }

    // Paginate after filtering
    const items = filteredItems.slice(0, limit);

    // Transform to more useful structure
    const transformedItems = items.map(item => {
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
            // Stage A data
            importanceScore: stageA?.importanceScore,
            topicTags: stageA?.topicTags || [],
            oneLineSummary: stageA?.oneLineSummary,
            // Stage B data - Complete Facebook post
            fullArticle: stageB?.fullArticle,
            // Metadata
            aiModel: stageB?.model,
            aiProcessedAt: stageB?.createdAt,
        };
    });

    res.json({
        success: true,
        data: {
            items: transformedItems,
            total: needsTopicFilter ? filteredItems.length : total,
            limit,
            offset,
            sortBy,
        },
    });
});

/**
 * Get items statistics by status
 */
export const getItemsStats = asyncHandler(async (_req: Request, res: Response) => {
    const stats = await db.item.groupBy({
        by: ['status'],
        _count: {
            id: true,
        },
    });

    const statusCounts = stats.reduce((acc, stat) => {
        acc[stat.status] = stat._count.id;
        return acc;
    }, {} as Record<string, number>);

    // Get counts for last 24 hours
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentCount = await db.item.count({
        where: {
            createdAt: {
                gte: last24Hours,
            },
        },
    });

    // Get counts for items with errors/filtered
    const filteredCount = await db.item.count({
        where: {
            status: 'FILTERED_OUT',
        },
    });

    const usedCount = await db.item.count({
        where: {
            status: 'USED',
        },
    });

    res.json({
        success: true,
        data: {
            byStatus: statusCounts,
            recentCount,
            filteredCount,
            usedCount,
            total: stats.reduce((sum, stat) => sum + stat._count.id, 0),
        },
    });
});

/**
 * Delete all items EXCEPT AI_STAGE_B_DONE (ready items)
 * This is more efficient than fetching all IDs and deleting them
 */
export const deleteAllItems = asyncHandler(async (_req: Request, res: Response) => {
    // Delete all items except ready items (cascade will delete related articles and aiResults)
    const result = await db.item.deleteMany({
        where: {
            status: {
                not: "AI_STAGE_B_DONE"
            }
        }
    });

    res.json({
        success: true,
        data: {
            deleted: result.count,
            message: `Successfully deleted ${result.count} item(s) (except ready items)`,
        },
    });
});

/**
 * Delete all ready items
 * This is more efficient than fetching all IDs and deleting them
 */
export const deleteAllReadyItems = asyncHandler(async (_req: Request, res: Response) => {
    const result = await db.item.deleteMany({
        where: {
            status: "AI_STAGE_B_DONE"
        }
    });

    res.json({
        success: true,
        data: {
            deleted: result.count,
            message: `Successfully deleted ${result.count} ready item(s)`,
        },
    });
});

/**
 * Delete multiple items by IDs
 */
export const deleteItems = asyncHandler(async (req: Request, res: Response) => {
    const { ids } = deleteItemsSchema.parse(req.body);

    // Delete items (cascade will delete related articles and aiResults)
    const result = await db.item.deleteMany({
        where: {
            id: {
                in: ids,
            },
        },
    });

    res.json({
        success: true,
        data: {
            deleted: result.count,
            message: `Successfully deleted ${result.count} item(s)`,
        },
    });
});

