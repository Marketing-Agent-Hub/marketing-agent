import { Router } from 'express';
import { asyncHandler } from '../../lib/async-handler.js';
import { requireAdminAuth } from '../../middleware/admin-auth.js';
import { modelRegistryService } from '../../lib/model-registry.service.js';

const router = Router();

// GET /internal/admin/ai/models?category=<optional>
router.get('/', requireAdminAuth, asyncHandler(async (req, res) => {
    const category = typeof req.query.category === 'string' ? req.query.category : undefined;
    const models = await modelRegistryService.getAvailableModels(category);
    res.json({ models });
}));

export default router;
