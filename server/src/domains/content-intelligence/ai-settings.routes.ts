import { Router } from 'express';
import { z } from 'zod';
import { requireInternalAuth } from '../../middleware/internal-auth.js';
import { asyncHandler } from '../../lib/async-handler.js';
import { settingService } from '../../lib/setting.service.js';

const router = Router();

const patchSchema = z.object({
    models: z
        .object({
            stageA: z.string().optional(),
            stageB: z.string().optional(),
            embedding: z.string().optional(),
            businessAnalysis: z.string().optional(),
            strategyGeneration: z.string().optional(),
            postGeneration: z.string().optional(),
            discovery: z.string().optional(),
        })
        .optional(),
    stages: z
        .object({
            stageA: z.object({ enabled: z.boolean() }).optional(),
            stageB: z.object({ enabled: z.boolean() }).optional(),
        })
        .optional(),
});

router.get(
    '/',
    requireInternalAuth,
    asyncHandler(async (_req, res) => {
        const settings = await settingService.getAllAiSettings();
        res.status(200).json(settings);
    }),
);

router.patch(
    '/',
    requireInternalAuth,
    asyncHandler(async (req, res) => {
        const result = patchSchema.safeParse(req.body);
        if (!result.success) {
            res.status(422).json({ error: result.error });
            return;
        }
        const updated = await settingService.updateAiSettings(result.data);
        res.status(200).json(updated);
    }),
);

export default router;
