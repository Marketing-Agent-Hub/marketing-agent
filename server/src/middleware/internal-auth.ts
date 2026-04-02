import { NextFunction, Request, Response } from 'express';
import { authService } from '../domains/auth/internal-auth.service.js';
import { ApiErrorResponse } from '../types/index.js';

declare module 'express-serve-static-core' {
    interface Request {
        user?: { email: string };
        internalUser?: { email: string };
    }
}

export function requireInternalAuth(req: Request, res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        const response: ApiErrorResponse = {
            error: {
                code: 'UNAUTHORIZED',
                message: 'Missing or invalid authorization header',
            },
        };
        res.status(401).json(response);
        return;
    }

    const token = authHeader.substring(7);
    const payload = authService.verifyToken(token);

    if (!payload) {
        const response: ApiErrorResponse = {
            error: {
                code: 'UNAUTHORIZED',
                message: 'Invalid or expired token',
            },
        };
        res.status(401).json(response);
        return;
    }

    req.user = { email: payload.email };
    req.internalUser = { email: payload.email };
    next();
}
