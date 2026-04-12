import { Request, Response, NextFunction } from 'express';
import { googleOAuthService } from './google-oauth.service.js';

export class GoogleOAuthController {
    signIn = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { idToken } = req.body;
            if (typeof idToken !== 'string' || !idToken) {
                res.status(400).json({
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'idToken must be a non-empty string',
                    },
                });
                return;
            }
            const result = await googleOAuthService.signInWithGoogle(idToken, req.ip);
            res.json(result);
        } catch (error) {
            next(error);
        }
    };
}

export const googleOAuthController = new GoogleOAuthController();
