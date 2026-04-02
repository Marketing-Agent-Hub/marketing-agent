import { prisma } from '../db/index.js';
import { withJobMonitoring } from '../lib/job-monitoring.js';
import { logger } from '../lib/logger.js';
import { trendSignalService } from '../domains/content-intelligence/trend-signal.service.js';
import { trendMatchingService } from '../domains/content-intelligence/trend-matching.service.js';

export async function runTrendMatchingJob(): Promise<void> {
    await withJobMonitoring('trend-matching', async () => {
        await trendSignalService.refreshRecentTrendSignals();

        const brands = await prisma.brand.findMany({
            where: { status: 'ACTIVE' },
            select: { id: true },
        });

        for (const brand of brands) {
            try {
                await trendMatchingService.matchBrandToRecentSignals(brand.id);
            } catch (error) {
                logger.error({ error, brandId: brand.id }, '[trend-matching] Failed for brand');
            }
        }
    });
}
