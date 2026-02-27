import { Router } from 'express';
import { draftController } from '../controllers/draft.controller';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../lib/async-handler';

const router = Router();

// All draft routes require authentication
router.use(requireAuth);

// Get all drafts with optional filters
router.get(
    '/',
    asyncHandler((req, res, next) => draftController.getAllDrafts(req, res, next))
);

// Get draft by ID
router.get(
    '/:id',
    asyncHandler((req, res, next) => draftController.getDraftById(req, res, next))
);

// Update draft content
router.patch(
    '/:id',
    asyncHandler((req, res, next) => draftController.updateDraft(req, res, next))
);

// Approve draft
router.post(
    '/:id/approve',
    asyncHandler((req, res, next) => draftController.approveDraft(req, res, next))
);

// Reject draft
router.post(
    '/:id/reject',
    asyncHandler((req, res, next) => draftController.rejectDraft(req, res, next))
);

export default router;
