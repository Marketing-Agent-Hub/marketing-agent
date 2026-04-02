import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockOutput = {
    summary: 'B2B CRM for SMBs',
    targetAudience: [{ segment: 'Sales managers', painPoints: ['Too much manual work'] }],
    valueProps: ['Save 2 hours/day'],
    toneGuidelines: { voice: 'Professional', avoid: ['jargon'] },
    businessGoals: ['Increase MRR'],
    messagingAngles: ['Productivity'],
    contentPillarCandidates: [{ name: 'Sales Tips', description: 'Tips for sales teams' }],
};

vi.mock('../../db/index.js', () => ({
    prisma: {
        brand: { findUnique: vi.fn() },
        onboardingSession: { findUnique: vi.fn() },
        generationRun: { create: vi.fn(), update: vi.fn() },
        brandProfile: { upsert: vi.fn(), findUnique: vi.fn().mockResolvedValue({ brandId: 1 }) },
        contentPillar: { deleteMany: vi.fn(), createMany: vi.fn() },
        $transaction: vi.fn(async (fn: any) => fn({
            brandProfile: { upsert: vi.fn().mockResolvedValue({}) },
            contentPillar: { deleteMany: vi.fn(), createMany: vi.fn() },
        })),
    },
}));

vi.mock('../../config/ai.config.js', () => ({
    openai: {
        chat: {
            completions: {
                create: vi.fn(),
            },
        },
    },
}));

vi.mock('../../shared/marketing/settings.js', () => ({
    getAIModel: vi.fn().mockResolvedValue('gpt-4o-mini'),
}));

import { prisma } from '../../db/index.js';
import { openai } from '../../config/ai.config.js';
import { BrandAnalysisService } from '../../domains/brand/brand-analysis.service.js';

const mockBrand = { id: 1, workspaceId: 10, name: 'Acme', knowledgeDocs: [] };
const mockSession = { id: 1, brandId: 1, transcript: [{ role: 'user', content: 'We sell CRM', timestamp: '' }] };

describe('BrandAnalysisService', () => {
    let service: BrandAnalysisService;

    beforeEach(() => {
        service = new BrandAnalysisService();
        vi.clearAllMocks();
        vi.mocked(prisma.brand.findUnique).mockResolvedValue(mockBrand as any);
        vi.mocked(prisma.onboardingSession.findUnique).mockResolvedValue(mockSession as any);
        vi.mocked(prisma.generationRun.create).mockResolvedValue({ id: 99 } as any);
        vi.mocked(prisma.generationRun.update).mockResolvedValue({} as any);
        vi.mocked(prisma.brandProfile.upsert).mockResolvedValue({} as any);
    });

    it('creates a RUNNING generation run before OpenAI call', async () => {
        vi.mocked(openai.chat.completions.create).mockResolvedValue({
            choices: [{ message: { content: JSON.stringify(mockOutput) } }],
            usage: { prompt_tokens: 100, completion_tokens: 200 },
        } as any);

        await service.runBusinessAnalysis(1, 1);

        expect(prisma.generationRun.create).toHaveBeenCalledWith(
            expect.objectContaining({ data: expect.objectContaining({ status: 'RUNNING', workflow: 'business-analysis' }) })
        );
    });

    it('updates generation run to COMPLETED on success', async () => {
        vi.mocked(openai.chat.completions.create).mockResolvedValue({
            choices: [{ message: { content: JSON.stringify(mockOutput) } }],
            usage: { prompt_tokens: 100, completion_tokens: 200 },
        } as any);

        await service.runBusinessAnalysis(1, 1);

        expect(prisma.generationRun.update).toHaveBeenCalledWith(
            expect.objectContaining({ data: expect.objectContaining({ status: 'COMPLETED' }) })
        );
    });

    it('updates generation run to FAILED on OpenAI error', async () => {
        vi.mocked(openai.chat.completions.create).mockRejectedValue(new Error('OpenAI error'));

        await expect(service.runBusinessAnalysis(1, 1)).rejects.toThrow('OpenAI error');

        expect(prisma.generationRun.update).toHaveBeenCalledWith(
            expect.objectContaining({ data: { status: 'FAILED' } })
        );
    });
});
