import { rateLimit } from 'express-rate-limit';
import type { Request, Response } from 'express';

const rateLimitHandler = (req: Request, res: Response, _next: unknown, options: { windowMs: number }) => {
    const retryAfter = Math.ceil(options.windowMs / 1000);
    res.setHeader('Retry-After', retryAfter);
    res.status(429).json({
        error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests. Please try again later.',
        },
    });
};

export const googleRateLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitHandler,
});

export const magicLinkRateLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    limit: 3,
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitHandler,
});
