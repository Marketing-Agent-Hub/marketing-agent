import { Request, Response, NextFunction } from 'express';
import { sourceService } from '../services/source.service';
import {
    createSourceSchema,
    updateSourceSchema,
    validateRSSSchema,
} from '../schemas/source.schema';
import { ApiErrorResponse } from '../types';
export class SourceController {
    /**
     * GET /sources
     */
    async getAllSources(_req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const sources = await sourceService.getAllSources();
            res.json(sources);
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /sources/:id
     */
    async getSourceById(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const id = parseInt(req.params.id, 10);
            if (isNaN(id)) {
                const response: ApiErrorResponse = {
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'Invalid source ID',
                    },
                };
                res.status(400).json(response);
                return;
            }

            const source = await sourceService.getSourceById(id);
            if (!source) {
                const response: ApiErrorResponse = {
                    error: {
                        code: 'NOT_FOUND',
                        message: 'Source not found',
                    },
                };
                res.status(404).json(response);
                return;
            }

            res.json(source);
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /sources
     */
    async createSource(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const input = createSourceSchema.parse(req.body);
            const source = await sourceService.createSource(input);
            res.status(201).json(source);
        } catch (error) {
            next(error);
        }
    }

    /**
     * PATCH /sources/:id
     */
    async updateSource(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const id = parseInt(req.params.id, 10);
            if (isNaN(id)) {
                const response: ApiErrorResponse = {
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'Invalid source ID',
                    },
                };
                res.status(400).json(response);
                return;
            }

            const input = updateSourceSchema.parse(req.body);
            const source = await sourceService.updateSource(id, input);

            if (!source) {
                const response: ApiErrorResponse = {
                    error: {
                        code: 'NOT_FOUND',
                        message: 'Source not found',
                    },
                };
                res.status(404).json(response);
                return;
            }

            res.json(source);
        } catch (error) {
            next(error);
        }
    }

    /**
     * DELETE /sources/:id
     */
    async deleteSource(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const id = parseInt(req.params.id, 10);
            if (isNaN(id)) {
                const response: ApiErrorResponse = {
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'Invalid source ID',
                    },
                };
                res.status(400).json(response);
                return;
            }

            const deleted = await sourceService.deleteSource(id);
            if (!deleted) {
                const response: ApiErrorResponse = {
                    error: {
                        code: 'NOT_FOUND',
                        message: 'Source not found',
                    },
                };
                res.status(404).json(response);
                return;
            }

            res.status(204).send();
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /sources/export
     */
    async exportSources(_req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const sources = await sourceService.getAllSources();

            // Transform to export format (remove IDs and timestamps)
            const exportData = sources.map(source => ({
                name: source.name,
                rssUrl: source.rssUrl,
                ...(source.siteUrl && { siteUrl: source.siteUrl }),
                lang: source.lang,
                topicTags: source.topicTags,
                trustScore: source.trustScore,
                enabled: source.enabled,
                ...(source.fetchIntervalMinutes !== 60 && { fetchIntervalMinutes: source.fetchIntervalMinutes }),
                ...(source.denyKeywords.length > 0 && { denyKeywords: source.denyKeywords }),
                ...(source.notes && { notes: source.notes }),
            }));

            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename="sources-export-${new Date().toISOString().split('T')[0]}.json"`);
            res.json(exportData);
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /sources/validate
     */
    async validateRSS(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const input = validateRSSSchema.parse(req.body);
            const result = await sourceService.validateRSS(input.url);
            res.json(result);
        } catch (error) {
            next(error);
        }
    }
}

export const sourceController = new SourceController();
