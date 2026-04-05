import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../db/index.js', () => ({
    prisma: {
        contentDraft: { findUnique: vi.fn(), update: vi.fn() },
        contentApproval: { create: vi.fn() },
        $transaction: vi.fn(async (fn: any) => fn({
            contentApproval: { create: vi.fn().mockResolvedValue({}) },
            contentDraft: { update: vi.fn().mockResolvedValue({ id: 1, status: 'APPROVED' }) },
        })),
    },
}));

import { prisma } from '../../db/index.js';
import { ApprovalService } from '../../domains/approval/approval.service.js';

const mockDraft = (status = 'IN_REVIEW') => ({
    id: 1, contentBriefId: 1, platform: 'FACEBOOK', body: 'Body', status,
    hook: null, cta: null, hashtags: [], version: 1, createdAt: new Date(), updatedAt: new Date(),
});

describe('ApprovalService', () => {
    let service: ApprovalService;

    beforeEach(() => {
        service = new ApprovalService();
        vi.clearAllMocks();
    });

    it('approves an in-review draft', async () => {
        vi.mocked(prisma.contentDraft.findUnique).mockResolvedValue(mockDraft() as any);
        const txApproval = vi.fn().mockResolvedValue({});
        const txUpdate = vi.fn().mockResolvedValue({ id: 1, status: 'APPROVED' });
        vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) =>
            fn({ contentApproval: { create: txApproval }, contentDraft: { update: txUpdate } })
        );

        const result = await service.approveDraft(1, 42, 'Looks good');

        expect(txApproval).toHaveBeenCalledWith(
            expect.objectContaining({ data: expect.objectContaining({ action: 'APPROVED', actorUserId: 42 }) })
        );
        expect(result.status).toBe('APPROVED');
    });

    it('rejects an in-review draft', async () => {
        vi.mocked(prisma.contentDraft.findUnique).mockResolvedValue(mockDraft() as any);
        const txApproval = vi.fn().mockResolvedValue({});
        const txUpdate = vi.fn().mockResolvedValue({ id: 1, status: 'REJECTED' });
        vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) =>
            fn({ contentApproval: { create: txApproval }, contentDraft: { update: txUpdate } })
        );

        const result = await service.rejectDraft(1, 42, 'Needs revision');

        expect(txApproval).toHaveBeenCalledWith(
            expect.objectContaining({ data: expect.objectContaining({ action: 'REJECTED', actorUserId: 42 }) })
        );
        expect(result.status).toBe('REJECTED');
    });

    it('throws 422 when approving a draft not in review', async () => {
        vi.mocked(prisma.contentDraft.findUnique).mockResolvedValue(mockDraft('APPROVED') as any);
        await expect(service.approveDraft(1, 42)).rejects.toMatchObject({ statusCode: 422 });
    });

    it('throws 422 when rejecting a draft not in review', async () => {
        vi.mocked(prisma.contentDraft.findUnique).mockResolvedValue(mockDraft('SCHEDULED') as any);
        await expect(service.rejectDraft(1, 42)).rejects.toMatchObject({ statusCode: 422 });
    });
});
