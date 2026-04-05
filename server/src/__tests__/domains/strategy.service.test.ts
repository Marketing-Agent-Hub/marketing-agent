import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockStrategyOutput = {
    title: '30-Day Growth Strategy',
    objective: 'Increase brand awareness',
    weeklyThemes: [{ week: 1, theme: 'Product Benefits', funnelStage: 'Awareness' }],
    cadenceConfig: { postsPerWeek: 5, channels: ['FACEBOOK'] },
    slots: [{ channel: 'FACEBOOK', scheduledFor: new Date(Date.now() + 86400000).toISOString(), pillarName: 'Sales Tips', funnelStage: 'Awareness' }],
};

vi.mock('../../db/index.js', () => ({
    prisma: {
        brand: { findUnique: vi.fn() },
        strategyPlan: {
            findUnique: vi.fn(),
            findMany: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            updateMany: vi.fn(),
        },
        strategySlot: { createMany: vi.fn(), findMany: vi.fn() },
        generationRun: { create: vi.fn(), update: vi.fn() },
        $transaction: vi.fn(async (fn: any) => fn({
            strategyPlan: { create: vi.fn().mockResolvedValue({ id: 1, brandId: 1, status: 'DRAFT' }), update: vi.fn(), updateMany: vi.fn() },
            strategySlot: { createMany: vi.fn() },
        })),
    },
}));

vi.mock('../../config/ai.config.js', () => ({
    openai: { chat: { completions: { create: vi.fn() } } },
}));

vi.mock('../../shared/marketing/settings.js', () => ({
    getAIModel: vi.fn().mockResolvedValue('gpt-4o'),
    getDefaultPostingCadence: vi.fn().mockResolvedValue(5),
}));

import { prisma } from '../../db/index.js';
import { openai } from '../../config/ai.config.js';
import { StrategyService } from '../../domains/strategy/strategy.service.js';

const mockBrand = { id: 1, workspaceId: 10, name: 'Acme', profile: { summary: 'CRM' }, pillars: [{ id: 1, name: 'Sales Tips' }] };

describe('StrategyService', () => {
    let service: StrategyService;

    beforeEach(() => {
        service = new StrategyService();
        vi.clearAllMocks();
        vi.mocked(prisma.brand.findUnique).mockResolvedValue(mockBrand as any);
        vi.mocked(prisma.generationRun.create).mockResolvedValue({ id: 99 } as any);
        vi.mocked(prisma.generationRun.update).mockResolvedValue({} as any);
    });

    it('calls OpenAI and creates a strategy plan', async () => {
        vi.mocked(openai.chat.completions.create).mockResolvedValue({
            choices: [{ message: { content: JSON.stringify(mockStrategyOutput) } }],
            usage: { prompt_tokens: 100, completion_tokens: 200 },
        } as any);

        await service.generateStrategy(1, { durationDays: 30 });

        expect(prisma.generationRun.create).toHaveBeenCalledWith(
            expect.objectContaining({ data: expect.objectContaining({ workflow: 'strategy-generation' }) })
        );
        expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('throws 422 when activating a non-draft strategy', async () => {
        vi.mocked(prisma.strategyPlan.findUnique).mockResolvedValue({ id: 1, brandId: 1, status: 'ACTIVE' } as any);

        await expect(service.activateStrategy(1)).rejects.toMatchObject({ statusCode: 422 });
    });

    it('supersedes the active strategy before activating the new one', async () => {
        vi.mocked(prisma.strategyPlan.findUnique).mockResolvedValue({ id: 1, brandId: 1, status: 'DRAFT' } as any);
        const txUpdateMany = vi.fn().mockResolvedValue({});
        const txUpdate = vi.fn().mockResolvedValue({ id: 1, status: 'ACTIVE' });
        vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) =>
            fn({ strategyPlan: { updateMany: txUpdateMany, update: txUpdate } })
        );

        await service.activateStrategy(1);

        expect(txUpdateMany).toHaveBeenCalledWith(
            expect.objectContaining({ data: { status: 'SUPERSEDED' } })
        );
        expect(txUpdate).toHaveBeenCalledWith(
            expect.objectContaining({ data: { status: 'ACTIVE' } })
        );
    });
});
