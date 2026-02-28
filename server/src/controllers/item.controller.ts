import { Request, Response } from 'express';
import { asyncHandler } from '../lib/async-handler';
import { db } from '../db';
import { getItemsSchema, getItemByIdSchema } from '../schemas/item.schema';

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
            postItems: {
                include: {
                    post: {
                        select: {
                            id: true,
                            status: true,
                            targetDate: true,
                            timeSlot: true,
                        },
                    },
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

    const rejectedCount = await db.item.count({
        where: {
            status: 'REJECTED',
        },
    });

    res.json({
        success: true,
        data: {
            byStatus: statusCounts,
            recentCount,
            filteredCount,
            rejectedCount,
            total: stats.reduce((sum, stat) => sum + stat._count.id, 0),
        },
    });
});
