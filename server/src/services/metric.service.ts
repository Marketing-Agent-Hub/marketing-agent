import { db } from '../db/index.js';
import { logger } from '../lib/logger.js';
import type { MetricType } from '../types/monitoring.js';

export interface MetricEntry {
    name: string;
    type: MetricType;
    value: number;
    unit?: string;
    labels?: Record<string, any>;
    description?: string;
}

/**
 * Service for collecting and storing metrics
 */
export class MetricService {
    private metricsCache: Map<string, number> = new Map();

    /**
     * Record a metric
     */
    async recordMetric(entry: MetricEntry): Promise<void> {
        try {
            // Store in database (async, don't block)
            this.storeMetric(entry).catch((error) => {
                logger.error({ error }, 'Failed to store metric in database');
            });

            // Update cache for quick access
            const cacheKey = `${entry.name}:${JSON.stringify(entry.labels || {})}`;
            this.metricsCache.set(cacheKey, entry.value);
        } catch (error) {
            logger.error({ error }, 'Error in MetricService.recordMetric');
        }
    }

    /**
     * Store metric in database
     */
    private async storeMetric(entry: MetricEntry): Promise<void> {
        try {
            await db.systemMetric.create({
                data: {
                    name: entry.name,
                    type: entry.type,
                    value: entry.value,
                    unit: entry.unit,
                    labels: entry.labels as any,
                    description: entry.description,
                },
            });
        } catch (error) {
            logger.error({ error }, 'Failed to store metric in database');
        }
    }

    /**
     * Increment a counter
     */
    async incrementCounter(name: string, value: number = 1, labels?: Record<string, any>) {
        await this.recordMetric({
            name,
            type: 'COUNTER',
            value,
            labels,
        });
    }

    /**
     * Record a gauge value
     */
    async recordGauge(name: string, value: number, unit?: string, labels?: Record<string, any>) {
        await this.recordMetric({
            name,
            type: 'GAUGE',
            value,
            unit,
            labels,
        });
    }

    /**
     * Record a histogram value (e.g., request duration)
     */
    async recordHistogram(
        name: string,
        value: number,
        unit?: string,
        labels?: Record<string, any>
    ) {
        await this.recordMetric({
            name,
            type: 'HISTOGRAM',
            value,
            unit,
            labels,
        });
    }

    /**
     * Get metrics
     */
    async getMetrics(params: {
        name?: string;
        type?: MetricType;
        limit?: number;
        offset?: number;
        startDate?: Date;
        endDate?: Date;
    }) {
        const { name, type, limit = 100, offset = 0, startDate, endDate } = params;

        const where: any = {
            ...(name && { name }),
            ...(type && { type }),
            ...(startDate &&
                endDate && {
                createdAt: {
                    gte: startDate,
                    lte: endDate,
                },
            }),
        };

        const [metrics, total] = await Promise.all([
            db.systemMetric.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip: offset,
            }),
            db.systemMetric.count({ where }),
        ]);

        return {
            metrics,
            total,
            limit,
            offset,
        };
    }

    /**
     * Get metric statistics
     */
    async getMetricStats(name: string, startDate?: Date, endDate?: Date) {
        const where: any = {
            name,
            ...(startDate &&
                endDate && {
                createdAt: {
                    gte: startDate,
                    lte: endDate,
                },
            }),
        };

        const metrics = await db.systemMetric.findMany({
            where,
            orderBy: { createdAt: 'asc' },
        });

        if (metrics.length === 0) {
            return null;
        }

        const values = metrics.map((m: any) => m.value);
        const sum = values.reduce((acc: number, val: number) => acc + val, 0);
        const avg = sum / values.length;
        const min = Math.min(...values);
        const max = Math.max(...values);

        return {
            name,
            count: metrics.length,
            sum,
            avg,
            min,
            max,
            latest: metrics[metrics.length - 1].value,
            type: metrics[0].type,
            unit: metrics[0].unit,
        };
    }

    /**
     * Get current system metrics
     */
    async getSystemMetrics() {
        const memUsage = process.memoryUsage();
        const uptime = process.uptime();

        return {
            memory: {
                heapUsed: memUsage.heapUsed,
                heapTotal: memUsage.heapTotal,
                external: memUsage.external,
                rss: memUsage.rss,
            },
            uptime,
            nodeVersion: process.version,
            platform: process.platform,
            arch: process.arch,
        };
    }

    /**
     * Clean up old metrics
     */
    async cleanupOldMetrics(daysToKeep: number = 30): Promise<number> {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

        const result = await db.systemMetric.deleteMany({
            where: {
                createdAt: {
                    lt: cutoffDate,
                },
            },
        });

        logger.info(
            { count: result.count, cutoffDate },
            'Cleaned up old metrics'
        );

        return result.count;
    }
}

export const metricService = new MetricService();

