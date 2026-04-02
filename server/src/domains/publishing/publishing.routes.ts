import { Router } from 'express';
import { asyncHandler } from '../../lib/async-handler.js';
import { requireBrandAccess } from '../../middleware/brand-access.js';
import { requireProductAuth } from '../../middleware/product-auth.js';
import { publishingController } from './publishing.controller.js';

export const productBrandPublishingRouter = Router({ mergeParams: true });
productBrandPublishingRouter.get('/publish-jobs', requireBrandAccess('VIEWER'), asyncHandler((req, res, next) =>
    publishingController.listPublishJobs(req, res, next)
));

export const productPublishingRouter = Router();
productPublishingRouter.post('/drafts/:draftId/schedule', requireProductAuth, asyncHandler((req, res, next) =>
    publishingController.scheduleDraft(req, res, next)
));
productPublishingRouter.post('/publish-jobs/:id/retry', requireProductAuth, asyncHandler((req, res, next) =>
    publishingController.retryJob(req, res, next)
));
