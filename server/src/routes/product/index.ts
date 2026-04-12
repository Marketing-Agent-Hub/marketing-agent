import { Router } from 'express';
import authRoutes from '../../domains/auth/auth.routes.js';
import hybridAuthRoutes from '../../domains/auth/hybrid-auth.routes.js';
import workspaceRoutes from '../../domains/workspace/workspace.routes.js';
import { workspaceBrandRouter, directBrandRouter } from '../../domains/brand/brand.routes.js';
import onboardingRoutes from '../../domains/onboarding/onboarding.routes.js';
import { productStrategyRouter, productBrandStrategyRouter } from '../../domains/strategy/strategy.routes.js';
import { productContentRouter, productBrandContentRouter } from '../../domains/content/content.routes.js';
import { productPublishingRouter, productBrandPublishingRouter } from '../../domains/publishing/publishing.routes.js';
import { productSocialAccountRouter, productBrandSocialAccountRouter } from '../../domains/social-account/social-account.routes.js';
import { productBrandTrendRouter } from '../../domains/content-intelligence/content-intelligence.routes.js';
import brandSourceRoutes from '../../domains/content-intelligence/brand-source.routes.js';
import filterProfileRoutes from '../../domains/content-intelligence/filter-profile.routes.js';
import jobScheduleRoutes from '../../domains/job-scheduling/job-schedule.routes.js';

const router = Router();

router.get('/product-health', (_req, res) => {
    res.json({ status: 'ok', area: 'product', timestamp: new Date().toISOString() });
});

router.use('/accounts', authRoutes);
router.use('/accounts', hybridAuthRoutes);
router.use('/workspaces', workspaceRoutes);
router.use('/workspaces/:workspaceId/brands', workspaceBrandRouter);
router.use('/brands', directBrandRouter);
router.use('/brands/:brandId/onboarding/sessions', onboardingRoutes);
router.use('/brands/:brandId/strategies', productBrandStrategyRouter);
router.use('/strategies', productStrategyRouter);
router.use('/brands/:brandId/content', productBrandContentRouter);
router.use('/brands/:brandId/briefs', productBrandContentRouter);
router.use('/brands/:brandId/review-queue', productBrandContentRouter);
router.use('/brands/:brandId/sources', brandSourceRoutes);
router.use('/brands/:brandId/filter-profile', filterProfileRoutes);
router.use('/brands/:brandId/job-schedules', jobScheduleRoutes);
router.use('/brands/:brandId', productBrandPublishingRouter);
router.use('/brands/:brandId', productBrandSocialAccountRouter);
router.use('/brands/:brandId', productBrandTrendRouter);
router.use('/', productContentRouter);
router.use('/', productPublishingRouter);
router.use('/', productSocialAccountRouter);

export default router;
