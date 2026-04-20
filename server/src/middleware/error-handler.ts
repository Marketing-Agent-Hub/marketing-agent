import { Request, Response, NextFunction } from 'express';
import { ApiErrorResponse } from '../types/index.js';
import { ZodError } from 'zod';
import { logger } from '../lib/logger.js';
import { getCurrentTraceContext } from '../lib/telemetry.js';

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
    const statusCode = 'statusCode' in err && typeof err.statusCode === 'number' ? err.statusCode : 500;
    const { traceId, spanId } = getCurrentTraceContext();

    logger.error(
        {
            service: 'http',
            method: req.method,
            path: req.path,
            statusCode,
            traceId,
            spanId,
            err,
        },
        `Error in ${req.method} ${req.path}: ${err.message}`
    );

    // Zod validation errors
    if (err instanceof ZodError) {
        const response: ApiErrorResponse = {
            error: {
                code: 'VALIDATION_ERROR',
                message: 'Validation failed',
                details: err.errors,
            },
        };
        res.status(400).json(response);
        return;
    }

    // Custom API errors
    if ('statusCode' in err && typeof err.statusCode === 'number') {
        const apiError = err as Error & { statusCode: number; code?: string };
        const response: ApiErrorResponse = {
            error: {
                code: (apiError.code as ApiErrorResponse['error']['code']) || 'INTERNAL',
                message: apiError.message,
            },
        };
        res.status(apiError.statusCode).json(response);
        return;
    }

    // Default 500 error
    const response: ApiErrorResponse = {
        error: {
            code: 'INTERNAL',
            message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
        },
    };
    res.status(500).json(response);
}
