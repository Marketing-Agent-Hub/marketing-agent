import { Request, Response, NextFunction } from 'express';
import { draftService } from '../services/draft.service.js';
import {
    updateDraftSchema,
    approveDraftSchema,
    rejectDraftSchema,
    getDraftsQuerySchema,
} from '../schemas/draft.schema.js';
import { ApiErrorResponse } from '../types/index.js';

export class DraftController {
    /**
     * GET /drafts
     */
    async getAllDrafts(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const query = getDraftsQuerySchema.parse(req.query);
            const drafts = await draftService.getAllDrafts(query);
            res.json(drafts);
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /drafts/:id
     */
    async getDraftById(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const id = parseInt(req.params.id, 10);
            if (isNaN(id)) {
                const response: ApiErrorResponse = {
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'Invalid draft ID',
                    },
                };
                res.status(400).json(response);
                return;
            }

            const draft = await draftService.getDraftById(id);
            if (!draft) {
                const response: ApiErrorResponse = {
                    error: {
                        code: 'NOT_FOUND',
                        message: 'Draft not found',
                    },
                };
                res.status(404).json(response);
                return;
            }

            res.json(draft);
        } catch (error) {
            next(error);
        }
    }

    /**
     * PATCH /drafts/:id
     */
    async updateDraft(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const id = parseInt(req.params.id, 10);
            if (isNaN(id)) {
                const response: ApiErrorResponse = {
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'Invalid draft ID',
                    },
                };
                res.status(400).json(response);
                return;
            }

            const input = updateDraftSchema.parse(req.body);
            const draft = await draftService.updateDraft(id, input);

            if (!draft) {
                const response: ApiErrorResponse = {
                    error: {
                        code: 'NOT_FOUND',
                        message: 'Draft not found',
                    },
                };
                res.status(404).json(response);
                return;
            }

            res.json(draft);
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /drafts/:id/approve
     */
    async approveDraft(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const id = parseInt(req.params.id, 10);
            if (isNaN(id)) {
                const response: ApiErrorResponse = {
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'Invalid draft ID',
                    },
                };
                res.status(400).json(response);
                return;
            }

            approveDraftSchema.parse(req.body);
            const draft = await draftService.approveDraft(id);

            if (!draft) {
                const response: ApiErrorResponse = {
                    error: {
                        code: 'NOT_FOUND',
                        message: 'Draft not found',
                    },
                };
                res.status(404).json(response);
                return;
            }

            res.json(draft);
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /drafts/:id/reject
     */
    async rejectDraft(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const id = parseInt(req.params.id, 10);
            if (isNaN(id)) {
                const response: ApiErrorResponse = {
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'Invalid draft ID',
                    },
                };
                res.status(400).json(response);
                return;
            }

            const input = rejectDraftSchema.parse(req.body);
            const draft = await draftService.rejectDraft(id, input);

            if (!draft) {
                const response: ApiErrorResponse = {
                    error: {
                        code: 'NOT_FOUND',
                        message: 'Draft not found',
                    },
                };
                res.status(404).json(response);
                return;
            }

            res.json(draft);
        } catch (error) {
            next(error);
        }
    }
}

export const draftController = new DraftController();

