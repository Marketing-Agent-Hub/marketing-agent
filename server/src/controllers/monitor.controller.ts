import { Request, Response } from 'express';
import { asyncHandler } from '../lib/async-handler';
import { db } from '../db';
import { logService } from '../services/log.service';
import { metricService } from '../services/metric.service';
import { healthService } from '../services/health.service';
import { traceService } from '../services/trace.service';
import {
    getLogsSchema,
    getMetricsSchema,
    getMetricStatsSchema,
    getTracesSchema,
    getHealthHistorySchema,
} from '../schemas/monitor.schema';

/**
 * Get system logs
 */
export const getLogs = asyncHandler(async (req: Request, res: Response) => {
    const params = getLogsSchema.parse(req.query);
    const result = await logService.getLogs(params);

    res.json({
        success: true,
        data: result,
    });
});

/**
 * Get log statistics
 */
export const getLogStats = asyncHandler(async (req: Request, res: Response) => {
    const { startDate, endDate } = req.query;

    const stats = await logService.getLogStats({
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
    });

    res.json({
        success: true,
        data: stats,
    });
});

/**
 * Get system metrics
 */
export const getMetrics = asyncHandler(async (req: Request, res: Response) => {
    const params = getMetricsSchema.parse(req.query);
    const result = await metricService.getMetrics(params);

    res.json({
        success: true,
        data: result,
    });
});

/**
 * Get metric statistics
 */
export const getMetricStats = asyncHandler(async (req: Request, res: Response) => {
    const params = getMetricStatsSchema.parse(req.query);
    const stats = await metricService.getMetricStats(
        params.name,
        params.startDate,
        params.endDate
    );

    if (!stats) {
        res.status(404).json({
            success: false,
            error: 'Metric not found',
        });
        return;
    }

    res.json({
        success: true,
        data: stats,
    });
});

/**
 * Get current system metrics
 */
export const getSystemMetrics = asyncHandler(async (_req: Request, res: Response) => {
    const metrics = await metricService.getSystemMetrics();

    res.json({
        success: true,
        data: metrics,
    });
});

/**
 * Get health status
 */
export const getHealthStatus = asyncHandler(async (_req: Request, res: Response) => {
    const status = await healthService.getHealthStatus();

    res.json({
        success: true,
        data: status,
    });
});

/**
 * Get health check history
 */
export const getHealthHistory = asyncHandler(async (req: Request, res: Response) => {
    const params = getHealthHistorySchema.parse(req.query);
    const result = await healthService.getHealthHistory(params);

    res.json({
        success: true,
        data: result,
    });
});

/**
 * Get performance traces
 */
export const getTraces = asyncHandler(async (req: Request, res: Response) => {
    const params = getTracesSchema.parse(req.query);
    const result = await traceService.getTraces(params);

    res.json({
        success: true,
        data: result,
    });
});

/**
 * Get trace by ID
 */
export const getTraceById = asyncHandler(async (req: Request, res: Response) => {
    const { traceId } = req.params;
    const trace = await traceService.getTraceById(traceId);

    if (!trace) {
        res.status(404).json({
            success: false,
            error: 'Trace not found',
        });
        return;
    }

    res.json({
        success: true,
        data: trace,
    });
});

/**
 * Get slow traces
 */
export const getSlowTraces = asyncHandler(async (req: Request, res: Response) => {
    const { threshold = 5000, limit = 50, startDate, endDate } = req.query;

    const traces = await traceService.getSlowTraces({
        threshold: Number(threshold),
        limit: Number(limit),
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
    });

    res.json({
        success: true,
        data: traces,
    });
});

/**
 * Get trace statistics
 */
export const getTraceStats = asyncHandler(async (req: Request, res: Response) => {
    const { name, startDate, endDate } = req.query;

    const stats = await traceService.getTraceStats({
        name: name as string | undefined,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
    });

    if (!stats) {
        res.status(404).json({
            success: false,
            error: 'No trace data found',
        });
        return;
    }

    res.json({
        success: true,
        data: stats,
    });
});

/**
 * Get monitoring overview/dashboard data
 */
export const getMonitoringOverview = asyncHandler(async (_req: Request, res: Response) => {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const lastHour = new Date(now.getTime() - 60 * 60 * 1000);

    const [health, logStats, traceStats] = await Promise.all([
        healthService.getHealthStatus(),
        logService.getLogStats({ startDate: last24Hours, endDate: now }),
        traceService.getTraceStats({ startDate: last24Hours, endDate: now }),
    ]);

    // Calculate logs summary
    const totalLogs = logStats.byLevel.reduce((sum, stat) => sum + stat.count, 0);
    const recentErrors = logStats.byLevel
        .filter(stat => stat.level === 'error' || stat.level === 'fatal')
        .reduce((sum, stat) => sum + stat.count, 0);

    // Get metrics counts
    const [totalMetrics, recentMetrics] = await Promise.all([
        db.systemMetric.count({
            where: {
                createdAt: {
                    gte: last24Hours,
                    lte: now,
                },
            },
        }),
        db.systemMetric.count({
            where: {
                createdAt: {
                    gte: lastHour,
                    lte: now,
                },
            },
        }),
    ]);

    // Get slow traces count (> 5000ms)
    const slowTracesCount = await db.performanceTrace.count({
        where: {
            startTime: {
                gte: last24Hours,
                lte: now,
            },
            duration: {
                gt: 5000,
            },
        },
    });

    res.json({
        success: true,
        data: {
            health,
            logs: {
                total: totalLogs,
                byLevel: logStats.byLevel,
                recentErrors,
            },
            metrics: {
                total: totalMetrics,
                recentCount: recentMetrics,
            },
            traces: {
                total: traceStats?.count || 0,
                avgDuration: traceStats?.avg || 0,
                slowCount: slowTracesCount,
            },
            timestamp: now.toISOString(),
        },
    });
});
