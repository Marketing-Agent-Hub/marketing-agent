import { Request, Response, NextFunction } from 'express';
import { metricService } from '../domains/monitoring/metric.service.js';
import { traceService } from '../domains/monitoring/trace.service.js';
import { getCurrentTraceContext } from '../lib/telemetry.js';

/**
 * Request monitoring middleware (metrics + traces only)
 */
export function requestMonitoring(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    const startDate = new Date();

    // Get trace context
    const { traceId, spanId } = getCurrentTraceContext();

    // Increment request counter
    metricService.incrementCounter('http_requests_total', 1, {
        method: req.method,
        path: req.path,
    });

    // Listen for response finish
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        const statusCode = res.statusCode;

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
    _error: Error,
    req: Request,
    _res: Response,
    next: NextFunction
) {
    // Record error metric
    metricService.incrementCounter('http_errors_total', 1, {
        method: req.method,
        path: req.path,
        error: _error.name,
    });

    next(_error);
}

