import cron, { ScheduledTask } from 'node-cron';
import { logger } from '../lib/logger.js';
import { logService } from '../services/log.service.js';
import { metricService } from '../services/metric.service.js';
import { healthService } from '../services/health.service.js';
import { traceService } from '../services/trace.service.js';
import { monitorConfig } from '../config/monitor.config.js';

let cleanupJob: ScheduledTask | null = null;

/**
 * Job to clean up old monitoring data
 * Runs daily at 2 AM
 */
export function startMonitoringCleanupJob() {
    if (cleanupJob) {
        logger.warn('Monitoring cleanup job already running');
        return;
    }

    logger.info('Starting monitoring cleanup job (runs daily at 2 AM)');

    cleanupJob = cron.schedule('0 2 * * *', async () => {
        try {
            logger.info('Running monitoring data cleanup...');

            const startTime = Date.now();

            // Clean up old logs
            const logsDeleted = await logService.cleanupOldLogs(
                monitorConfig.database.retentionDays
            );

            // Clean up old metrics
            const metricsDeleted = await metricService.cleanupOldMetrics(
                monitorConfig.database.retentionDays
            );

            // Clean up old health checks (keep shorter period)
            const healthChecksDeleted = await healthService.cleanupOldHealthChecks(7);

            // Clean up old traces (keep shorter period)
            const tracesDeleted = await traceService.cleanupOldTraces(7);

            const duration = Date.now() - startTime;

            logger.info({
                duration,
                logsDeleted,
                metricsDeleted,
                healthChecksDeleted,
                tracesDeleted,
            }, 'Monitoring cleanup completed');

        } catch (error) {
            logger.error({ error }, 'Error in monitoring cleanup job');
        }
    });
}

/**
 * Stop the monitoring cleanup job
 */
export function stopMonitoringCleanupJob() {
    if (cleanupJob) {
        cleanupJob.stop();
        cleanupJob = null;
        logger.info('Stopped monitoring cleanup job');
    }
}

