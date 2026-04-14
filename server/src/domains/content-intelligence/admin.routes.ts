import { Router } from 'express';
import { requireAdminAuth } from '../../middleware/admin-auth.js';
import { logger } from '../../lib/logger.js';
import { asyncHandler } from '../../lib/async-handler.js';
import { triggerImmediateIngest } from '../../jobs/ingest.job.js';
import { triggerImmediateExtraction } from '../../jobs/extraction.job.js';
import { triggerImmediateFiltering } from '../../jobs/filtering.job.js';
import { triggerImmediateAIStageA } from '../../jobs/ai-stage-a.job.js';
import { triggerImmediateAIStageB } from '../../jobs/ai-stage-b.job.js';

const router = Router();

router.post(
    '/ingest/trigger',
    requireAdminAuth,
    asyncHandler(async (req, res) => {
        logger.info({ email: req.v2User?.email }, '[Admin] Manual ingest triggered by');

        triggerImmediateIngest().catch(error => {
            logger.error({ error }, '[Admin] Ingest trigger error');
        });

        res.json({
            message: 'RSS ingestion triggered successfully',
            note: 'Ingestion running in background. Check server logs for progress.',
        });
    })
);

router.post(
    '/extraction/trigger',
    requireAdminAuth,
    asyncHandler(async (req, res) => {
        logger.info({ email: req.v2User?.email }, '[Admin] Manual extraction triggered by');
        const limit = Number(req.body?.limit) || 10;

        triggerImmediateExtraction(limit).catch(error => {
            logger.error({ error }, '[Admin] Extraction trigger error');
        });

        res.json({
            message: `Content extraction triggered for up to ${limit} items`,
            note: 'Extraction running in background. Check server logs for progress.',
        });
    })
);

router.post(
    '/filtering/trigger',
    requireAdminAuth,
    asyncHandler(async (req, res) => {
        logger.info({ email: req.v2User?.email }, '[Admin] Manual filtering triggered by');
        const limit = Number(req.body?.limit) || 20;

        triggerImmediateFiltering(limit).catch(error => {
            logger.error({ error }, '[Admin] Filtering trigger error');
        });

        res.json({
            message: `Content filtering triggered for up to ${limit} items`,
            note: 'Filtering running in background. Check server logs for progress.',
        });
    })
);

router.post(
    '/ai/stage-a/trigger',
    requireAdminAuth,
    asyncHandler(async (req, res) => {
        logger.info({ email: req.v2User?.email }, '[Admin] Manual AI Stage A triggered by');
        const limit = Number(req.body?.limit) || 5;

        triggerImmediateAIStageA(limit).catch(error => {
            logger.error({ error }, '[Admin] AI Stage A trigger error');
        });

        res.json({
            message: `AI Stage A processing triggered for up to ${limit} items`,
            note: 'AI processing running in background. Check server logs for progress.',
        });
    })
);

router.post(
    '/ai/stage-b/trigger',
    requireAdminAuth,
    asyncHandler(async (req, res) => {
        logger.info({ email: req.v2User?.email }, '[Admin] Manual AI Stage B triggered by');
        const limit = Number(req.body?.limit) || 3;

        triggerImmediateAIStageB(limit).catch(error => {
            logger.error({ error }, '[Admin] AI Stage B trigger error');
        });

        res.json({
            message: `AI Stage B processing triggered for up to ${limit} items`,
            note: 'AI processing running in background. Check server logs for progress.',
        });
    })
);

export default router;
