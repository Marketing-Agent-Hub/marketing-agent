import { Request, Response, NextFunction } from 'express';
import { ApiErrorResponse } from '../../types/index.js';
import { scheduleDraftSchema } from '../../shared/marketing/schemas/publishing.schema.js';
import { publishingService } from './publishing.service.js';

export class PublishingController {
    async scheduleDraft(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const draftId = parseInt(req.params.draftId, 10);
            if (isNaN(draftId)) {
                const r: ApiErrorResponse = { error: { code: 'VALIDATION_ERROR', message: 'Invalid draft ID' } };
                res.status(400).json(r);
                return;
            }

            const { scheduledFor } = scheduleDraftSchema.parse(req.body);
            const job = await publishingService.scheduleDraft(draftId, new Date(scheduledFor));
            res.status(201).json(job);
        } catch (error) {
            next(error);
        }
    }

    async listPublishJobs(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const brandId = parseInt(req.params.brandId, 10);
            const jobs = await publishingService.listPublishJobs(brandId);
            res.json({ jobs });
        } catch (error) {
            next(error);
        }
    }

    async retryJob(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const jobId = parseInt(req.params.id, 10);
            if (isNaN(jobId)) {
                const r: ApiErrorResponse = { error: { code: 'VALIDATION_ERROR', message: 'Invalid job ID' } };
                res.status(400).json(r);
                return;
            }

            const job = await publishingService.retryJob(jobId);
            res.json(job);
        } catch (error) {
            next(error);
        }
    }
}

export const publishingController = new PublishingController();
