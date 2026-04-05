import { Request, Response, NextFunction } from 'express';
import { ApiErrorResponse } from '../types/index.js';
import { authService, ProductJwtPayload } from '../domains/auth/auth.service.js';

declare module 'express-serve-static-core' {
    interface Request {
        v2User?: ProductJwtPayload;
    }
}

export function requireProductAuth(req: Request, res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        const response: ApiErrorResponse = {
            error: { code: 'UNAUTHORIZED', message: 'Missing or invalid authorization header' },
        };
        res.status(401).json(response);
        return;
    }

    const token = authHeader.substring(7);
    const payload = authService.verifyToken(token);

    if (!payload) {
        const response: ApiErrorResponse = {
            error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        };
        res.status(401).json(response);
        return;
    }

    req.v2User = payload;
    next();
}
