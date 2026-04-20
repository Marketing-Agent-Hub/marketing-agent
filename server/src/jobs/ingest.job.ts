import cron, { ScheduledTask } from 'node-cron';
import { ingestAllSources, ingestAllBrandSources, ingestBrandSource } from '../domains/content-intelligence/ingest.service.js';
import { withJobMonitoring } from '../lib/job-monitoring.js';
import { logger } from '../lib/logger.js';

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
                // TODO: Migration path - once all sources are migrated to BrandSource,
                // replace ingestAllSources() with ingestAllBrandSources() exclusively.
                // For now, run both to support legacy sources and multi-tenant sources.
                await ingestAllSources();
                await ingestAllBrandSources();
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

/**
 * Trigger immediate multi-tenant brand ingestion (manual trigger)
 */
export async function triggerImmediateBrandIngestion() {
    console.log('[IngestJob] Manual trigger - starting immediate brand ingestion...');
    try {
        await ingestAllBrandSources();
        console.log('[IngestJob] Manual brand ingestion completed successfully');
    } catch (error) {
        console.error('[IngestJob] Error during manual brand ingestion:', error);
        throw error;
    }
}


/**
 * Per-brand ingest runner for TenantJobScheduler
 */
export async function ingestForBrand(brandId: number): Promise<void> {
    const brandSources = await (await import('../db/index.js')).prisma.brandSource.findMany({
        where: { enabled: true, brandId },
        include: {
            source: {
                select: { id: true, name: true, type: true, config: true, rssUrl: true, fetchIntervalMinutes: true, lastFetchedAt: true },
            },
        },
    });

    logger.info(`[IngestJob] Per-brand ingest for brand ${brandId}: ${brandSources.length} sources`);
    for (const bs of brandSources) {
        try {
            await ingestBrandSource(bs);
        } catch (err) {
            logger.error({ err, brandId, sourceId: bs.sourceId }, '[IngestJob] Per-brand source ingest failed');
        }
    }
}
