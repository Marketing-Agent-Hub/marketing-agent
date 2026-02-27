import { prisma } from '../db';

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

        // Count posts by status
        const postStatusCounts = await prisma.dailyPost.groupBy({
            by: ['status'],
            _count: true,
        });

        const postStatusMap: Record<string, number> = {};
        postStatusCounts.forEach(post => {
            postStatusMap[post.status] = post._count;
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

        // Recent posts (last 7 days)
        const lastWeek = new Date();
        lastWeek.setDate(lastWeek.getDate() - 7);

        const recentPosts = await prisma.dailyPost.count({
            where: {
                createdAt: {
                    gte: lastWeek,
                },
            },
        });

        // Today's posts
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const todayPosts = await prisma.dailyPost.count({
            where: {
                targetDate: {
                    gte: today,
                    lt: tomorrow,
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
            posts: {
                total: Object.values(postStatusMap).reduce((a, b) => a + b, 0),
                byStatus: {
                    DRAFT: postStatusMap['DRAFT'] || 0,
                    APPROVED: postStatusMap['APPROVED'] || 0,
                    REJECTED: postStatusMap['REJECTED'] || 0,
                    POSTED: postStatusMap['POSTED'] || 0,
                },
                recent7days: recentPosts,
                today: todayPosts,
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

        // Recent posts
        const recentPosts = await prisma.dailyPost.findMany({
            take: limit,
            orderBy: { createdAt: 'desc' },
        });

        return {
            items: recentItems.map(item => ({
                id: item.id,
                title: item.title,
                source: item.source.name,
                status: item.status,
                createdAt: item.createdAt,
            })),
            posts: recentPosts.map(post => ({
                id: post.id,
                targetDate: post.targetDate,
                timeSlot: post.timeSlot,
                status: post.status,
                createdAt: post.createdAt,
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
            bottlenecks.push(`${stats.items.byStatus.AI_STAGE_B_DONE} items ready for digest generation`);
        }
        if (stats.posts.byStatus.DRAFT > 30) {
            bottlenecks.push(`${stats.posts.byStatus.DRAFT} draft posts waiting for review`);
        }

        return bottlenecks;
    }
}

export const statsService = new StatsService();
