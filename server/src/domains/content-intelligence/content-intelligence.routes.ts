import { Router } from 'express';
import { asyncHandler } from '../../lib/async-handler.js';
import { requireBrandAccess } from '../../middleware/brand-access.js';
import { contentIntelligenceController } from './content-intelligence.controller.js';

export const productBrandTrendRouter = Router({ mergeParams: true });
productBrandTrendRouter.get('/trends', requireBrandAccess('VIEWER'), asyncHandler((req, res, next) =>
    contentIntelligenceController.listBrandTrends(req, res, next)
));
productBrandTrendRouter.post('/trends/refresh', requireBrandAccess('EDITOR'), asyncHandler((req, res, next) =>
    contentIntelligenceController.matchBrandTrends(req, res, next)
));
