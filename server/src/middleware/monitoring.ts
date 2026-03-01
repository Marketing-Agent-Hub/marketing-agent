import { Request, Response, NextFunction } from 'express';
import { logService } from '../services/log.service.js';
import { metricService } from '../services/metric.service.js';
import { traceService } from '../services/trace.service.js';
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

        // Log response
        logService.log({
            level: statusCode >= 500 ? 'ERROR' : statusCode >= 400 ? 'WARN' : 'INFO',
            message: `${req.method} ${req.path} ${statusCode} ${duration}ms`,
            service: 'http',
            method: req.method,
            path: req.path,
            statusCode,
            duration,
        });

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

    // Log error
    logService.log({
        level: 'ERROR',
        message: `Error in ${req.method} ${req.path}: ${error.message}`,
        service: 'http',
        method: req.method,
        path: req.path,
        statusCode: 500,
        error: error.message,
        stack: error.stack,
    });

    // Record error metric
    metricService.incrementCounter('http_errors_total', 1, {
        method: req.method,
        path: req.path,
        error: error.name,
    });

    next(error);
}

