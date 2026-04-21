import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { traceStore } from '../shared/utils/trace-context.js';

/**
 * Express middleware that reads x-trace-id from the incoming request header
 * (or generates a new UUID) and stores it in AsyncLocalStorage so all
 * downstream code in the same request can access it via getTraceContext().
 *
 * Requirements: 11.1
 */
export function traceContextMiddleware(req: Request, res: Response, next: NextFunction): void {
    const traceId = (req.headers['x-trace-id'] as string | undefined) ?? randomUUID();
    res.setHeader('x-trace-id', traceId);
    // Attach to req for convenience
    (req as Request & { traceId: string }).traceId = traceId;
    traceStore.run({ traceId }, next);
}
