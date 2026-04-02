import { NextFunction, Request, Response } from 'express';
import { approvalActionSchema } from '../../shared/marketing/schemas/approval.schema.js';
import { ApiErrorResponse } from '../../types/index.js';
import { approvalService } from './approval.service.js';

export class ApprovalController {
    async approveDraft(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const draftId = parseInt(req.params.draftId, 10);
            if (isNaN(draftId)) {
                const response: ApiErrorResponse = {
                    error: { code: 'VALIDATION_ERROR', message: 'Invalid draft ID' },
                };
                res.status(400).json(response);
                return;
            }

            const { comment } = approvalActionSchema.parse(req.body);
            const draft = await approvalService.approveDraft(draftId, req.v2User!.userId, comment);
            res.json(draft);
        } catch (error) {
            next(error);
        }
    }

    async rejectDraft(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const draftId = parseInt(req.params.draftId, 10);
            if (isNaN(draftId)) {
                const response: ApiErrorResponse = {
                    error: { code: 'VALIDATION_ERROR', message: 'Invalid draft ID' },
                };
                res.status(400).json(response);
                return;
            }

            const { comment } = approvalActionSchema.parse(req.body);
            const draft = await approvalService.rejectDraft(draftId, req.v2User!.userId, comment);
            res.json(draft);
        } catch (error) {
            next(error);
        }
    }
}

export const approvalController = new ApprovalController();
