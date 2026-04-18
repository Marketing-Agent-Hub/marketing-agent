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
import pipelineRoutes from '../../domains/content/routes/pipeline.routes.js';

const router = Router();

router.get('/product-health', (_req, res) => {
    res.json({ status: 'ok', area: 'product', timestamp: new Date().toISOString() });
});

router.use('/accounts', authRoutes);
router.use('/accounts', hybridAuthRoutes);
router.use('/workspaces', workspaceRoutes);
router.use('/workspaces/:workspaceId/brands', workspaceBrandRouter);
router.use('/brands', directBrandRouter);
router.use('/brands/:brandId/onboarding', onboardingRoutes);
router.use('/brands/:brandId/strategies', productBrandStrategyRouter);
router.use('/strategies', productStrategyRouter);
// Brand-scoped content endpoints (briefs, review-queue, generate-daily, ...)
router.use('/brands/:brandId', productBrandContentRouter);
router.use('/brands/:brandId/sources', brandSourceRoutes);
router.use('/brands/:brandId/filter-profile', filterProfileRoutes);
router.use('/brands/:brandId/job-schedules', jobScheduleRoutes);
router.use('/brands/:brandId', productBrandPublishingRouter);
router.use('/brands/:brandId', productBrandSocialAccountRouter);
router.use('/brands/:brandId', productBrandTrendRouter);
router.use('/', productContentRouter);
router.use('/', productPublishingRouter);
router.use('/', productSocialAccountRouter);
router.use('/', pipelineRoutes);

export default router;
