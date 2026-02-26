import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../lib/async-handler';

const router = Router();

// Public routes
router.post(
    '/login',
    asyncHandler((req, res, next) => authController.login(req, res, next))
);

// Protected routes
router.get('/me', requireAuth, (req, res, next) => authController.me(req, res, next));

export default router;
