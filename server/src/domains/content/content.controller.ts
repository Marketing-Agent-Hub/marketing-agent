import { Request, Response, NextFunction } from 'express';
import { ApiErrorResponse } from '../../types/index.js';
import { contentService } from './content.service.js';
import { approvalController } from '../approval/approval.controller.js';
import { editDraftSchema, generateDailyContentSchema, listBriefsSchema } from '../../shared/marketing/schemas/content.schema.js';

export class ContentController {
    async generateDailyContent(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const brandId = parseInt(req.params.brandId, 10);
            const { daysAhead } = generateDailyContentSchema.parse(req.body);
            await contentService.generateDailyContent(brandId, daysAhead);
            res.json({ message: 'Content generation triggered', brandId, daysAhead });
        } catch (error) {
            next(error);
        }
    }

    async listBriefs(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const brandId = parseInt(req.params.brandId, 10);
            const { page, limit } = listBriefsSchema.parse(req.query);
            const result = await contentService.listBriefs(brandId, page, limit);
            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    async getBrief(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const briefId = parseInt(req.params.briefId, 10);
            if (isNaN(briefId)) {
                const r: ApiErrorResponse = { error: { code: 'VALIDATION_ERROR', message: 'Invalid brief ID' } };
                res.status(400).json(r);
                return;
            }

            const brief = await contentService.getBrief(briefId);
            if (!brief) {
                const r: ApiErrorResponse = { error: { code: 'NOT_FOUND', message: 'Brief not found' } };
                res.status(404).json(r);
                return;
            }

            res.json(brief);
        } catch (error) {
            next(error);
        }
    }

    async regenerateDrafts(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const briefId = parseInt(req.params.briefId, 10);
            if (isNaN(briefId)) {
                const r: ApiErrorResponse = { error: { code: 'VALIDATION_ERROR', message: 'Invalid brief ID' } };
                res.status(400).json(r);
                return;
            }

            const drafts = await contentService.regenerateDrafts(briefId);
            res.json({ drafts });
        } catch (error) {
            next(error);
        }
    }

    async editDraft(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const draftId = parseInt(req.params.draftId, 10);
            if (isNaN(draftId)) {
                const r: ApiErrorResponse = { error: { code: 'VALIDATION_ERROR', message: 'Invalid draft ID' } };
                res.status(400).json(r);
                return;
            }

            const input = editDraftSchema.parse(req.body);
            const draft = await contentService.editDraft(draftId, input);
            res.json(draft);
        } catch (error) {
            next(error);
        }
    }

    async getReviewQueue(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const brandId = parseInt(req.params.brandId, 10);
            const queue = await contentService.getReviewQueue(brandId);
            res.json({ queue });
        } catch (error) {
            next(error);
        }
    }

    async approveDraft(req: Request, res: Response, next: NextFunction): Promise<void> {
        return approvalController.approveDraft(req, res, next);
    }

    async rejectDraft(req: Request, res: Response, next: NextFunction): Promise<void> {
        return approvalController.rejectDraft(req, res, next);
    }
}

export const contentController = new ContentController();
