import { Router } from 'express';
import { googleRateLimiter, magicLinkRateLimiter } from '../../middleware/auth-rate-limiter.js';
import { googleOAuthController } from './google-oauth.controller.js';
import { magicLinkController } from './magic-link.controller.js';

const router = Router();

router.post('/auth/google', googleRateLimiter, googleOAuthController.signIn);
router.post('/auth/magic-link/request', magicLinkRateLimiter, magicLinkController.request);
router.get('/auth/magic-link/verify', magicLinkController.verify);

export default router;
