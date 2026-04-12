import { withJobMonitoring } from '../../lib/job-monitoring.js';
import { prisma } from '../../db/index.js';
import { contentService } from '../../domains/content/content.service.js';
import { logger } from '../../lib/logger.js';
import { contentPipelineService } from '../../domains/content/pipeline/content-pipeline.service.js';

export async function runDailyContentGenerationJob(): Promise<void> {
    await withJobMonitoring('daily-content-generation', async () => {
        const activeBrands = await prisma.strategyPlan.findMany({
            where: { status: 'ACTIVE' },
            select: { brandId: true },
            distinct: ['brandId'],
        });

        logger.info(`[daily-content-generation] Processing ${activeBrands.length} active brands`);

        for (const { brandId } of activeBrands) {
            try {
                await contentService.generateDailyContent(brandId, 3);
            } catch (err) {
                logger.error({ err, brandId }, '[daily-content-generation] Failed for brand');
            }
        }
    });
}

/**
 * Per-brand daily content generation runner for TenantJobScheduler
 */
export async function dailyContentForBrand(brandId: number): Promise<void> {
    try {
        await contentService.generateDailyContent(brandId, 3);
    } catch (err) {
        logger.error({ err, brandId }, '[daily-content-generation] Per-brand run failed');
    }
}

/**
 * Daily pipeline job using the new multi-agent content pipeline
 * Runs at 8:00 AM daily (cron: 0 8 * * *)
 */
export async function runDailyPipelineJob(): Promise<void> {
    await withJobMonitoring('daily-pipeline', async () => {
        const brands = await prisma.brand.findMany({
            where: { status: 'ACTIVE' },
            include: { profile: true },
        });

        logger.info({ brandCount: brands.length }, '[daily-pipeline] Starting content pipeline batch');

        let totalDrafts = 0;
        const errors: string[] = [];

        for (const brand of brands) {
            try {
                const items = await prisma.item.findMany({
                    where: { brandId: brand.id, status: 'READY_FOR_AI' },
                    include: { article: true },
                });

                if (items.length === 0) continue;

                const result = await contentPipelineService.processDailyBatch(brand as any, items as any);
                totalDrafts += result.totalDrafts;
                errors.push(...result.errors);

                logger.info({ brandId: brand.id, processed: result.processed, drafts: result.totalDrafts }, '[daily-pipeline] Brand processed');
            } catch (err) {
                const msg = `Brand ${brand.id}: ${(err as Error).message}`;
                errors.push(msg);
                logger.error({ err, brandId: brand.id }, '[daily-pipeline] Brand processing failed');
            }
        }

        logger.info({
            brandsProcessed: brands.length,
            totalDrafts,
            errorCount: errors.length,
            errors,
        }, '[daily-pipeline] Content pipeline batch complete');
    });
}

/**
 * Per-brand pipeline runner for TenantJobScheduler
 */
export async function dailyPipelineForBrand(brandId: number): Promise<void> {
    try {
        const brand = await prisma.brand.findUnique({
            where: { id: brandId },
            include: { profile: true },
        });

        if (!brand) {
            logger.warn({ brandId }, '[daily-pipeline] Brand not found');
            return;
        }

        const items = await prisma.item.findMany({
            where: { brandId, status: 'READY_FOR_AI' },
            include: { article: true },
        });

        if (items.length === 0) {
            logger.info({ brandId }, '[daily-pipeline] No items to process');
            return;
        }

        const result = await contentPipelineService.processDailyBatch(brand as any, items as any);
        logger.info({ brandId, processed: result.processed, totalDrafts: result.totalDrafts, errors: result.errors }, '[daily-pipeline] Per-brand pipeline complete');
    } catch (err) {
        logger.error({ err, brandId }, '[daily-pipeline] Per-brand pipeline failed');
    }
}
