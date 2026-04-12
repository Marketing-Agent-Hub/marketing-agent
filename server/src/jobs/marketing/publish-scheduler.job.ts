import { withJobMonitoring } from '../../lib/job-monitoring.js';
import { prisma } from '../../db/index.js';
import { publishingService } from '../../domains/publishing/publishing.service.js';
import { logger } from '../../lib/logger.js';

export async function runPublishSchedulerJob(): Promise<void> {
    await withJobMonitoring('publish-scheduler', async () => {
        const dueJobs = await prisma.publishJob.findMany({
            where: { status: 'SCHEDULED', scheduledFor: { lte: new Date() } },
            take: 50,
            orderBy: { scheduledFor: 'asc' },
        });

        logger.info(`[publish-scheduler] Processing ${dueJobs.length} due jobs`);

        for (const job of dueJobs) {
            try {
                await publishingService.executePublishJob(job.id);
            } catch (err) {
                logger.error({ err, jobId: job.id }, '[publish-scheduler] Failed to execute job');
            }
        }
    });
}

/**
 * Per-brand publish scheduler runner for TenantJobScheduler
 */
export async function publishSchedulerForBrand(brandId: number): Promise<void> {
    const dueJobs = await prisma.publishJob.findMany({
        where: {
            status: 'SCHEDULED',
            scheduledFor: { lte: new Date() },
            contentDraft: { contentBrief: { brandId } },
        },
        take: 20,
        orderBy: { scheduledFor: 'asc' },
    });

    for (const job of dueJobs) {
        try {
            await publishingService.executePublishJob(job.id);
        } catch (err) {
            logger.error({ err, jobId: job.id, brandId }, '[publish-scheduler] Per-brand job failed');
        }
    }
}
