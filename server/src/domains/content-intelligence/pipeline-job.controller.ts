import { Request, Response, NextFunction } from 'express';
import { triggerImmediateIngest } from '../../jobs/ingest.job.js';
import { triggerImmediateExtraction } from '../../jobs/extraction.job.js';
import { triggerImmediateFiltering } from '../../jobs/filtering.job.js';
import { triggerImmediateAIStageA } from '../../jobs/ai-stage-a.job.js';
import { triggerImmediateAIStageB } from '../../jobs/ai-stage-b.job.js';

/**
 * Handles manual pipeline job trigger endpoints.
 * Only imports from ../../jobs/ — no domain service imports.
 * All jobs run async; HTTP response is returned immediately.
 * Requirements: 6.1, 6.2, 6.4
 */
export class PipelineJobController {
    async triggerIngest(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            // Fire-and-forget: respond immediately, job runs in background
            triggerImmediateIngest().catch(() => { });
            res.json({ success: true, job: 'ingest', status: 'triggered' });
        } catch (error) {
            next(error);
        }
    }

    async triggerExtraction(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const limit = typeof req.body?.limit === 'number' ? req.body.limit : 10;
            triggerImmediateExtraction(limit).catch(() => { });
            res.json({ success: true, job: 'extraction', status: 'triggered' });
        } catch (error) {
            next(error);
        }
    }

    async triggerFiltering(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const limit = typeof req.body?.limit === 'number' ? req.body.limit : 20;
            triggerImmediateFiltering(limit).catch(() => { });
            res.json({ success: true, job: 'filtering', status: 'triggered' });
        } catch (error) {
            next(error);
        }
    }

    async triggerStageA(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const limit = typeof req.body?.limit === 'number' ? req.body.limit : 5;
            triggerImmediateAIStageA(limit).catch(() => { });
            res.json({ success: true, job: 'ai-stage-a', status: 'triggered' });
        } catch (error) {
            next(error);
        }
    }

    async triggerStageB(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const limit = typeof req.body?.limit === 'number' ? req.body.limit : 3;
            triggerImmediateAIStageB(limit).catch(() => { });
            res.json({ success: true, job: 'ai-stage-b', status: 'triggered' });
        } catch (error) {
            next(error);
        }
    }
}

export const pipelineJobController = new PipelineJobController();
