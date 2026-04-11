import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../db/index.js', () => ({
    prisma: {
        brand: { findUnique: vi.fn() },
        onboardingSession: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
        generationRun: { create: vi.fn(), update: vi.fn() },
        brandProfile: { upsert: vi.fn(), findUnique: vi.fn() },
        contentPillar: { deleteMany: vi.fn(), createMany: vi.fn() },
        strategyPlan: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
        strategySlot: { createMany: vi.fn(), findMany: vi.fn(), update: vi.fn() },
        contentBrief: { create: vi.fn() },
        contentDraft: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn(), findMany: vi.fn() },
        contentApproval: { create: vi.fn() },
        publishJob: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
        publishedPost: { create: vi.fn() },
        $transaction: vi.fn(async (fn: any) => fn({
            brandProfile: { upsert: vi.fn().mockResolvedValue({}) },
            contentPillar: { deleteMany: vi.fn(), createMany: vi.fn() },
            strategyPlan: { create: vi.fn().mockResolvedValue({ id: 1, brandId: 1, status: 'DRAFT' }), update: vi.fn().mockResolvedValue({ id: 1, status: 'ACTIVE' }), updateMany: vi.fn() },
            strategySlot: { createMany: vi.fn() },
            contentApproval: { create: vi.fn().mockResolvedValue({}) },
            contentDraft: { update: vi.fn().mockResolvedValue({ id: 1, status: 'APPROVED' }) },
            publishJob: { create: vi.fn().mockResolvedValue({ id: 1, status: 'SCHEDULED' }), update: vi.fn() },
            publishedPost: { create: vi.fn() },
        })),
    },
}));

vi.mock('../../lib/ai-client.js', () => ({
    aiClient: { chat: vi.fn() },
    OpenRouterCreditError: class OpenRouterCreditError extends Error { },
    OpenRouterOverloadedError: class OpenRouterOverloadedError extends Error { },
}));

vi.mock('../../shared/marketing/settings.js', () => ({
    getAIModel: vi.fn().mockResolvedValue('gpt-4o-mini'),
    getDefaultPostingCadence: vi.fn().mockResolvedValue(5),
}));

vi.mock('../../lib/logger.js', () => ({ logger: { error: vi.fn(), info: vi.fn() } }));

import { prisma } from '../../db/index.js';
import { aiClient } from '../../lib/ai-client.js';
import { OnboardingService } from '../../domains/onboarding/onboarding.service.js';
import { StrategyService } from '../../domains/strategy/strategy.service.js';
import { ApprovalService } from '../../domains/approval/approval.service.js';
import { PublishingService } from '../../domains/publishing/publishing.service.js';

const mockBrand = { id: 1, workspaceId: 10, name: 'Acme', profile: { summary: 'CRM', toneGuidelines: {} }, pillars: [{ id: 1, name: 'Sales' }] };

describe('Marketing Flow Integration', () => {
    let onboardingService: OnboardingService;
    let strategyService: StrategyService;
    let approvalService: ApprovalService;
    let publishingService: PublishingService;

    beforeEach(() => {
        onboardingService = new OnboardingService();
        strategyService = new StrategyService();
        approvalService = new ApprovalService();
        publishingService = new PublishingService();
        vi.clearAllMocks();
        vi.mocked(prisma.brand.findUnique).mockResolvedValue(mockBrand as any);
        vi.mocked(prisma.generationRun.create).mockResolvedValue({ id: 99 } as any);
        vi.mocked(prisma.generationRun.update).mockResolvedValue({} as any);
    });

    it('handles onboarding session creation and messages', async () => {
        vi.mocked(prisma.onboardingSession.create).mockResolvedValue({ id: 1, brandId: 1, transcript: [], status: 'IN_PROGRESS' } as any);
        const session = await onboardingService.createSession(1);
        expect(session.status).toBe('IN_PROGRESS');

        vi.mocked(prisma.onboardingSession.findUnique).mockResolvedValue({ id: 1, brandId: 1, transcript: [], status: 'IN_PROGRESS' } as any);
        vi.mocked(prisma.onboardingSession.update).mockResolvedValue({ id: 1, transcript: [{ role: 'user', content: 'We sell CRM', timestamp: '' }], status: 'IN_PROGRESS' } as any);
        const updated = await onboardingService.addMessage(1, { role: 'user', content: 'We sell CRM' });
        expect((updated.transcript as any[]).length).toBeGreaterThan(0);
    });

    it('generates and activates a strategy', async () => {
        vi.mocked(aiClient.chat).mockResolvedValue({
            data: {
                choices: [{
                    message: {
                        content: JSON.stringify({
                            title: 'Strategy', objective: 'Grow', weeklyThemes: [],
                            cadenceConfig: { postsPerWeek: 5, channels: ['FACEBOOK'] },
                            slots: [],
                        }),
                    },
                }],
                usage: { prompt_tokens: 100, completion_tokens: 200 },
            } as any,
            actualModel: 'gpt-4o-mini',
        });

        const plan = await strategyService.generateStrategy(1, { durationDays: 30 });
        expect(plan).toBeDefined();

        vi.mocked(prisma.strategyPlan.findUnique).mockResolvedValue({ id: 1, brandId: 1, status: 'DRAFT' } as any);
        const activated = await strategyService.activateStrategy(1);
        expect(activated.status).toBe('ACTIVE');
    });

    it('approves a draft', async () => {
        vi.mocked(prisma.contentDraft.findUnique).mockResolvedValue({ id: 1, status: 'IN_REVIEW' } as any);
        const approved = await approvalService.approveDraft(1, 42);
        expect(approved.status).toBe('APPROVED');
    });

    it('schedules an approved draft for publishing', async () => {
        vi.mocked(prisma.contentDraft.findUnique).mockResolvedValue({ id: 1, status: 'APPROVED', platform: 'FACEBOOK' } as any);
        const job = await publishingService.scheduleDraft(1, new Date(Date.now() + 3600000));
        expect(job.status).toBe('SCHEDULED');
    });
});
