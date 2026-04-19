import { Router } from 'express';
import { asyncHandler } from '../../lib/async-handler.js';
import { requireBrandAccess } from '../../middleware/brand-access.js';
import { modelRegistryService } from '../../lib/model-registry.service.js';

const router = Router({ mergeParams: true });

// GET /brands/:brandId/ai/models?category=<optional>
router.get('/', requireBrandAccess('VIEWER'), asyncHandler(async (req, res) => {
    const category = typeof req.query.category === 'string' ? req.query.category : undefined;
    const models = await modelRegistryService.getAvailableModels(category);
    res.json({ models });
}));

export default router;
