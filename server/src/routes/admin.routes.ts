import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../lib/async-handler.js';
import { triggerImmediateIngest } from '../jobs/ingest.job.js';
import { triggerImmediateExtraction } from '../jobs/extraction.job.js';
import { triggerImmediateFiltering } from '../jobs/filtering.job.js';

const router = Router();

/**
 * POST /admin/ingest/trigger
 * Manually trigger RSS ingestion for all enabled sources
 */
router.post(
    '/ingest/trigger',
    requireAuth,
    asyncHandler(async (req, res) => {
        console.log('[Admin] Manual ingest triggered by:', req.user?.email);

        // Trigger ingestion asynchronously (don't wait for completion)
        triggerImmediateIngest().catch(error => {
            console.error('[Admin] Ingest trigger error:', error);
        });

        res.json({
            message: 'RSS ingestion triggered successfully',
            note: 'Ingestion running in background. Check server logs for progress.',
        });
    })
);

/**
 * POST /admin/extraction/trigger
 * Manually trigger content extraction for NEW items
 */
router.post(
    '/extraction/trigger',
    requireAuth,
    asyncHandler(async (req, res) => {
        console.log('[Admin] Manual extraction triggered by:', req.user?.email);
        const limit = Number(req.body?.limit) || 10;

        // Trigger extraction asynchronously
        triggerImmediateExtraction(limit).catch(error => {
            console.error('[Admin] Extraction trigger error:', error);
        });

        res.json({
            message: `Content extraction triggered for up to ${limit} items`,
            note: 'Extraction running in background. Check server logs for progress.',
        });
    })
);

/**
 * POST /admin/filtering/trigger
 * Manually trigger content filtering for EXTRACTED items
 */
router.post(
    '/filtering/trigger',
    requireAuth,
    asyncHandler(async (req, res) => {
        console.log('[Admin] Manual filtering triggered by:', req.user?.email);
        const limit = Number(req.body?.limit) || 20;

        // Trigger filtering asynchronously
        triggerImmediateFiltering(limit).catch(error => {
            console.error('[Admin] Filtering trigger error:', error);
        });

        res.json({
            message: `Content filtering triggered for up to ${limit} items`,
            note: 'Filtering running in background. Check server logs for progress.',
        });
    })
);

export default router;
