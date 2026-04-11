import { Router } from 'express';
import { asyncHandler } from '../../lib/async-handler.js';
import { requireBrandAccess } from '../../middleware/brand-access.js';
import {
    subscribeBrandToSource,
    listBrandSources,
    updateBrandSourceOverrides,
    unsubscribeBrandFromSource,
    ConflictError,
    NotFoundError,
} from './brand-source.service.js';

const router = Router({ mergeParams: true });

// POST /brands/:brandId/sources — subscribe
router.post(
    '/',
    requireBrandAccess('EDITOR'),
    asyncHandler(async (req, res) => {
        const brandId = parseInt(req.params.brandId, 10);
        const { sourceId, fetchIntervalMinutes, enabled } = req.body as {
            sourceId: number;
            fetchIntervalMinutes?: number;
            enabled?: boolean;
        };

        try {
            const result = await subscribeBrandToSource(brandId, sourceId, {
                fetchIntervalMinutes,
                enabled,
            });
            res.status(201).json({ data: result });
        } catch (err) {
            if (err instanceof ConflictError) {
                res.status(409).json({ error: { code: 'CONFLICT', message: 'ALREADY_SUBSCRIBED' } });
            } else if (err instanceof NotFoundError) {
                res.status(404).json({ error: { code: 'NOT_FOUND', message: err.message } });
            } else {
                throw err;
            }
        }
    })
);

// GET /brands/:brandId/sources — list subscriptions
router.get(
    '/',
    requireBrandAccess('EDITOR'),
    asyncHandler(async (req, res) => {
        const brandId = parseInt(req.params.brandId, 10);
        const sources = await listBrandSources(brandId);
        res.status(200).json({ data: sources });
    })
);

// PATCH /brands/:brandId/sources/:sourceId — update overrides
router.patch(
    '/:sourceId',
    requireBrandAccess('EDITOR'),
    asyncHandler(async (req, res) => {
        const brandId = parseInt(req.params.brandId, 10);
        const sourceId = parseInt(req.params.sourceId, 10);
        const { fetchIntervalMinutes, enabled } = req.body as {
            fetchIntervalMinutes?: number;
            enabled?: boolean;
        };

        try {
            const result = await updateBrandSourceOverrides(brandId, sourceId, {
                fetchIntervalMinutes,
                enabled,
            });
            res.status(200).json({ data: result });
        } catch (err) {
            if (err instanceof NotFoundError) {
                res.status(404).json({ error: { code: 'NOT_FOUND', message: err.message } });
            } else {
                throw err;
            }
        }
    })
);

// DELETE /brands/:brandId/sources/:sourceId — unsubscribe
router.delete(
    '/:sourceId',
    requireBrandAccess('EDITOR'),
    asyncHandler(async (req, res) => {
        const brandId = parseInt(req.params.brandId, 10);
        const sourceId = parseInt(req.params.sourceId, 10);

        try {
            await unsubscribeBrandFromSource(brandId, sourceId);
            res.status(204).send();
        } catch (err) {
            if (err instanceof NotFoundError) {
                res.status(404).json({ error: { code: 'NOT_FOUND', message: err.message } });
            } else {
                throw err;
            }
        }
    })
);

export default router;
