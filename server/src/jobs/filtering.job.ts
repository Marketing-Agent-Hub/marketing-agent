import cron, { ScheduledTask } from 'node-cron';
import { filterExtractedItems, filterExtractedItemsForBrand } from '../domains/content-intelligence/filtering.service.js';
import { withJobMonitoring } from '../lib/job-monitoring.js';
import { logger } from '../lib/logger.js';
import { prisma } from '../db/index.js';

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
                await runFilteringForAllBrands();
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

/**
 * Run filtering for all brands that have EXTRACTED items
 */
export async function runFilteringForAllBrands(): Promise<void> {
    logger.info('[FilteringJob] Starting multi-tenant filtering for all brands');

    const brandRows = await prisma.item.findMany({
        where: { status: 'EXTRACTED' },
        select: { brandId: true },
        distinct: ['brandId'],
    });

    const brandIds = brandRows.map(r => r.brandId).filter((id): id is number => id !== null);
    logger.info(`[FilteringJob] Found ${brandIds.length} brands with EXTRACTED items`);

    for (const brandId of brandIds) {
        await filterExtractedItemsForBrand(brandId, 20);
    }

    logger.info('[FilteringJob] Completed multi-tenant filtering for all brands');
}

