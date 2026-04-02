import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../db/index.js', () => ({
    prisma: {
        contentDraft: { findUnique: vi.fn(), update: vi.fn() },
        publishJob: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn(), findMany: vi.fn() },
        publishedPost: { create: vi.fn() },
        $transaction: vi.fn(async (fn: any) => fn({
            publishJob: { create: vi.fn().mockResolvedValue({ id: 1, status: 'SCHEDULED' }), update: vi.fn() },
            contentDraft: { update: vi.fn() },
            publishedPost: { create: vi.fn() },
        })),
    },
}));

vi.mock('../../shared/marketing/connectors/stub.connector.js', () => ({
    getConnector: vi.fn().mockReturnValue({
        publish: vi.fn().mockResolvedValue({ externalPostId: 'stub_123', rawResponse: { simulated: true } }),
    }),
}));

vi.mock('../../lib/logger.js', () => ({ logger: { error: vi.fn(), info: vi.fn() } }));

import { prisma } from '../../db/index.js';
import { getConnector } from '../../shared/marketing/connectors/stub.connector.js';
import { PublishingService } from '../../domains/publishing/publishing.service.js';

const mockDraft = (status = 'APPROVED') => ({
    id: 1, contentBriefId: 1, platform: 'FACEBOOK', body: 'Body', status,
    hook: null, cta: null, hashtags: [], version: 1, createdAt: new Date(), updatedAt: new Date(),
});

const mockJob = (status = 'SCHEDULED') => ({
    id: 1, contentDraftId: 1, platform: 'FACEBOOK', status,
    scheduledFor: new Date(), executedAt: null, errorMessage: null,
    createdAt: new Date(), updatedAt: new Date(),
    contentDraft: mockDraft(),
});

describe('PublishingService', () => {
    let service: PublishingService;

    beforeEach(() => {
        service = new PublishingService();
        vi.clearAllMocks();
    });

    it('schedules an approved draft', async () => {
        vi.mocked(prisma.contentDraft.findUnique).mockResolvedValue(mockDraft() as any);
        const txCreate = vi.fn().mockResolvedValue({ id: 1, status: 'SCHEDULED' });
        const txUpdate = vi.fn().mockResolvedValue({});
        vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) =>
            fn({ publishJob: { create: txCreate }, contentDraft: { update: txUpdate } })
        );

        const job = await service.scheduleDraft(1, new Date());
        expect(job.status).toBe('SCHEDULED');
        expect(txUpdate).toHaveBeenCalledWith(
            expect.objectContaining({ data: { status: 'SCHEDULED' } })
        );
    });

    it('throws 422 when draft is not approved', async () => {
        vi.mocked(prisma.contentDraft.findUnique).mockResolvedValue(mockDraft('IN_REVIEW') as any);
        await expect(service.scheduleDraft(1, new Date())).rejects.toMatchObject({ statusCode: 422 });
    });

    it('creates published post on successful execution', async () => {
        vi.mocked(prisma.publishJob.findUnique).mockResolvedValue(mockJob() as any);
        vi.mocked(prisma.publishJob.update).mockResolvedValue({} as any);
        const txCreate = vi.fn().mockResolvedValue({});
        const txJobUpdate = vi.fn().mockResolvedValue({});
        const txDraftUpdate = vi.fn().mockResolvedValue({});
        vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) =>
            fn({ publishedPost: { create: txCreate }, publishJob: { update: txJobUpdate }, contentDraft: { update: txDraftUpdate } })
        );

        await service.executePublishJob(1);

        expect(prisma.publishJob.update).toHaveBeenCalledWith(
            expect.objectContaining({ data: { status: 'PUBLISHING' } })
        );
        expect(txCreate).toHaveBeenCalled();
    });

    it('marks job failed when connector throws', async () => {
        vi.mocked(prisma.publishJob.findUnique).mockResolvedValue(mockJob() as any);
        vi.mocked(prisma.publishJob.update).mockResolvedValue({} as any);
        vi.mocked(getConnector).mockReturnValue({
            platform: 'FACEBOOK' as any,
            publish: vi.fn().mockRejectedValue(new Error('API error')),
        });

        await service.executePublishJob(1);

        expect(prisma.publishJob.update).toHaveBeenLastCalledWith(
            expect.objectContaining({ data: expect.objectContaining({ status: 'FAILED' }) })
        );
    });

    it('retries a failed job', async () => {
        vi.mocked(prisma.publishJob.findUnique).mockResolvedValue(mockJob('FAILED') as any);
        vi.mocked(prisma.publishJob.update).mockResolvedValue({ id: 1, status: 'SCHEDULED' } as any);

        const job = await service.retryJob(1);
        expect(job.status).toBe('SCHEDULED');
    });

    it('throws 422 when retrying a non-failed job', async () => {
        vi.mocked(prisma.publishJob.findUnique).mockResolvedValue(mockJob('SCHEDULED') as any);
        await expect(service.retryJob(1)).rejects.toMatchObject({ statusCode: 422 });
    });
});
