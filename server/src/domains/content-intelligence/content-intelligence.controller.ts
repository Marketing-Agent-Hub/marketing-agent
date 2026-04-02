import { Request, Response, NextFunction } from 'express';
import { triggerImmediateIngest } from '../../jobs/ingest.job.js';
import { triggerImmediateExtraction } from '../../jobs/extraction.job.js';
import { triggerImmediateFiltering } from '../../jobs/filtering.job.js';
import { triggerImmediateAIStageA } from '../../jobs/ai-stage-a.job.js';
import { triggerImmediateAIStageB } from '../../jobs/ai-stage-b.job.js';
import { trendSignalService } from './trend-signal.service.js';
import { trendMatchingService } from './trend-matching.service.js';

export class ContentIntelligenceController {
    async triggerIngest(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const result = await triggerImmediateIngest();
            res.json({ success: true, job: 'ingest', result });
        } catch (error) {
            next(error);
        }
    }

    async triggerExtraction(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const limit = typeof req.body?.limit === 'number' ? req.body.limit : 10;
            const result = await triggerImmediateExtraction(limit);
            res.json({ success: true, job: 'extraction', result });
        } catch (error) {
            next(error);
        }
    }

    async triggerFiltering(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const limit = typeof req.body?.limit === 'number' ? req.body.limit : 20;
            const result = await triggerImmediateFiltering(limit);
            res.json({ success: true, job: 'filtering', result });
        } catch (error) {
            next(error);
        }
    }

    async triggerStageA(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const limit = typeof req.body?.limit === 'number' ? req.body.limit : 5;
            const result = await triggerImmediateAIStageA(limit);
            res.json({ success: true, job: 'ai-stage-a', result });
        } catch (error) {
            next(error);
        }
    }

    async triggerStageB(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const limit = typeof req.body?.limit === 'number' ? req.body.limit : 3;
            const result = await triggerImmediateAIStageB(limit);
            res.json({ success: true, job: 'ai-stage-b', result });
        } catch (error) {
            next(error);
        }
    }

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

export const contentIntelligenceController = new ContentIntelligenceController();
