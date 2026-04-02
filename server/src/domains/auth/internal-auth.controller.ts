import { Request, Response, NextFunction } from 'express';
import { authService } from './internal-auth.service.js';
import { loginSchema } from './internal-auth.schema.js';
import { ApiErrorResponse } from '../../types/index.js';

export class AuthController {
    /**
     * POST /auth/login
     */
    async login(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const input = loginSchema.parse(req.body);
            const result = await authService.login(input.email, input.password);

            if (!result) {
                const response: ApiErrorResponse = {
                    error: {
                        code: 'UNAUTHORIZED',
                        message: 'Invalid email or password',
                    },
                };
                res.status(401).json(response);
                return;
            }

            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /auth/me
     */
    me(req: Request, res: Response, _next: NextFunction): void {
        if (!req.user) {
            const response: ApiErrorResponse = {
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Not authenticated',
                },
            };
            res.status(401).json(response);
            return;
        }

        res.json({ email: req.user.email });
    }
}

export const authController = new AuthController();
