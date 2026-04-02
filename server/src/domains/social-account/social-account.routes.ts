import { Router } from 'express';
import { asyncHandler } from '../../lib/async-handler.js';
import { requireBrandAccess } from '../../middleware/brand-access.js';
import { requireProductAuth } from '../../middleware/product-auth.js';
import { socialAccountController } from './social-account.controller.js';

export const productBrandSocialAccountRouter = Router({ mergeParams: true });
productBrandSocialAccountRouter.get('/social-accounts', requireBrandAccess('VIEWER'), asyncHandler((req, res, next) =>
    socialAccountController.listAccounts(req, res, next)
));
productBrandSocialAccountRouter.post('/social-accounts/connect', requireBrandAccess('EDITOR'), asyncHandler((req, res, next) =>
    socialAccountController.connectAccount(req, res, next)
));

export const productSocialAccountRouter = Router();
productSocialAccountRouter.post('/social-accounts/:id/disconnect', requireProductAuth, asyncHandler((req, res, next) =>
    socialAccountController.disconnectAccount(req, res, next)
));
