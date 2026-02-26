import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { JwtPayload, RequestUser, ApiErrorResponse } from '../types';

// Extend Express Request type
declare module 'express-serve-static-core' {
    interface Request {
        user?: RequestUser;
    }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
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

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
        const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
        req.user = {
            email: payload.email,
        };
        next();
    } catch (error) {
        console.error('JWT verification failed:', error);
        const response: ApiErrorResponse = {
            error: {
                code: 'UNAUTHORIZED',
                message: 'Invalid or expired token',
            },
        };
        res.status(401).json(response);
    }
}
