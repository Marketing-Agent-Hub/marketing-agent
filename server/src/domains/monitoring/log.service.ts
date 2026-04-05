import { db } from '../../db/index.js';
import { logger } from '../../lib/logger.js';
import { getCurrentTraceContext } from '../../lib/telemetry.js';
import type { LogLevel } from '../../types/monitoring.js';

export interface LogEntry {
    level: LogLevel;
    message: string;
    context?: string;
    service?: string;
    method?: string;
    path?: string;
    statusCode?: number;
    duration?: number;
    userId?: number;
    error?: string;
    stack?: string;
    metadata?: Record<string, any>;
}

/**
 * Service for logging and storing logs in database
 */
export class LogService {
    /**
     * Log a message and store in database
     */
    async log(entry: LogEntry): Promise<void> {
        try {
            const { traceId, spanId } = getCurrentTraceContext();

            // Log to Pino
            const logData = {
                ...entry.metadata,
                context: entry.context,
                service: entry.service,
                method: entry.method,
                path: entry.path,
                statusCode: entry.statusCode,
                duration: entry.duration,
                userId: entry.userId,
                error: entry.error,
                traceId,
                spanId,
            };

            const level = entry.level.toLowerCase() as 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
            logger[level](logData, entry.message);

            // Store in database (async, don't block)
            this.storeLog({
                ...entry,
                traceId,
                spanId,
            }).catch((error) => {
                logger.error({ error }, 'Failed to store log in database');
            });
        } catch (error) {
            logger.error({ error }, 'Error in LogService.log');
        }
    }

    /**
     * Store log in database
     */
    private async storeLog(
        entry: LogEntry & { traceId?: string; spanId?: string }
    ): Promise<void> {
        try {
            await db.systemLog.create({
                data: {
                    level: entry.level,
                    message: entry.message,
                    context: entry.context,
                    service: entry.service,
                    method: entry.method,
                    path: entry.path,
                    statusCode: entry.statusCode,
                    duration: entry.duration,
                    traceId: entry.traceId,
                    spanId: entry.spanId,
                    userId: entry.userId,
                    error: entry.error,
                    stack: entry.stack,
                    metadata: entry.metadata as any,
                },
            });
        } catch (error) {
            // Don't throw, just log to prevent infinite loops
            logger.error({ error }, 'Failed to store log in database');
        }
    }

    /**
     * Get recent logs
     */
    async getLogs(params: {
        level?: LogLevel;
        service?: string;
        limit?: number;
        offset?: number;
        startDate?: Date;
        endDate?: Date;
    }) {
        const { level, service, limit = 100, offset = 0, startDate, endDate } = params;

        const where: any = {
            ...(level && { level }),
            ...(service && { service }),
            ...(startDate &&
                endDate && {
                createdAt: {
                    gte: startDate,
                    lte: endDate,
                },
            }),
        };

        const [logs, total] = await Promise.all([
            db.systemLog.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip: offset,
            }),
            db.systemLog.count({ where }),
        ]);

        return {
            logs,
            total,
            limit,
            offset,
        };
    }

    /**
     * Get log statistics
     */
    async getLogStats(params: { startDate?: Date; endDate?: Date }) {
        const { startDate, endDate } = params;

        const where: any = {
            ...(startDate &&
                endDate && {
                createdAt: {
                    gte: startDate,
                    lte: endDate,
                },
            }),
        };

        const groupByLevel = await db.systemLog.groupBy({
            by: ['level'],
            where,
            _count: {
                id: true,
            },
        });

        const groupByService = await db.systemLog.groupBy({
            by: ['service'],
            where,
            _count: {
                id: true,
            },
        });

        return {
            byLevel: groupByLevel.map((item: any) => ({
                level: item.level,
                count: item._count.id,
            })),
            byService: groupByService.map((item: any) => ({
                service: item.service,
                count: item._count.id,
            })),
        };
    }

    /**
     * Clean up old logs
     */
    async cleanupOldLogs(daysToKeep: number = 30): Promise<number> {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

        const result = await db.systemLog.deleteMany({
            where: {
                createdAt: {
                    lt: cutoffDate,
                },
            },
        });

        logger.info(
            { count: result.count, cutoffDate },
            'Cleaned up old logs'
        );

        return result.count;
    }
}

export const logService = new LogService();
