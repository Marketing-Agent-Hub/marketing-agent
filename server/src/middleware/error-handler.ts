import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../lib/logger.js';
import { getCurrentTraceContext } from '../lib/telemetry.js';
import { AppError } from '../shared/errors/app-error.js';

/**
 * Global error handler middleware.
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
 */
export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
    const { traceId, spanId } = getCurrentTraceContext();

    // ── Zod validation errors → 422 ──────────────────────────────────────────
    // Requirements: 7.6
    if (err instanceof ZodError) {
        logger.warn(
            { service: 'http', method: req.method, path: req.path, traceId, spanId },
            `Validation error in ${req.method} ${req.path}`,
        );
        res.status(422).json({
            error: {
                code: 'VALIDATION_ERROR',
                message: 'Validation failed',
                statusCode: 422,
                details: err.errors,
            },
        });
        return;
    }

    // ── AppError subclasses → use their statusCode ────────────────────────────
    // Requirements: 7.2, 7.3
    if (err instanceof AppError) {
        logger.warn(
            {
                service: 'http',
                method: req.method,
                path: req.path,
                statusCode: err.statusCode,
                code: err.code,
                traceId,
                spanId,
            },
            `AppError in ${req.method} ${req.path}: ${err.message}`,
        );
        res.status(err.statusCode).json({
            error: {
                code: err.code,
                message: err.message,
                statusCode: err.statusCode,
            },
        });
        return;
    }

    // ── Legacy duck-typed errors (backward compat during migration) ───────────
    if ('statusCode' in err && typeof (err as any).statusCode === 'number') {
        const apiError = err as Error & { statusCode: number; code?: string };
        logger.warn(
            {
                service: 'http',
                method: req.method,
                path: req.path,
                statusCode: apiError.statusCode,
                traceId,
                spanId,
            },
            `Legacy API error in ${req.method} ${req.path}: ${err.message}`,
        );
        res.status(apiError.statusCode).json({
            error: {
                code: apiError.code ?? 'INTERNAL',
                message: apiError.message,
                statusCode: apiError.statusCode,
            },
        });
        return;
    }

    // ── Unhandled errors → 500 ────────────────────────────────────────────────
    // Requirements: 7.4, 7.5
    logger.error(
        {
            service: 'http',
            method: req.method,
            path: req.path,
            statusCode: 500,
            traceId,
            spanId,
            err,
        },
        `Unhandled error in ${req.method} ${req.path}: ${err.message}`,
    );

    res.status(500).json({
        error: {
            code: 'INTERNAL_ERROR',
            message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
            statusCode: 500,
        },
    });
}
