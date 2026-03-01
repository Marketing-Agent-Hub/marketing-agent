import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../lib/async-handler.js';

const router = Router();

// Public routes
router.post(
    '/login',
    asyncHandler((req, res, next) => authController.login(req, res, next))
);

// Protected routes
router.get('/me', requireAuth, (req, res, next) => authController.me(req, res, next));

export default router;

