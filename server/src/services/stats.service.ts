import { prisma } from '../db/index.js';

export class StatsService {
    /**
     * Get pipeline statistics
     */
    async getPipelineStats() {
        // Count items by status
        const itemStatusCounts = await prisma.item.groupBy({
            by: ['status'],
            _count: true,
        });

        const statusMap: Record<string, number> = {};
        itemStatusCounts.forEach(item => {
            statusMap[item.status] = item._count;
        });

        // Count sources
        const totalSources = await prisma.source.count();
        const enabledSources = await prisma.source.count({
            where: { enabled: true },
        });

        // Recent items (last 24h)
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        const recentItems = await prisma.item.count({
            where: {
                createdAt: {
                    gte: yesterday,
                },
            },
        });

        return {
            items: {
                total: Object.values(statusMap).reduce((a, b) => a + b, 0),
                byStatus: {
                    NEW: statusMap['NEW'] || 0,
                    EXTRACTED: statusMap['EXTRACTED'] || 0,
                    FILTERED_OUT: statusMap['FILTERED_OUT'] || 0,
                    READY_FOR_AI: statusMap['READY_FOR_AI'] || 0,
                    AI_STAGE_A_DONE: statusMap['AI_STAGE_A_DONE'] || 0,
                    AI_STAGE_B_DONE: statusMap['AI_STAGE_B_DONE'] || 0,
                    USED_IN_POST: statusMap['USED_IN_POST'] || 0,
                    REJECTED: statusMap['REJECTED'] || 0,
                },
                recent24h: recentItems,
            },
            sources: {
                total: totalSources,
                enabled: enabledSources,
                disabled: totalSources - enabledSources,
            },
        };
    }

    /**
     * Get recent activity
     */
    async getRecentActivity(limit = 10) {
        // Recent items
        const recentItems = await prisma.item.findMany({
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
                source: {
                    select: { name: true },
                },
            },
        });

        return {
            items: recentItems.map(item => ({
                id: item.id,
                title: item.title,
                source: item.source.name,
                status: item.status,
                createdAt: item.createdAt,
            })),
        };
    }

    /**
     * Get pipeline bottlenecks
     */
    async getBottlenecks() {
        const stats = await this.getPipelineStats();
        const bottlenecks: string[] = [];

        // Check for bottlenecks
        if (stats.items.byStatus.NEW > 50) {
            bottlenecks.push(`${stats.items.byStatus.NEW} items waiting for extraction`);
        }
        if (stats.items.byStatus.EXTRACTED > 50) {
            bottlenecks.push(`${stats.items.byStatus.EXTRACTED} items waiting for filtering`);
        }
        if (stats.items.byStatus.READY_FOR_AI > 30) {
            bottlenecks.push(`${stats.items.byStatus.READY_FOR_AI} items waiting for AI Stage A`);
        }
        if (stats.items.byStatus.AI_STAGE_A_DONE > 20) {
            bottlenecks.push(`${stats.items.byStatus.AI_STAGE_A_DONE} items waiting for AI Stage B`);
        }
        if (stats.items.byStatus.AI_STAGE_B_DONE > 15) {
            bottlenecks.push(`${stats.items.byStatus.AI_STAGE_B_DONE} items completed AI processing`);
        }

        return bottlenecks;
    }
}

export const statsService = new StatsService();

