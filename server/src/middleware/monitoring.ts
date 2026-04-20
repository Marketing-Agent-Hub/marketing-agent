import { Request, Response, NextFunction } from 'express';
import { metricService } from '../domains/monitoring/metric.service.js';
import { traceService } from '../domains/monitoring/trace.service.js';
import { getCurrentTraceContext } from '../lib/telemetry.js';
import { logger } from '../lib/logger.js';

/**
 * Request logging and monitoring middleware
 */
export function requestMonitoring(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    const startDate = new Date();

    // Get trace context
    const { traceId, spanId } = getCurrentTraceContext();

    // Log incoming request
    logger.info(
        {
            method: req.method,
            path: req.path,
            query: req.query,
            traceId,
            spanId,
        },
        `Incoming request: ${req.method} ${req.path}`
    );

    // Increment request counter
    metricService.incrementCounter('http_requests_total', 1, {
        method: req.method,
        path: req.path,
    });

    // Listen for response finish
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        const statusCode = res.statusCode;

        // Log response only if not already logged as error by errorMonitoring
        if (!req.errorLogged && statusCode >= 500) {
            logger.error(
                {
                    service: 'http',
                    method: req.method,
                    path: req.path,
                    statusCode,
                    duration,
                    traceId,
                    spanId,
                },
                `${req.method} ${req.path} ${statusCode} ${duration}ms`
            );
        } else if (statusCode < 500) {
            logger.info(
                {
                    service: 'http',
                    method: req.method,
                    path: req.path,
                    statusCode,
                    duration,
                    traceId,
                    spanId,
                },
                `${req.method} ${req.path} ${statusCode} ${duration}ms`
            );
        }

        // Record metrics
        metricService.recordHistogram('http_request_duration_ms', duration, 'ms', {
            method: req.method,
            path: req.path,
            status: statusCode,
        });

        metricService.incrementCounter('http_responses_total', 1, {
            method: req.method,
            path: req.path,
            status: statusCode,
        });

        // Store trace if trace context exists
        if (traceId) {
            traceService.storeTrace({
                traceId,
                spanId,
                name: `${req.method} ${req.path}`,
                kind: 'server',
                startTime: startDate,
                endTime: new Date(),
                duration,
                statusCode,
                method: req.method,
                path: req.path,
                attributes: {
                    'http.method': req.method,
                    'http.url': req.path,
                    'http.status_code': statusCode,
                    'http.user_agent': req.get('user-agent'),
                },
            });
        }
    });

    next();
}

/**
 * Error monitoring middleware
 */
export function errorMonitoring(
    error: Error,
    req: Request,
    res: Response,
    next: NextFunction
) {
    const { traceId, spanId } = getCurrentTraceContext();

    // Mark that error has been logged to prevent duplicate logging in requestMonitoring
    req.errorLogged = true;

    logger.error(
        {
            service: 'http',
            method: req.method,
            path: req.path,
            statusCode: 500,
            error: error.message,
            stack: error.stack,
            traceId,
            spanId,
        },
        `Error in ${req.method} ${req.path}: ${error.message}`
    );

    // Record error metric
    metricService.incrementCounter('http_errors_total', 1, {
        method: req.method,
        path: req.path,
        error: error.name,
    });

    next(error);
}

