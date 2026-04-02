import { Router } from 'express';
import { requireInternalAuth } from '../../middleware/internal-auth.js';
import { asyncHandler } from '../../lib/async-handler.js';
import { triggerImmediateIngest } from '../../jobs/ingest.job.js';
import { triggerImmediateExtraction } from '../../jobs/extraction.job.js';
import { triggerImmediateFiltering } from '../../jobs/filtering.job.js';
import { triggerImmediateAIStageA } from '../../jobs/ai-stage-a.job.js';
import { triggerImmediateAIStageB } from '../../jobs/ai-stage-b.job.js';

const router = Router();

router.post(
    '/ingest/trigger',
    requireInternalAuth,
    asyncHandler(async (req, res) => {
        console.log('[Admin] Manual ingest triggered by:', req.user?.email);

        triggerImmediateIngest().catch(error => {
            console.error('[Admin] Ingest trigger error:', error);
        });

        res.json({
            message: 'RSS ingestion triggered successfully',
            note: 'Ingestion running in background. Check server logs for progress.',
        });
    })
);

router.post(
    '/extraction/trigger',
    requireInternalAuth,
    asyncHandler(async (req, res) => {
        console.log('[Admin] Manual extraction triggered by:', req.user?.email);
        const limit = Number(req.body?.limit) || 10;

        triggerImmediateExtraction(limit).catch(error => {
            console.error('[Admin] Extraction trigger error:', error);
        });

        res.json({
            message: `Content extraction triggered for up to ${limit} items`,
            note: 'Extraction running in background. Check server logs for progress.',
        });
    })
);

router.post(
    '/filtering/trigger',
    requireInternalAuth,
    asyncHandler(async (req, res) => {
        console.log('[Admin] Manual filtering triggered by:', req.user?.email);
        const limit = Number(req.body?.limit) || 20;

        triggerImmediateFiltering(limit).catch(error => {
            console.error('[Admin] Filtering trigger error:', error);
        });

        res.json({
            message: `Content filtering triggered for up to ${limit} items`,
            note: 'Filtering running in background. Check server logs for progress.',
        });
    })
);

router.post(
    '/ai/stage-a/trigger',
    requireInternalAuth,
    asyncHandler(async (req, res) => {
        console.log('[Admin] Manual AI Stage A triggered by:', req.user?.email);
        const limit = Number(req.body?.limit) || 5;

        triggerImmediateAIStageA(limit).catch(error => {
            console.error('[Admin] AI Stage A trigger error:', error);
        });

        res.json({
            message: `AI Stage A processing triggered for up to ${limit} items`,
            note: 'AI processing running in background. Check server logs for progress.',
        });
    })
);

router.post(
    '/ai/stage-b/trigger',
    requireInternalAuth,
    asyncHandler(async (req, res) => {
        console.log('[Admin] Manual AI Stage B triggered by:', req.user?.email);
        const limit = Number(req.body?.limit) || 3;

        triggerImmediateAIStageB(limit).catch(error => {
            console.error('[Admin] AI Stage B trigger error:', error);
        });

        res.json({
            message: `AI Stage B processing triggered for up to ${limit} items`,
            note: 'AI processing running in background. Check server logs for progress.',
        });
    })
);

export default router;
