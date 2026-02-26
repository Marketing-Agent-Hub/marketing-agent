import { Router } from 'express';
import { sourceController } from '../controllers/source.controller';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../lib/async-handler';

const router = Router();

// All source routes require authentication
router.use(requireAuth);

// Validate RSS endpoint (must be before /:id to avoid conflict)
router.post(
    '/validate',
    asyncHandler((req, res, next) => sourceController.validateRSS(req, res, next))
);

// CRUD endpoints
router.get(
    '/',
    asyncHandler((req, res, next) => sourceController.getAllSources(req, res, next))
);
router.get(
    '/:id',
    asyncHandler((req, res, next) => sourceController.getSourceById(req, res, next))
);
router.post(
    '/',
    asyncHandler((req, res, next) => sourceController.createSource(req, res, next))
);
router.patch(
    '/:id',
    asyncHandler((req, res, next) => sourceController.updateSource(req, res, next))
);
router.delete(
    '/:id',
    asyncHandler((req, res, next) => sourceController.deleteSource(req, res, next))
);

export default router;
