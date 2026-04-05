import { Router } from 'express';
import { asyncHandler } from '../../lib/async-handler.js';
import { requireBrandAccess } from '../../middleware/brand-access.js';
import { requireProductAuth } from '../../middleware/product-auth.js';
import { contentController } from './content.controller.js';

export const productBrandContentRouter = Router({ mergeParams: true });
productBrandContentRouter.post('/generate-daily', requireBrandAccess('EDITOR'), asyncHandler((req, res, next) =>
    contentController.generateDailyContent(req, res, next)
));
productBrandContentRouter.get('/briefs', requireBrandAccess('VIEWER'), asyncHandler((req, res, next) =>
    contentController.listBriefs(req, res, next)
));
productBrandContentRouter.get('/review-queue', requireBrandAccess('VIEWER'), asyncHandler((req, res, next) =>
    contentController.getReviewQueue(req, res, next)
));

export const productContentRouter = Router();
productContentRouter.get('/briefs/:briefId', requireProductAuth, asyncHandler((req, res, next) =>
    contentController.getBrief(req, res, next)
));
productContentRouter.post('/briefs/:briefId/drafts/regenerate', requireProductAuth, asyncHandler((req, res, next) =>
    contentController.regenerateDrafts(req, res, next)
));
productContentRouter.patch('/drafts/:draftId', requireProductAuth, asyncHandler((req, res, next) =>
    contentController.editDraft(req, res, next)
));
productContentRouter.post('/drafts/:draftId/approve', requireProductAuth, asyncHandler((req, res, next) =>
    contentController.approveDraft(req, res, next)
));
productContentRouter.post('/drafts/:draftId/reject', requireProductAuth, asyncHandler((req, res, next) =>
    contentController.rejectDraft(req, res, next)
));
