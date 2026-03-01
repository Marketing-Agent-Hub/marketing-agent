import { DailyPost, PostStatus } from '@prisma/client';
import { prisma } from '../db/index.js';
import {
    UpdateDraftInput,
    RejectDraftInput,
    GetDraftsQuery,
} from '../schemas/draft.schema.js';

export class DraftService {
    /**
     * Get all drafts with filters
     */
    async getAllDrafts(query: GetDraftsQuery = {}) {
        const where: any = {};

        if (query.status) {
            where.status = query.status;
        }

        if (query.targetDate) {
            where.targetDate = new Date(query.targetDate);
        }

        if (query.timeSlot) {
            where.timeSlot = query.timeSlot;
        }

        return prisma.dailyPost.findMany({
            where,
            include: {
                postItems: {
                    include: {
                        item: {
                            include: {
                                source: true,
                                aiResults: {
                                    where: { stage: 'B' },
                                    orderBy: { createdAt: 'desc' },
                                    take: 1,
                                },
                            },
                        },
                    },
                },
            },
            orderBy: [{ targetDate: 'desc' }, { timeSlot: 'asc' }],
        });
    }

    /**
     * Get draft by ID with full details
     */
    async getDraftById(id: number) {
        return prisma.dailyPost.findUnique({
            where: { id },
            include: {
                postItems: {
                    include: {
                        item: {
                            include: {
                                source: true,
                                article: true,
                                aiResults: {
                                    where: { stage: 'B' },
                                    orderBy: { createdAt: 'desc' },
                                    take: 1,
                                },
                            },
                        },
                    },
                },
            },
        });
    }

    /**
     * Update draft content
     */
    async updateDraft(id: number, input: UpdateDraftInput): Promise<DailyPost | null> {
        // Check if draft exists and is still in DRAFT status
        const existing = await prisma.dailyPost.findUnique({
            where: { id },
        });

        if (!existing) {
            return null;
        }

        if (existing.status !== PostStatus.DRAFT) {
            throw new Error('Cannot edit a post that is not in DRAFT status');
        }

        return prisma.dailyPost.update({
            where: { id },
            data: input,
        });
    }

    /**
     * Approve draft
     */
    async approveDraft(id: number): Promise<DailyPost | null> {
        const existing = await prisma.dailyPost.findUnique({
            where: { id },
        });

        if (!existing) {
            return null;
        }

        if (existing.status !== PostStatus.DRAFT) {
            throw new Error('Only DRAFT posts can be approved');
        }

        // Validate that content is not empty
        const finalContent = existing.editedContent || existing.content;
        if (!finalContent || finalContent.trim().length === 0) {
            throw new Error('Cannot approve a post with empty content');
        }

        return prisma.dailyPost.update({
            where: { id },
            data: {
                status: PostStatus.APPROVED,
            },
        });
    }

    /**
     * Reject draft
     */
    async rejectDraft(id: number, input: RejectDraftInput): Promise<DailyPost | null> {
        const existing = await prisma.dailyPost.findUnique({
            where: { id },
        });

        if (!existing) {
            return null;
        }

        if (existing.status !== PostStatus.DRAFT) {
            throw new Error('Only DRAFT posts can be rejected');
        }

        return prisma.dailyPost.update({
            where: { id },
            data: {
                status: PostStatus.REJECTED,
                rejectionReason: input.rejectionReason,
            },
        });
    }
}

export const draftService = new DraftService();

