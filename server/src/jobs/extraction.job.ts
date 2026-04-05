import cron, { ScheduledTask } from 'node-cron';
import { processNewItems } from '../domains/content-intelligence/extraction.service.js';
import { withJobMonitoring } from '../lib/job-monitoring.js';
import { logger } from '../lib/logger.js';

let extractionJobTask: ScheduledTask | null = null;

/**
 * Start the content extraction job
 * Runs every 5 minutes to process NEW items
 */
export function startExtractionJob() {
    if (extractionJobTask) {
        logger.info('[ExtractionJob] Job already running');
        return;
    }

    // Run every 5 minutes
    // Cron pattern: minute hour day month weekday
    // */5 * * * * = every 5 minutes
    extractionJobTask = cron.schedule('*/5 * * * *', async () => {
        try {
            await withJobMonitoring('ExtractionJob', async () => {
                await processNewItems(10); // Process 10 items per batch
            });
        } catch (error) {
            // Error already logged by withJobMonitoring
        }
    });

    logger.info('[ExtractionJob] Started - running every 5 minutes');
}

/**
 * Stop the content extraction job
 */
export function stopExtractionJob() {
    if (extractionJobTask) {
        extractionJobTask.stop();
        extractionJobTask = null;
        logger.info('[ExtractionJob] Stopped');
    }
}

/**
 * Trigger immediate extraction (manual trigger)
 */
export async function triggerImmediateExtraction(limit = 10) {
    return await withJobMonitoring('ExtractionJob-Manual', async () => {
        return await processNewItems(limit);
    });
}

