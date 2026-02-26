import cron, { ScheduledTask } from 'node-cron';
import { processNewItems } from '../services/extraction.service.js';

let extractionJobTask: ScheduledTask | null = null;

/**
 * Start the content extraction job
 * Runs every 5 minutes to process NEW items
 */
export function startExtractionJob() {
    if (extractionJobTask) {
        console.log('[ExtractionJob] Job already running');
        return;
    }

    // Run every 5 minutes
    // Cron pattern: minute hour day month weekday
    // */5 * * * * = every 5 minutes
    extractionJobTask = cron.schedule('*/5 * * * *', async () => {
        console.log('[ExtractionJob] Starting scheduled content extraction...');
        try {
            await processNewItems(10); // Process 10 items per batch
            console.log('[ExtractionJob] Scheduled extraction completed successfully');
        } catch (error) {
            console.error('[ExtractionJob] Error during scheduled extraction:', error);
        }
    });

    console.log('[ExtractionJob] Started - running every 5 minutes');
}

/**
 * Stop the content extraction job
 */
export function stopExtractionJob() {
    if (extractionJobTask) {
        extractionJobTask.stop();
        extractionJobTask = null;
        console.log('[ExtractionJob] Stopped');
    }
}

/**
 * Trigger immediate extraction (manual trigger)
 */
export async function triggerImmediateExtraction(limit = 10) {
    console.log('[ExtractionJob] Manual trigger - starting immediate extraction...');
    try {
        const result = await processNewItems(limit);
        console.log('[ExtractionJob] Manual extraction completed successfully');
        return result;
    } catch (error) {
        console.error('[ExtractionJob] Error during manual extraction:', error);
        throw error;
    }
}
