import cron, { ScheduledTask } from 'node-cron';
import { filterExtractedItems } from '../services/filtering.service.js';
import { withJobMonitoring } from '../lib/job-monitoring.js';
import { logger } from '../lib/logger.js';

let filteringJobTask: ScheduledTask | null = null;

/**
 * Start the content filtering job
 * Runs every 3 minutes to filter EXTRACTED items
 */
export function startFilteringJob() {
    if (filteringJobTask) {
        logger.info('[FilteringJob] Job already running');
        return;
    }

    // Run every 3 minutes
    // Cron pattern: minute hour day month weekday
    // */3 * * * * = every 3 minutes
    filteringJobTask = cron.schedule('*/3 * * * *', async () => {
        try {
            await withJobMonitoring('FilteringJob', async () => {
                await filterExtractedItems(20); // Process 20 items per batch
            });
        } catch (error) {
            // Error already logged
        }
    });

    logger.info('[FilteringJob] Started - running every 3 minutes');
}

/**
 * Stop the content filtering job
 */
export function stopFilteringJob() {
    if (filteringJobTask) {
        filteringJobTask.stop();
        filteringJobTask = null;
        logger.info('[FilteringJob] Stopped');
    }
}

/**
 * Trigger immediate filtering (manual trigger)
 */
export async function triggerImmediateFiltering(limit = 20) {
    return await withJobMonitoring('FilteringJob-Manual', async () => {
        return await filterExtractedItems(limit);
    });
}

