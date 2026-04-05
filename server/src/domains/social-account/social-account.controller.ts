import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ApiErrorResponse } from '../../types/index.js';
import { socialAccountService } from './social-account.service.js';

const connectAccountSchema = z.object({
    platform: z.enum(['X', 'FACEBOOK', 'LINKEDIN', 'TIKTOK', 'INSTAGRAM']),
    accountName: z.string().min(1),
    accessToken: z.string().optional(),
    refreshToken: z.string().optional(),
    expiresAt: z.string().datetime().optional(),
});

export class SocialAccountController {
    async connectAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const brandId = parseInt(req.params.brandId, 10);
            const input = connectAccountSchema.parse(req.body);
            const account = await socialAccountService.connectAccount(brandId, {
                ...input,
                expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
            } as any);
            res.status(201).json(account);
        } catch (error) {
            next(error);
        }
    }

    async listAccounts(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const accounts = await socialAccountService.listAccounts(parseInt(req.params.brandId, 10));
            res.json({ accounts });
        } catch (error) {
            next(error);
        }
    }

    async disconnectAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const accountId = parseInt(req.params.id, 10);
            if (isNaN(accountId)) {
                const r: ApiErrorResponse = { error: { code: 'VALIDATION_ERROR', message: 'Invalid account ID' } };
                res.status(400).json(r);
                return;
            }
            const account = await socialAccountService.disconnectAccount(accountId);
            res.json(account);
        } catch (error) {
            next(error);
        }
    }
}

export const socialAccountController = new SocialAccountController();
