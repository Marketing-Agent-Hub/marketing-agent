import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../db/index.js', () => ({
    prisma: {
        onboardingSession: {
            create: vi.fn(),
            findUnique: vi.fn(),
            update: vi.fn(),
        },
    },
}));

vi.mock('../../lib/logger.js', () => ({ logger: { error: vi.fn(), info: vi.fn() } }));

import { prisma } from '../../db/index.js';
import { OnboardingService } from '../../domains/onboarding/onboarding.service.js';

const mockSession = (overrides = {}) => ({
    id: 1, brandId: 5, transcript: [], status: 'IN_PROGRESS',
    completedAt: null, createdAt: new Date(), updatedAt: new Date(),
    ...overrides,
});

describe('OnboardingService', () => {
    let service: OnboardingService;

    beforeEach(() => {
        service = new OnboardingService();
        vi.clearAllMocks();
    });

    it('creates a new session with empty transcript', async () => {
        vi.mocked(prisma.onboardingSession.create).mockResolvedValue(mockSession() as any);
        const result = await service.createSession(5);
        expect(prisma.onboardingSession.create).toHaveBeenCalledWith({
            data: { brandId: 5, transcript: [], status: 'IN_PROGRESS' },
        });
        expect(result.status).toBe('IN_PROGRESS');
    });

    it('adds a message to transcript', async () => {
        vi.mocked(prisma.onboardingSession.findUnique).mockResolvedValue(mockSession() as any);
        vi.mocked(prisma.onboardingSession.update).mockResolvedValue(
            mockSession({ transcript: [{ role: 'user', content: 'Hello', timestamp: '' }] }) as any
        );
        const result = await service.addMessage(1, { role: 'user', content: 'Hello' });
        expect(prisma.onboardingSession.update).toHaveBeenCalled();
        expect(result.transcript).toHaveLength(1);
    });

    it('rejects addMessage when session is completed', async () => {
        vi.mocked(prisma.onboardingSession.findUnique).mockResolvedValue(
            mockSession({ status: 'COMPLETED' }) as any
        );
        await expect(service.addMessage(1, { role: 'user', content: 'Hi' }))
            .rejects.toMatchObject({ statusCode: 422 });
    });

    it('rejects completeSession when transcript is empty', async () => {
        vi.mocked(prisma.onboardingSession.findUnique).mockResolvedValue(mockSession() as any);
        await expect(service.completeSession(1)).rejects.toMatchObject({ statusCode: 422 });
    });

    it('marks session completed and triggers analysis job', async () => {
        vi.mocked(prisma.onboardingSession.findUnique).mockResolvedValue(
            mockSession({ transcript: [{ role: 'user', content: 'Hi', timestamp: '' }] }) as any
        );
        vi.mocked(prisma.onboardingSession.update).mockResolvedValue(
            mockSession({ status: 'COMPLETED', completedAt: new Date() }) as any
        );
        const result = await service.completeSession(1);
        expect(result.status).toBe('COMPLETED');
        expect(prisma.onboardingSession.update).toHaveBeenCalledWith(
            expect.objectContaining({ data: expect.objectContaining({ status: 'COMPLETED' }) })
        );
    });
});
