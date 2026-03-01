import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Wrapper to allow async route handlers without ESLint warnings
 */
export function asyncHandler(
    fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
): RequestHandler {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

