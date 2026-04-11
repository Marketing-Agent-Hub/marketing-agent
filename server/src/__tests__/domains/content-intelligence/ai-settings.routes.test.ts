/**
 * Feature: openrouter-ai-client
 *
 * Unit tests for Admin AI Settings API
 * Validates: Requirements 4.1, 4.4, 4.5
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../../../lib/setting.service.js', () => ({
    settingService: {
        getAllAiSettings: vi.fn(),
        updateAiSettings: vi.fn(),
    },
}));

vi.mock('../../../middleware/internal-auth.js', () => ({
    requireInternalAuth: vi.fn((req: Request, res: Response, next: any) => next()),
}));

vi.mock('../../../lib/async-handler.js', () => ({
    asyncHandler: (fn: any) => fn,
}));

import { settingService } from '../../../lib/setting.service.js';
import { requireInternalAuth } from '../../../middleware/internal-auth.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRes() {
    const res: any = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res as Response & { status: any; json: any };
}

function makeReq(overrides: Partial<Request> = {}): Request {
    return {
        headers: {},
        body: {},
        ...overrides,
    } as unknown as Request;
}

const VALID_SETTINGS = {
    models: {
        stageA: 'openai/gpt-4o-mini',
        stageB: 'openai/gpt-4o',
        embedding: 'openai/text-embedding-3-small',
        businessAnalysis: 'openai/gpt-4o',
        strategyGeneration: 'openai/gpt-4o',
        postGeneration: 'openai/gpt-4o-mini',
        discovery: 'openai/gpt-4o-mini',
    },
    stages: {
        stageA: { enabled: false },
        stageB: { enabled: false },
    },
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Admin AI Settings Routes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // ── GET handler ───────────────────────────────────────────────────────────

    describe('GET /admin/ai/settings', () => {
        it('returns 200 with all 7 model keys and stage flags', async () => {
            vi.mocked(settingService.getAllAiSettings).mockResolvedValue(VALID_SETTINGS as any);

            // Import the router and extract the GET handler
            const routerModule = await import('../../../domains/content-intelligence/ai-settings.routes.js');
            const router = routerModule.default;

            // Find the GET handler by inspecting router stack
            const getLayer = (router as any).stack.find(
                (l: any) => l.route?.methods?.get,
            );
            expect(getLayer).toBeDefined();

            // The handler is the last middleware in the route stack (after requireInternalAuth)
            const handlers = getLayer.route.stack;
            const handler = handlers[handlers.length - 1].handle;

            const req = makeReq();
            const res = makeRes();

            await handler(req, res, vi.fn());

            expect(res.status).toHaveBeenCalledWith(200);
            const body = res.json.mock.calls[0][0];

            // 7 model keys
            expect(Object.keys(body.models)).toHaveLength(7);
            expect(body.models.stageA).toBeDefined();
            expect(body.models.stageB).toBeDefined();
            expect(body.models.embedding).toBeDefined();
            expect(body.models.businessAnalysis).toBeDefined();
            expect(body.models.strategyGeneration).toBeDefined();
            expect(body.models.postGeneration).toBeDefined();
            expect(body.models.discovery).toBeDefined();

            // Stage flags
            expect(typeof body.stages.stageA.enabled).toBe('boolean');
            expect(typeof body.stages.stageB.enabled).toBe('boolean');
        });

        it('returns 401 when requireInternalAuth rejects the request', async () => {
            // Override mock to simulate auth rejection
            vi.mocked(requireInternalAuth).mockImplementationOnce(
                (_req: Request, res: Response, _next: any) => {
                    res.status(401).json({ error: { code: 'UNAUTHORIZED' } });
                },
            );

            const routerModule = await import('../../../domains/content-intelligence/ai-settings.routes.js');
            const router = routerModule.default;

            const getLayer = (router as any).stack.find(
                (l: any) => l.route?.methods?.get,
            );
            const authMiddleware = getLayer.route.stack[0].handle;

            const req = makeReq();
            const res = makeRes();

            authMiddleware(req, res, vi.fn());

            expect(res.status).toHaveBeenCalledWith(401);
        });
    });

    // ── PATCH handler ─────────────────────────────────────────────────────────

    describe('PATCH /admin/ai/settings', () => {
        async function getPatchHandler() {
            const routerModule = await import('../../../domains/content-intelligence/ai-settings.routes.js');
            const router = routerModule.default;
            const patchLayer = (router as any).stack.find(
                (l: any) => l.route?.methods?.patch,
            );
            const handlers = patchLayer.route.stack;
            return handlers[handlers.length - 1].handle;
        }

        it('returns 200 with updated settings when body is valid', async () => {
            const updated = {
                ...VALID_SETTINGS,
                models: { ...VALID_SETTINGS.models, stageA: 'anthropic/claude-3-haiku' },
            };
            vi.mocked(settingService.updateAiSettings).mockResolvedValue(updated as any);

            const handler = await getPatchHandler();
            const req = makeReq({ body: { models: { stageA: 'anthropic/claude-3-haiku' } } });
            const res = makeRes();

            await handler(req, res, vi.fn());

            expect(res.status).toHaveBeenCalledWith(200);
            const body = res.json.mock.calls[0][0];
            expect(body.models.stageA).toBe('anthropic/claude-3-haiku');
        });

        it('returns 422 when models field is not an object', async () => {
            const handler = await getPatchHandler();
            const req = makeReq({ body: { models: 'not-an-object' } });
            const res = makeRes();

            await handler(req, res, vi.fn());

            expect(res.status).toHaveBeenCalledWith(422);
        });

        it('returns 422 when stages.stageA.enabled is not a boolean', async () => {
            const handler = await getPatchHandler();
            const req = makeReq({ body: { stages: { stageA: { enabled: 'yes' } } } });
            const res = makeRes();

            await handler(req, res, vi.fn());

            expect(res.status).toHaveBeenCalledWith(422);
        });

        it('returns 200 with empty body (all fields optional)', async () => {
            vi.mocked(settingService.updateAiSettings).mockResolvedValue(VALID_SETTINGS as any);

            const handler = await getPatchHandler();
            const req = makeReq({ body: {} });
            const res = makeRes();

            await handler(req, res, vi.fn());

            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('returns 200 when updating only stage flags', async () => {
            const updated = {
                ...VALID_SETTINGS,
                stages: { stageA: { enabled: true }, stageB: { enabled: false } },
            };
            vi.mocked(settingService.updateAiSettings).mockResolvedValue(updated as any);

            const handler = await getPatchHandler();
            const req = makeReq({ body: { stages: { stageA: { enabled: true } } } });
            const res = makeRes();

            await handler(req, res, vi.fn());

            expect(res.status).toHaveBeenCalledWith(200);
            expect(settingService.updateAiSettings).toHaveBeenCalledWith({
                stages: { stageA: { enabled: true } },
            });
        });
    });
});
