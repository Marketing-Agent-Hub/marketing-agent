import { withJobMonitoring } from '../../lib/job-monitoring.js';
import { prisma } from '../../db/index.js';
import { contentService } from '../../domains/content/content.service.js';
import { logger } from '../../lib/logger.js';

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
