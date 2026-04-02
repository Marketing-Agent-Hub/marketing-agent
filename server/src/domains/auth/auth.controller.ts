import { Request, Response, NextFunction } from 'express';
import { loginSchema, registerSchema } from '../../shared/marketing/schemas/auth.schema.js';
import { authService } from './auth.service.js';

export class AuthController {
    async register(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const input = registerSchema.parse(req.body);
            const result = await authService.register(input);
            res.status(201).json(result);
        } catch (error) {
            next(error);
        }
    }

    async login(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const input = loginSchema.parse(req.body);
            const result = await authService.login(input);
            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const user = await authService.getMe(req.v2User!.userId);
            res.json(user);
        } catch (error) {
            next(error);
        }
    }
}

export const authController = new AuthController();
