import { Router } from 'express';
import { prisma } from '../../../db/index.js';
import { requireBrandAccess } from '../../../middleware/brand-access.js';
import { requireProductAuth } from '../../../middleware/product-auth.js';
import { agentConfigService } from '../agent-config/agent-config.service.js';
import { UpsertAgentConfigSchema } from '../schemas/pipeline.schemas.js';

const router = Router();

// GET /brands/:brandId/agent-config
router.get('/brands/:brandId/agent-config', requireBrandAccess('VIEWER'), async (req, res, next) => {
    try {
        const brandId = parseInt(req.params.brandId, 10);
        const config = await agentConfigService.getConfigOrDefault(brandId);
        res.json(config);
    } catch (err) {
        next(err);
    }
});

// PUT /brands/:brandId/agent-config
router.put('/brands/:brandId/agent-config', requireBrandAccess('EDITOR'), async (req, res, next) => {
    try {
        const brandId = parseInt(req.params.brandId, 10);
        const parsed = UpsertAgentConfigSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid config', details: parsed.error.errors } });
            return;
        }
        const config = await agentConfigService.upsertConfig(brandId, parsed.data);
        res.json(config);
    } catch (err) {
        next(err);
    }
});

// GET /items/:itemId/drafts
router.get('/items/:itemId/drafts', requireProductAuth, async (req, res, next) => {
    try {
        const itemId = parseInt(req.params.itemId, 10);
        const script = await prisma.contentScript.findUnique({
            where: { itemId },
            include: {
                drafts: { orderBy: { createdAt: 'desc' } },
            },
        });
        if (!script) {
            res.json({ script: null, drafts: [] });
            return;
        }
        res.json({ script, drafts: script.drafts });
    } catch (err) {
        next(err);
    }
});

// GET /scripts/:scriptId
router.get('/scripts/:scriptId', requireProductAuth, async (req, res, next) => {
    try {
        const script = await prisma.contentScript.findUnique({
            where: { id: req.params.scriptId },
            include: { drafts: { orderBy: { createdAt: 'desc' } } },
        });
        if (!script) {
            res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Script not found' } });
            return;
        }
        res.json(script);
    } catch (err) {
        next(err);
    }
});

// GET /models — list available OpenRouter models
router.get('/models', requireProductAuth, async (req, res, next) => {
    try {
        const response = await fetch('https://openrouter.ai/api/v1/models', {
            headers: {
                'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
            },
        });
        if (!response.ok) {
            res.status(502).json({ error: { code: 'UPSTREAM_ERROR', message: 'Failed to fetch models from OpenRouter' } });
            return;
        }
        const data = await response.json() as { data: Array<{ id: string; name: string; description?: string; context_length?: number; owned_by?: string }> };
        const models = (data.data ?? []).map(m => ({
            id: m.id,
            name: m.name,
            provider: m.owned_by ?? m.id.split('/')[0],
            contextLength: m.context_length ?? null,
        }));
        res.json(models);
    } catch (err) {
        next(err);
    }
});

export default router;
