import { Router } from 'express';
import { getFilterProfile, upsertFilterProfile, ValidationError } from './filter-profile.service.js';
import { buildVectorProfile } from './vector-profile.builder.js';
import { cosineSimilarity } from '../../lib/cosine-similarity.js';
import { aiClient } from '../../lib/ai-client.js';
import { settingService } from '../../lib/setting.service.js';
import { requireBrandAccess } from '../../middleware/brand-access.js';
import { asyncHandler } from '../../lib/async-handler.js';

const router = Router({ mergeParams: true });

// GET /brands/:brandId/filter-profile
router.get(
    '/',
    requireBrandAccess('EDITOR'),
    asyncHandler(async (req, res) => {
        const brandId = parseInt(req.params.brandId, 10);
        const profile = await getFilterProfile(brandId);
        res.status(200).json(profile);
    }),
);

// PUT /brands/:brandId/filter-profile
router.put(
    '/',
    requireBrandAccess('EDITOR'),
    asyncHandler(async (req, res) => {
        const brandId = parseInt(req.params.brandId, 10);
        const { mode, topicTags, description, similarityThreshold } = req.body;

        if (mode !== 'PASS_THROUGH' && mode !== 'AI_EMBEDDING') {
            res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'mode must be PASS_THROUGH or AI_EMBEDDING' } });
            return;
        }

        try {
            const profile = await upsertFilterProfile(brandId, { mode, topicTags, description, similarityThreshold });
            res.status(200).json(profile);
        } catch (err) {
            if (err instanceof ValidationError) {
                res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: err.message } });
            } else {
                res.status(502).json({ error: { code: 'INTERNAL', message: 'EMBEDDING_SERVICE_UNAVAILABLE' } });
            }
        }
    }),
);

// POST /brands/:brandId/filter-profile/test
router.post(
    '/test',
    requireBrandAccess('EDITOR'),
    asyncHandler(async (req, res) => {
        const { title, filterProfile } = req.body;

        if (!title || typeof title !== 'string') {
            res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'title is required and must be a string' } });
            return;
        }
        if (!filterProfile || typeof filterProfile !== 'object') {
            res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'filterProfile is required and must be an object' } });
            return;
        }

        if (filterProfile.mode === 'PASS_THROUGH') {
            res.status(200).json({ score: 1.0, allowed: true, threshold: null });
            return;
        }

        if (filterProfile.mode === 'AI_EMBEDDING') {
            try {
                const model = await settingService.getModel('ai.models.embedding');
                const embedFn = async (text: string): Promise<number[]> => {
                    const { data: result } = await aiClient.embed({ model, input: text });
                    return result.data[0].embedding;
                };

                const vectorProfile = await buildVectorProfile(
                    filterProfile.topicTags ?? [],
                    filterProfile.description ?? null,
                    embedFn,
                );

                const titleEmbedding = await embedFn(title);
                const score = cosineSimilarity(vectorProfile, titleEmbedding);
                const threshold = filterProfile.similarityThreshold ?? 0.7;

                res.status(200).json({ score, allowed: score >= threshold, threshold });
            } catch (err) {
                if (err instanceof ValidationError) {
                    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: (err as Error).message } });
                } else {
                    res.status(502).json({ error: { code: 'INTERNAL', message: 'EMBEDDING_SERVICE_UNAVAILABLE' } });
                }
            }
            return;
        }

        res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'filterProfile.mode must be PASS_THROUGH or AI_EMBEDDING' } });
    }),
);

export default router;
