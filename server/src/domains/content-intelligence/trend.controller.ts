import { Request, Response, NextFunction } from 'express';
import { trendSignalService } from './trend-signal.service.js';
import { trendMatchingService } from './trend-matching.service.js';

/**
 * Handles trend signal and brand trend matching endpoints.
 * Only imports from trend-signal.service.ts and trend-matching.service.ts.
 * Requirements: 6.1, 6.3
 */
export class TrendController {
    async refreshTrendSignals(_req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const result = await trendSignalService.refreshRecentTrendSignals();
            res.json({ success: true, ...result });
        } catch (error) {
            next(error);
        }
    }

    async matchBrandTrends(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const brandId = parseInt(req.params.brandId, 10);
            const matched = await trendMatchingService.matchBrandToRecentSignals(brandId);
            res.json({ success: true, brandId, matched });
        } catch (error) {
            next(error);
        }
    }

    async listBrandTrends(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const brandId = parseInt(req.params.brandId, 10);
            const matches = await trendMatchingService.getRecentMatchesForBrand(brandId);
            res.json({ brandId, matches });
        } catch (error) {
            next(error);
        }
    }
}

export const trendController = new TrendController();
