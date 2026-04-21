import { Router } from 'express';
import monitorRoutes from '../../domains/monitoring/monitoring.routes.js';
import { asyncHandler } from '../../lib/async-handler.js';
import adminRoutes from '../../domains/content-intelligence/admin.routes.js';
import { pipelineJobController } from '../../domains/content-intelligence/pipeline-job.controller.js';
import { trendController } from '../../domains/content-intelligence/trend.controller.js';
import itemRoutes from '../../domains/content-intelligence/item.routes.js';
import sourceRoutes from '../../domains/content-intelligence/source.routes.js';
import { requireAdminAuth } from '../../middleware/admin-auth.js';
import { requireBrandAccess } from '../../middleware/brand-access.js';
import sourceDiscoveryRoutes from '../../domains/source-discovery/source-discovery.routes.js';
import aiSettingsRoutes from '../../domains/content-intelligence/ai-settings.routes.js';
import jobScheduleAdminRoutes from '../../domains/job-scheduling/job-schedule.admin.routes.js';
import modelRegistryAdminRoutes from '../../domains/ai-model-configuration/model-registry.routes.js';
import walletAdminRoutes from '../../domains/wallet/wallet-admin.routes.js';

const router = Router();

router.get('/health', (_req, res) => {
    res.json({ status: 'ok', area: 'internal', timestamp: new Date().toISOString() });
});

router.use('/admin', adminRoutes);
router.use('/admin/ai/settings', aiSettingsRoutes);
router.use('/admin/ai/models', modelRegistryAdminRoutes);
router.use('/admin/job-schedules', jobScheduleAdminRoutes);
router.use('/monitor', monitorRoutes);
router.use('/sources', sourceRoutes);
router.use('/source-discovery', sourceDiscoveryRoutes);
router.use('/items', itemRoutes);

router.post('/content-intelligence/jobs/ingest/run', requireAdminAuth, asyncHandler((req, res, next) =>
    pipelineJobController.triggerIngest(req, res, next)
));
router.post('/content-intelligence/jobs/extraction/run', requireAdminAuth, asyncHandler((req, res, next) =>
    pipelineJobController.triggerExtraction(req, res, next)
));
router.post('/content-intelligence/jobs/filtering/run', requireAdminAuth, asyncHandler((req, res, next) =>
    pipelineJobController.triggerFiltering(req, res, next)
));
router.post('/content-intelligence/jobs/ai-stage-a/run', requireAdminAuth, asyncHandler((req, res, next) =>
    pipelineJobController.triggerStageA(req, res, next)
));
router.post('/content-intelligence/jobs/ai-stage-b/run', requireAdminAuth, asyncHandler((req, res, next) =>
    pipelineJobController.triggerStageB(req, res, next)
));
router.post('/content-intelligence/trends/refresh', requireAdminAuth, asyncHandler((req, res, next) =>
    trendController.refreshTrendSignals(req, res, next)
));

router.get('/brands/:brandId/trends', requireBrandAccess('VIEWER'), asyncHandler((req, res, next) =>
    trendController.listBrandTrends(req, res, next)
));

router.post('/brands/:brandId/trends/match', requireBrandAccess('EDITOR'), asyncHandler((req, res, next) =>
    trendController.matchBrandTrends(req, res, next)
));

router.get('/auth-check', requireAdminAuth, (_req, res) => {
    res.json({ status: 'ok' });
});

router.use('/', walletAdminRoutes);

export default router;
