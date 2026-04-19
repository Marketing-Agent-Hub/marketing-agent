import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/async-handler.js';
import { requireBrandAccess } from '../../middleware/brand-access.js';
import { mediaGenerationService } from './media-generation.service.js';

const router = Router({ mergeParams: true });

const MediaConfigPatchSchema = z.object({
    imageModel: z.string().optional(),
    videoModel: z.string().nullable().optional(),
    audioModel: z.string().nullable().optional(),
    imageSize: z.string().optional(),
    imageStyle: z.string().optional(),
});

// GET /brands/:brandId/media-config
router.get('/', requireBrandAccess('VIEWER'), asyncHandler(async (req, res) => {
    const brandId = parseInt(req.params.brandId, 10);
    const config = await mediaGenerationService.getConfig(brandId);
    res.json(config);
}));

// PUT /brands/:brandId/media-config
router.put('/', requireBrandAccess('EDITOR'), asyncHandler(async (req, res) => {
    const brandId = parseInt(req.params.brandId, 10);
    const parsed = MediaConfigPatchSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } });
        return;
    }
    const config = await mediaGenerationService.upsertConfig(brandId, parsed.data);
    res.json(config);
}));

export default router;
