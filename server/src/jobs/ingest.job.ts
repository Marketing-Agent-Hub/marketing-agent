import cron, { ScheduledTask } from 'node-cron';
import { ingestAllSources } from '../services/ingest.service.js';
import { withJobMonitoring } from '../lib/job-monitoring';
import { logger } from '../lib/logger';

let ingestJobTask: ScheduledTask | null = null;

/**
 * Start the RSS ingest job
 * Runs every 15 minutes to check and fetch RSS feeds
 */
export function startIngestJob() {
    if (ingestJobTask) {
        logger.info('[IngestJob] Job already running');
        return;
    }

    // Run every 15 minutes
    // Cron pattern: minute hour day month weekday
    // */15 * * * * = every 15 minutes
    ingestJobTask = cron.schedule('*/15 * * * *', async () => {
        try {
            await withJobMonitoring('IngestJob', async () => {
                await ingestAllSources();
            });
        } catch (error) {
            // Error already logged by withJobMonitoring
        }
    });

    logger.info('[IngestJob] Started - running every 15 minutes');
}

/**
 * Stop the RSS ingest job
 */
export function stopIngestJob() {
    if (ingestJobTask) {
        ingestJobTask.stop();
        ingestJobTask = null;
        console.log('[IngestJob] Stopped');
    }
}

/**
 * Trigger immediate ingestion (manual trigger)
 */
export async function triggerImmediateIngest() {
    console.log('[IngestJob] Manual trigger - starting immediate ingestion...');
    try {
        await ingestAllSources();
        console.log('[IngestJob] Manual ingestion completed successfully');
    } catch (error) {
        console.error('[IngestJob] Error during manual ingestion:', error);
        throw error;
    }
}
