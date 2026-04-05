import { SocialPlatform } from '@prisma/client';
import { prisma } from '../../db/index.js';
import { logger } from '../../lib/logger.js';
import { getConnector } from '../../shared/marketing/connectors/stub.connector.js';

export class PublishingService {
    async scheduleDraft(draftId: number, scheduledFor: Date) {
        const draft = await prisma.contentDraft.findUnique({ where: { id: draftId } });
        if (!draft) {
            const err = new Error('Draft không tồn tại') as any;
            err.statusCode = 404; err.code = 'NOT_FOUND'; throw err;
        }
        if (draft.status !== 'APPROVED') {
            const err = new Error(`Chỉ có thể lên lịch draft ở trạng thái APPROVED, hiện tại: ${draft.status}`) as any;
            err.statusCode = 422; err.code = 'INVALID_STATE_TRANSITION'; throw err;
        }

        return prisma.$transaction(async (tx) => {
            const job = await tx.publishJob.create({
                data: {
                    contentDraftId: draftId,
                    platform: draft.platform,
                    status: 'SCHEDULED',
                    scheduledFor,
                },
            });
            await tx.contentDraft.update({ where: { id: draftId }, data: { status: 'SCHEDULED' } });
            return job;
        });
    }

    async listPublishJobs(brandId: number) {
        return prisma.publishJob.findMany({
            where: { contentDraft: { contentBrief: { brandId } } },
            orderBy: { scheduledFor: 'desc' },
            include: { contentDraft: { select: { platform: true, hook: true } } },
        });
    }

    async retryJob(jobId: number) {
        const job = await prisma.publishJob.findUnique({ where: { id: jobId } });
        if (!job) {
            const err = new Error('PublishJob không tồn tại') as any;
            err.statusCode = 404; err.code = 'NOT_FOUND'; throw err;
        }
        if (job.status !== 'FAILED') {
            const err = new Error(`Chỉ có thể retry job ở trạng thái FAILED, hiện tại: ${job.status}`) as any;
            err.statusCode = 422; err.code = 'INVALID_STATE_TRANSITION'; throw err;
        }
        return prisma.publishJob.update({
            where: { id: jobId },
            data: { status: 'SCHEDULED', errorMessage: null },
        });
    }

    async executePublishJob(jobId: number): Promise<void> {
        const job = await prisma.publishJob.findUnique({
            where: { id: jobId },
            include: { contentDraft: true },
        });
        if (!job || job.status !== 'SCHEDULED') return;

        await prisma.publishJob.update({ where: { id: jobId }, data: { status: 'PUBLISHING' } });

        try {
            const connector = getConnector(job.platform as SocialPlatform);
            const result = await connector.publish(job, job.contentDraft);

            await prisma.$transaction(async (tx) => {
                await tx.publishedPost.create({
                    data: {
                        publishJobId: jobId,
                        externalPostId: result.externalPostId,
                        platform: job.platform,
                        publishedAt: new Date(),
                        rawResponse: result.rawResponse as any,
                    },
                });
                await tx.publishJob.update({
                    where: { id: jobId },
                    data: { status: 'PUBLISHED', executedAt: new Date() },
                });
                await tx.contentDraft.update({
                    where: { id: job.contentDraftId },
                    data: { status: 'PUBLISHED' },
                });
            });
        } catch (err: any) {
            logger.error({ err, jobId }, '[publishing] executePublishJob failed');
            await prisma.publishJob.update({
                where: { id: jobId },
                data: { status: 'FAILED', errorMessage: err.message },
            });
        }
    }
}

export const publishingService = new PublishingService();
