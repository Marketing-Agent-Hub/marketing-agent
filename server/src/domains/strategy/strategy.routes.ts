import { Router } from 'express';
import { asyncHandler } from '../../lib/async-handler.js';
import { requireBrandAccess } from '../../middleware/brand-access.js';
import { requireProductAuth } from '../../middleware/product-auth.js';
import { strategyController } from './strategy.controller.js';

export const productBrandStrategyRouter = Router({ mergeParams: true });
productBrandStrategyRouter.post('/generate', requireBrandAccess('EDITOR'), asyncHandler((req, res, next) =>
    strategyController.generateStrategy(req, res, next)
));
productBrandStrategyRouter.get('/', requireBrandAccess('VIEWER'), asyncHandler((req, res, next) =>
    strategyController.listStrategies(req, res, next)
));

export const productStrategyRouter = Router();
productStrategyRouter.get('/:strategyId', requireProductAuth, asyncHandler((req, res, next) =>
    strategyController.getStrategy(req, res, next)
));
productStrategyRouter.post('/:strategyId/activate', requireProductAuth, asyncHandler((req, res, next) =>
    strategyController.activateStrategy(req, res, next)
));
productStrategyRouter.get('/:strategyId/slots', requireProductAuth, asyncHandler((req, res, next) =>
    strategyController.listSlots(req, res, next)
));
