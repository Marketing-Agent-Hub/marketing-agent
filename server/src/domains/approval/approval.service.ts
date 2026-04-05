import { prisma } from '../../db/index.js';

export class ApprovalService {
    private async guardInReview(draftId: number) {
        const draft = await prisma.contentDraft.findUnique({ where: { id: draftId } });
        if (!draft) {
            const err = new Error('Draft khong ton tai') as any;
            err.statusCode = 404;
            err.code = 'NOT_FOUND';
            throw err;
        }
        if (draft.status !== 'IN_REVIEW') {
            const err = new Error(`Draft phai o trang thai IN_REVIEW, hien tai: ${draft.status}`) as any;
            err.statusCode = 422;
            err.code = 'INVALID_STATE_TRANSITION';
            throw err;
        }
        return draft;
    }

    async approveDraft(draftId: number, userId: number, comment?: string) {
        await this.guardInReview(draftId);
        return prisma.$transaction(async tx => {
            await tx.contentApproval.create({
                data: {
                    contentDraftId: draftId,
                    actorUserId: userId,
                    action: 'APPROVED',
                    comment,
                },
            });
            return tx.contentDraft.update({
                where: { id: draftId },
                data: { status: 'APPROVED' },
            });
        });
    }

    async rejectDraft(draftId: number, userId: number, comment?: string) {
        await this.guardInReview(draftId);
        return prisma.$transaction(async tx => {
            await tx.contentApproval.create({
                data: {
                    contentDraftId: draftId,
                    actorUserId: userId,
                    action: 'REJECTED',
                    comment,
                },
            });
            return tx.contentDraft.update({
                where: { id: draftId },
                data: { status: 'REJECTED' },
            });
        });
    }
}

export const approvalService = new ApprovalService();
