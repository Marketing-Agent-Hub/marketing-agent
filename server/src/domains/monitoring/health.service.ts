/**
 * Backward-compatibility shim.
 * Delegates to HealthAggregator + individual probes.
 * New code should import HealthAggregator directly.
 */
import { db } from '../../db/index.js';
import { logger } from '../../lib/logger.js';
import { monitorConfig } from '../../config/monitor.config.js';
import { HealthAggregator } from './health-aggregator.js';
import { databaseProbe } from './probes/database.probe.js';
import { externalApiProbe } from './probes/external-api.probe.js';
import { filesystemProbe } from './probes/filesystem.probe.js';

// Re-export types so existing callers don't break
export type { HealthCheckResult } from './health-aggregator.js';

const aggregator = new HealthAggregator([
    databaseProbe,
    externalApiProbe,
    filesystemProbe,
]);

export class HealthService {
    private checkInterval?: NodeJS.Timeout;

    startHealthChecks() {
        if (this.checkInterval) return;
        logger.info('Starting periodic health checks');
        this.runAndStore();
        this.checkInterval = setInterval(() => this.runAndStore(), monitorConfig.healthCheck.interval);
    }

    stopHealthChecks() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = undefined;
            logger.info('Stopped periodic health checks');
        }
    }

    private async runAndStore() {
        const result = await aggregator.aggregate();
        for (const svc of result.services) {
            try {
                await db.healthCheck.create({
                    data: {
                        service: svc.service,
                        // Map OverallStatus back to Prisma HealthStatus enum
                        status: svc.status === 'UP' ? 'HEALTHY' : svc.status === 'DOWN' ? 'UNHEALTHY' : 'DEGRADED',
                        responseTime: svc.responseTime,
                        message: svc.message,
                    },
                });
            } catch (err) {
                logger.error({ err }, 'Failed to store health check');
            }
        }
    }

    /** @deprecated Use HealthAggregator.aggregate() directly */
    async getHealthStatus() {
        return aggregator.aggregate();
    }

    async getHealthHistory(params: {
        service?: string;
        limit?: number;
        offset?: number;
        startDate?: Date;
        endDate?: Date;
    }) {
        const { service, limit = 100, offset = 0, startDate, endDate } = params;
        const where: Record<string, unknown> = {
            ...(service && { service }),
            ...(startDate && endDate && { checkedAt: { gte: startDate, lte: endDate } }),
        };
        const [checks, total] = await Promise.all([
            db.healthCheck.findMany({ where, orderBy: { checkedAt: 'desc' }, take: limit, skip: offset }),
            db.healthCheck.count({ where }),
        ]);
        return { checks, total, limit, offset };
    }

    async cleanupOldHealthChecks(daysToKeep = 7): Promise<number> {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
        const result = await db.healthCheck.deleteMany({ where: { checkedAt: { lt: cutoffDate } } });
        logger.info({ count: result.count, cutoffDate }, 'Cleaned up old health checks');
        return result.count;
    }
}

export const healthService = new HealthService();
