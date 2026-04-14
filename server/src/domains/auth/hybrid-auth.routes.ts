import { Router, Request, Response, NextFunction } from 'express';
import { googleRateLimiter, magicLinkRateLimiter, adminMagicLinkRateLimiter } from '../../middleware/auth-rate-limiter.js';
import { googleOAuthController } from './google-oauth.controller.js';
import { magicLinkController } from './magic-link.controller.js';
import { env } from '../../config/env.js';

const router = Router();

function conditionalAdminRateLimit(req: Request, res: Response, next: NextFunction): void {
    if (req.body?.email === env.ADMIN_EMAIL) {
        adminMagicLinkRateLimiter(req, res, next);
        return;
    }
    next();
}

router.post('/auth/google', googleRateLimiter, googleOAuthController.signIn);
router.post('/auth/magic-link/request', magicLinkRateLimiter, conditionalAdminRateLimit, magicLinkController.request);
router.get('/auth/magic-link/verify', magicLinkController.verify);

export default router;
