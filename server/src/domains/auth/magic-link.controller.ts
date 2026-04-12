import { Request, Response, NextFunction } from 'express';
import { magicLinkService } from './magic-link.service.js';

export class MagicLinkController {
    request = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { email } = req.body;
            if (typeof email !== 'string' || !email) {
                res.status(400).json({
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'email must be a non-empty string',
                    },
                });
                return;
            }
            await magicLinkService.requestMagicLink(email, req.ip);
            res.status(200).json({ message: 'Email sent if account exists' });
        } catch (error) {
            next(error);
        }
    };

    verify = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { token } = req.query;
            if (typeof token !== 'string' || !token) {
                res.status(400).json({
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'token must be a non-empty string',
                    },
                });
                return;
            }
            const result = await magicLinkService.verifyMagicLink(token, req.ip);
            res.json(result);
        } catch (error) {
            next(error);
        }
    };
}

export const magicLinkController = new MagicLinkController();
