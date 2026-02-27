import { Request, Response, NextFunction } from 'express';
import { statsService } from '../services/stats.service';

export class StatsController {
    /**
     * GET /stats/pipeline
     */
    async getPipelineStats(_req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const stats = await statsService.getPipelineStats();
            res.json(stats);
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /stats/activity
     */
    async getRecentActivity(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const limit = parseInt(req.query.limit as string) || 10;
            const activity = await statsService.getRecentActivity(limit);
            res.json(activity);
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /stats/bottlenecks
     */
    async getBottlenecks(_req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const bottlenecks = await statsService.getBottlenecks();
            res.json({ bottlenecks });
        } catch (error) {
            next(error);
        }
    }
}

export const statsController = new StatsController();
