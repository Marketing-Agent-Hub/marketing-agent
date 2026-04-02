import { Router } from 'express';
import { asyncHandler } from '../../lib/async-handler.js';
import { requireProductAuth } from '../../middleware/product-auth.js';
import { authController } from './auth.controller.js';

const router = Router();

router.post('/register', asyncHandler((req, res, next) => authController.register(req, res, next)));
router.post('/login', asyncHandler((req, res, next) => authController.login(req, res, next)));
router.get('/me', requireProductAuth, asyncHandler((req, res, next) => authController.getMe(req, res, next)));

export default router;
