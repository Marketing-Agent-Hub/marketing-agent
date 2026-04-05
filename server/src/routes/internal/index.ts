import { Router } from 'express';
import monitorRoutes from '../../domains/monitoring/monitoring.routes.js';
import internalAuthRoutes from './auth.routes.js';
import { asyncHandler } from '../../lib/async-handler.js';
import adminRoutes from '../../domains/content-intelligence/admin.routes.js';
import { contentIntelligenceController } from '../../domains/content-intelligence/content-intelligence.controller.js';
import itemRoutes from '../../domains/content-intelligence/item.routes.js';
import sourceRoutes from '../../domains/content-intelligence/source.routes.js';
import { requireInternalAuth } from '../../middleware/internal-auth.js';
import { requireBrandAccess } from '../../middleware/brand-access.js';

const router = Router();

router.get('/health', (_req, res) => {
    res.json({ status: 'ok', area: 'internal', timestamp: new Date().toISOString() });
});

router.use('/auth', internalAuthRoutes);
router.use('/admin', adminRoutes);
router.use('/monitor', monitorRoutes);
router.use('/sources', sourceRoutes);
router.use('/items', itemRoutes);

router.post('/content-intelligence/jobs/ingest/run', requireInternalAuth, asyncHandler((req, res, next) =>
    contentIntelligenceController.triggerIngest(req, res, next)
));
router.post('/content-intelligence/jobs/extraction/run', requireInternalAuth, asyncHandler((req, res, next) =>
    contentIntelligenceController.triggerExtraction(req, res, next)
));
router.post('/content-intelligence/jobs/filtering/run', requireInternalAuth, asyncHandler((req, res, next) =>
    contentIntelligenceController.triggerFiltering(req, res, next)
));
router.post('/content-intelligence/jobs/ai-stage-a/run', requireInternalAuth, asyncHandler((req, res, next) =>
    contentIntelligenceController.triggerStageA(req, res, next)
));
router.post('/content-intelligence/jobs/ai-stage-b/run', requireInternalAuth, asyncHandler((req, res, next) =>
    contentIntelligenceController.triggerStageB(req, res, next)
));
router.post('/content-intelligence/trends/refresh', requireInternalAuth, asyncHandler((req, res, next) =>
    contentIntelligenceController.refreshTrendSignals(req, res, next)
));

router.get('/brands/:brandId/trends', requireBrandAccess('VIEWER'), asyncHandler((req, res, next) =>
    contentIntelligenceController.listBrandTrends(req, res, next)
));

router.post('/brands/:brandId/trends/match', requireBrandAccess('EDITOR'), asyncHandler((req, res, next) =>
    contentIntelligenceController.matchBrandTrends(req, res, next)
));

router.get('/auth-check', requireInternalAuth, (_req, res) => {
    res.json({ status: 'ok' });
});

export default router;
