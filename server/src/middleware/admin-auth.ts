import { Request, Response, NextFunction } from 'express';
import { authService } from '../domains/auth/auth.service.js';
import { ApiErrorResponse } from '../types/index.js';

export function requireAdminAuth(req: Request, res: Response, next: NextFunction): void {
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

    if (payload.systemRole !== 'ADMIN') {
        const response: ApiErrorResponse = {
            error: { code: 'FORBIDDEN', message: 'Admin access required' },
        };
        res.status(403).json(response);
        return;
    }

    req.v2User = payload;
    next();
}
