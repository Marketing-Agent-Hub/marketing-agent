import { Request, Response, NextFunction } from 'express';
import { ApiErrorResponse } from '../types/index.js';
import { ZodError } from 'zod';
import { logger } from '../lib/logger.js';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
    logger.error({ err }, 'Unhandled error');

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
