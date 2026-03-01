import { db } from '../db/index.js';
import { logger } from '../lib/logger.js';

export interface TraceEntry {
    traceId: string;
    spanId?: string;
    parentSpanId?: string;
    name: string;
    kind?: string;
    startTime: Date;
    endTime?: Date;
    duration?: number;
    statusCode?: number;
    method?: string;
    path?: string;
    attributes?: Record<string, any>;
    events?: Array<Record<string, any>>;
}

/**
 * Service for storing and querying performance traces
 */
export class TraceService {
    /**
     * Store a trace
     */
    async storeTrace(entry: TraceEntry): Promise<void> {
        try {
            await db.performanceTrace.create({
                data: {
                    traceId: entry.traceId,
                    spanId: entry.spanId,
                    parentSpanId: entry.parentSpanId,
                    name: entry.name,
                    kind: entry.kind,
                    startTime: entry.startTime,
                    endTime: entry.endTime,
                    duration: entry.duration,
                    statusCode: entry.statusCode,
                    method: entry.method,
                    path: entry.path,
                    attributes: entry.attributes as any,
                    events: entry.events as any,
                },
            });
        } catch (error) {
            logger.error({ error }, 'Failed to store trace in database');
        }
    }

    /**
     * Get traces
     */
    async getTraces(params: {
        traceId?: string;
        name?: string;
        limit?: number;
        offset?: number;
        startDate?: Date;
        endDate?: Date;
        minDuration?: number;
    }) {
        const { traceId, name, limit = 100, offset = 0, startDate, endDate, minDuration } = params;

        const where: any = {
            ...(traceId && { traceId }),
            ...(name && { name: { contains: name } }),
            ...(minDuration && {
                duration: {
                    gte: minDuration,
                },
            }),
            ...(startDate &&
                endDate && {
                startTime: {
                    gte: startDate,
                    lte: endDate,
                },
            }),
        };

        const [traces, total] = await Promise.all([
            db.performanceTrace.findMany({
                where,
                orderBy: { startTime: 'desc' },
                take: limit,
                skip: offset,
            }),
            db.performanceTrace.count({ where }),
        ]);

        return {
            traces,
            total,
            limit,
            offset,
        };
    }

    /**
     * Get trace by ID with all spans
     */
    async getTraceById(traceId: string) {
        const spans = await db.performanceTrace.findMany({
            where: { traceId },
            orderBy: { startTime: 'asc' },
        });

        if (spans.length === 0) {
            return null;
        }

        return {
            traceId,
            spans,
            startTime: spans[0].startTime,
            endTime: spans[spans.length - 1].endTime,
            totalDuration: spans.reduce((sum: number, span: any) => sum + (span.duration || 0), 0),
        };
    }

    /**
     * Get slow traces
     */
    async getSlowTraces(params: {
        threshold: number;
        limit?: number;
        startDate?: Date;
        endDate?: Date;
    }) {
        const { threshold, limit = 50, startDate, endDate } = params;

        const where: any = {
            duration: {
                gte: threshold,
            },
            ...(startDate &&
                endDate && {
                startTime: {
                    gte: startDate,
                    lte: endDate,
                },
            }),
        };

        const traces = await db.performanceTrace.findMany({
            where,
            orderBy: { duration: 'desc' },
            take: limit,
        });

        return traces;
    }

    /**
     * Get trace statistics
     */
    async getTraceStats(params: { name?: string; startDate?: Date; endDate?: Date }) {
        const { name, startDate, endDate } = params;

        const where: any = {
            ...(name && { name }),
            ...(startDate &&
                endDate && {
                startTime: {
                    gte: startDate,
                    lte: endDate,
                },
            }),
        };

        const traces = await db.performanceTrace.findMany({
            where,
            select: {
                duration: true,
                name: true,
                statusCode: true,
            },
        });

        if (traces.length === 0) {
            return null;
        }

        const durations = traces
            .filter((t: any) => t.duration !== null)
            .map((t: any) => t.duration as number);

        const sum = durations.reduce((acc: number, val: number) => acc + val, 0);
        const avg = sum / durations.length;
        const min = Math.min(...durations);
        const max = Math.max(...durations);

        // Calculate P95 and P99
        const sorted = [...durations].sort((a, b) => a - b);
        const p95Index = Math.floor(sorted.length * 0.95);
        const p99Index = Math.floor(sorted.length * 0.99);
        const p95 = sorted[p95Index];
        const p99 = sorted[p99Index];

        // Count errors
        const errorCount = traces.filter((t: any) => t.statusCode && t.statusCode >= 400).length;

        return {
            count: traces.length,
            avg,
            min,
            max,
            p95,
            p99,
            errorCount,
            errorRate: errorCount / traces.length,
        };
    }

    /**
     * Clean up old traces
     */
    async cleanupOldTraces(daysToKeep: number = 7): Promise<number> {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

        const result = await db.performanceTrace.deleteMany({
            where: {
                startTime: {
                    lt: cutoffDate,
                },
            },
        });

        logger.info(
            { count: result.count, cutoffDate },
            'Cleaned up old traces'
        );

        return result.count;
    }
}

export const traceService = new TraceService();

