import { Router } from 'express';
import { asyncHandler } from '../../lib/async-handler.js';
import { requireWorkspaceAccess } from '../../middleware/workspace-access.js';
import { requireBrandAccess } from '../../middleware/brand-access.js';
import { requireProductAuth } from '../../middleware/product-auth.js';
import { brandController } from './brand.controller.js';

export const workspaceBrandRouter = Router({ mergeParams: true });
workspaceBrandRouter.get('/', requireWorkspaceAccess('VIEWER'), asyncHandler((req, res, next) => brandController.listBrands(req, res, next)));
workspaceBrandRouter.post('/', requireWorkspaceAccess('EDITOR'), asyncHandler((req, res, next) => brandController.createBrand(req, res, next)));

export const directBrandRouter = Router();
directBrandRouter.get('/:brandId', requireProductAuth, asyncHandler((req, res, next) => brandController.getBrand(req, res, next)));
directBrandRouter.patch('/:brandId', requireProductAuth, asyncHandler((req, res, next) => brandController.updateBrand(req, res, next)));
directBrandRouter.post('/:brandId/knowledge-documents', requireProductAuth, requireBrandAccess('EDITOR'), asyncHandler((req, res, next) => brandController.addKnowledgeDocument(req, res, next)));

export default directBrandRouter;
