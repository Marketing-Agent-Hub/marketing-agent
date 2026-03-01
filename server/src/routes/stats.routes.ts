import { Router } from 'express';
import { statsController } from '../controllers/stats.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../lib/async-handler.js';

const router = Router();

// All stats routes require authentication
router.use(requireAuth);

// Get pipeline statistics
router.get(
    '/pipeline',
    asyncHandler((req, res, next) => statsController.getPipelineStats(req, res, next))
);

// Get recent activity
router.get(
    '/activity',
    asyncHandler((req, res, next) => statsController.getRecentActivity(req, res, next))
);

// Get bottlenecks
router.get(
    '/bottlenecks',
    asyncHandler((req, res, next) => statsController.getBottlenecks(req, res, next))
);

export default router;

