import { logger } from '../lib/logger.js';
import { logService } from '../domains/monitoring/log.service.js';
import { metricService } from '../domains/monitoring/metric.service.js';
import { withSpan } from '../lib/telemetry.js';

/**
 * Wrap a job function with monitoring and error logging
 */
export async function withJobMonitoring<T>(
    jobName: string,
    fn: () => Promise<T>
): Promise<T> {
    const startTime = Date.now();

    logger.info({ job: jobName }, `[${jobName}] Starting...`);

    // Record job start metric
    await metricService.incrementCounter('job_started_total', 1, { job: jobName });

    try {
        // Execute with tracing
        const result = await withSpan(`job:${jobName}`, async (span) => {
            span.setAttribute('job.name', jobName);
            return await fn();
        });

        const duration = Date.now() - startTime;

        logger.info(
            { job: jobName, duration },
            `[${jobName}] Completed successfully in ${duration}ms`
        );

        // Record success metrics
        await metricService.incrementCounter('job_completed_total', 1, {
            job: jobName,
            status: 'success'
        });
        await metricService.recordHistogram('job_duration_ms', duration, 'ms', {
            job: jobName
        });

        return result;
    } catch (error) {
        const duration = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;

        // Log error to monitoring system
        await logService.log({
            level: 'ERROR',
            message: `[${jobName}] Job failed: ${errorMessage}`,
            service: 'job',
            context: jobName,
            duration,
            error: errorMessage,
            stack: errorStack,
        });

        logger.error(
            { job: jobName, duration, error: errorMessage, stack: errorStack },
            `[${jobName}] Failed after ${duration}ms`
        );

        // Record failure metric
        await metricService.incrementCounter('job_completed_total', 1, {
            job: jobName,
            status: 'error'
        });

        throw error;
    }
}

/**
 * Log an error that occurred during processing
 */
export async function logProcessingError(
    context: string,
    message: string,
    error: unknown,
    metadata?: Record<string, any>
) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    await logService.log({
        level: 'ERROR',
        message: `[${context}] ${message}: ${errorMessage}`,
        service: context,
        context,
        error: errorMessage,
        stack: errorStack,
        metadata,
    });

    logger.error(
        { context, error: errorMessage, stack: errorStack, ...metadata },
        `[${context}] ${message}`
    );
}

/**
 * Log info message with monitoring
 */
export async function logInfo(
    context: string,
    message: string,
    metadata?: Record<string, any>
) {
    await logService.log({
        level: 'INFO',
        message: `[${context}] ${message}`,
        service: context,
        context,
        metadata,
    });

    logger.info({ context, ...metadata }, `[${context}] ${message}`);
}

/**
 * Log warning message with monitoring
 */
export async function logWarning(
    context: string,
    message: string,
    metadata?: Record<string, any>
) {
    await logService.log({
        level: 'WARN',
        message: `[${context}] ${message}`,
        service: context,
        context,
        metadata,
    });

    logger.warn({ context, ...metadata }, `[${context}] ${message}`);
}

