import cron, { ScheduledTask } from 'node-cron';
import { logger } from '../lib/logger.js';
import { startIngestJob, stopIngestJob } from './ingest.job.js';
import { startExtractionJob, stopExtractionJob } from './extraction.job.js';
import { startFilteringJob, stopFilteringJob } from './filtering.job.js';
import { startAIStageAJob, stopAIStageAJob } from './ai-stage-a.job.js';
import { startAIStageBJob, stopAIStageBJob } from './ai-stage-b.job.js';
import { runDailyContentGenerationJob } from './marketing/daily-content-generation.job.js';
import { runPublishSchedulerJob } from './marketing/publish-scheduler.job.js';
import { runTrendMatchingJob } from './trend-matching.job.js';

let dailyContentTask: ScheduledTask | null = null;
let publishSchedulerTask: ScheduledTask | null = null;
let trendMatchingTask: ScheduledTask | null = null;

export function startBackgroundJobs(): void {
    logger.info('Starting background jobs...');

    startIngestJob();
    startExtractionJob();
    startFilteringJob();

    try {
        startAIStageAJob();
        startAIStageBJob();
    } catch (error) {
        logger.warn('AI jobs not started (OpenAI not configured)');
        logger.warn('Set OPENAI_API_KEY in .env to enable AI processing');
    }

    if (!dailyContentTask) {
        dailyContentTask = cron.schedule('0 6 * * *', () => {
            runDailyContentGenerationJob().catch(err => logger.error({ err }, 'Daily content generation failed'));
        });
        logger.info('[Marketing] daily-content-generation.job scheduled: 0 6 * * *');
    }

    if (!publishSchedulerTask) {
        publishSchedulerTask = cron.schedule('*/5 * * * *', () => {
            runPublishSchedulerJob().catch(err => logger.error({ err }, 'Publish scheduler failed'));
        });
        logger.info('[Marketing] publish-scheduler.job scheduled: */5 * * * *');
    }

    if (!trendMatchingTask) {
        trendMatchingTask = cron.schedule('0 * * * *', () => {
            runTrendMatchingJob().catch(err => logger.error({ err }, 'Trend matching failed'));
        });
        logger.info('[Content-Intelligence] trend-matching.job scheduled: 0 * * * *');
    }
}

export function stopBackgroundJobs(): void {
    stopIngestJob();
    stopExtractionJob();
    stopFilteringJob();
    stopAIStageAJob();
    stopAIStageBJob();

    if (dailyContentTask) {
        dailyContentTask.stop();
        dailyContentTask = null;
    }

    if (publishSchedulerTask) {
        publishSchedulerTask.stop();
        publishSchedulerTask = null;
    }

    if (trendMatchingTask) {
        trendMatchingTask.stop();
        trendMatchingTask = null;
    }
}
