import cron, { ScheduledTask } from 'node-cron';
import { filterExtractedItems } from '../services/filtering.service.js';

let filteringJobTask: ScheduledTask | null = null;

/**
 * Start the content filtering job
 * Runs every 3 minutes to filter EXTRACTED items
 */
export function startFilteringJob() {
    if (filteringJobTask) {
        console.log('[FilteringJob] Job already running');
        return;
    }

    // Run every 3 minutes
    // Cron pattern: minute hour day month weekday
    // */3 * * * * = every 3 minutes
    filteringJobTask = cron.schedule('*/3 * * * *', async () => {
        console.log('[FilteringJob] Starting scheduled content filtering...');
        try {
            await filterExtractedItems(20); // Process 20 items per batch
            console.log('[FilteringJob] Scheduled filtering completed successfully');
        } catch (error) {
            console.error('[FilteringJob] Error during scheduled filtering:', error);
        }
    });

    console.log('[FilteringJob] Started - running every 3 minutes');
}

/**
 * Stop the content filtering job
 */
export function stopFilteringJob() {
    if (filteringJobTask) {
        filteringJobTask.stop();
        filteringJobTask = null;
        console.log('[FilteringJob] Stopped');
    }
}

/**
 * Trigger immediate filtering (manual trigger)
 */
export async function triggerImmediateFiltering(limit = 20) {
    console.log('[FilteringJob] Manual trigger - starting immediate filtering...');
    try {
        const result = await filterExtractedItems(limit);
        console.log('[FilteringJob] Manual filtering completed successfully');
        return result;
    } catch (error) {
        console.error('[FilteringJob] Error during manual filtering:', error);
        throw error;
    }
}
