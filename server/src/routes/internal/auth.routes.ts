import { Router } from 'express';
import { authController } from '../../domains/auth/internal-auth.controller.js';
import { requireInternalAuth } from '../../middleware/internal-auth.js';
import { asyncHandler } from '../../lib/async-handler.js';

const router = Router();

router.post(
    '/login',
    asyncHandler((req, res, next) => authController.login(req, res, next))
);

router.get(
    '/me',
    requireInternalAuth,
    (req, res, next) => authController.me(req, res, next)
);

export default router;
