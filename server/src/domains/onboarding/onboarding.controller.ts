import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { ApiErrorResponse } from '../../types/index.js';
import { addMessageSchema, generateRequestSchema, saveRequestSchema } from '../../shared/marketing/schemas/onboarding.schema.js';
import { onboardingService } from './onboarding.service.js';
import { onboardingFormService } from './onboarding-form.service.js';

export class OnboardingController {
    async createSession(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const session = await onboardingService.createSession(parseInt(req.params.brandId, 10));
            res.status(201).json(session);
        } catch (error) {
            next(error);
        }
    }

    async getSession(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const sessionId = parseInt(req.params.sessionId, 10);
            if (isNaN(sessionId)) {
                const response: ApiErrorResponse = {
                    error: { code: 'VALIDATION_ERROR', message: 'Invalid session ID' },
                };
                res.status(400).json(response);
                return;
            }
            const session = await onboardingService.getSession(sessionId);
            res.json(session);
        } catch (error) {
            next(error);
        }
    }

    async addMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const sessionId = parseInt(req.params.sessionId, 10);
            if (isNaN(sessionId)) {
                const response: ApiErrorResponse = {
                    error: { code: 'VALIDATION_ERROR', message: 'Invalid session ID' },
                };
                res.status(400).json(response);
                return;
            }
            const session = await onboardingService.addMessage(sessionId, addMessageSchema.parse(req.body));
            res.json(session);
        } catch (error) {
            next(error);
        }
    }

    async completeSession(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const sessionId = parseInt(req.params.sessionId, 10);
            if (isNaN(sessionId)) {
                const response: ApiErrorResponse = {
                    error: { code: 'VALIDATION_ERROR', message: 'Invalid session ID' },
                };
                res.status(400).json(response);
                return;
            }
            const session = await onboardingService.completeSession(sessionId);
            res.json(session);
        } catch (error) {
            next(error);
        }
    }

    async generateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const brandId = parseInt(req.params.brandId, 10);

            let body: ReturnType<typeof generateRequestSchema.parse>;
            try {
                body = generateRequestSchema.parse(req.body);
            } catch (err) {
                if (err instanceof ZodError) {
                    const response: ApiErrorResponse = {
                        error: { code: 'VALIDATION_ERROR', message: err.errors[0]?.message ?? 'Validation error' },
                    };
                    res.status(400).json(response);
                    return;
                }
                throw err;
            }

            const workspaceId = (req as any).brand?.workspaceId as number;
            const { formData, prompt, fieldKey } = body;

            if (fieldKey) {
                const result = await onboardingFormService.generateFieldSuggestion(brandId, workspaceId, formData, fieldKey);
                res.json({ fieldKey: result.fieldKey, suggestion: result.suggestion });
            } else {
                const result = await onboardingFormService.generateProfile(brandId, workspaceId, formData, prompt);
                res.json({ profile: result.profile, pillars: result.pillars });
            }
        } catch (error) {
            next(error);
        }
    }

    async saveProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const brandId = parseInt(req.params.brandId, 10);

            let body: ReturnType<typeof saveRequestSchema.parse>;
            try {
                body = saveRequestSchema.parse(req.body);
            } catch (err) {
                if (err instanceof ZodError) {
                    const response: ApiErrorResponse = {
                        error: { code: 'VALIDATION_ERROR', message: err.errors[0]?.message ?? 'Validation error' },
                    };
                    res.status(400).json(response);
                    return;
                }
                throw err;
            }

            const workspaceId = (req as any).brand?.workspaceId as number;
            const { profile, pillars } = body;

            const saved = await onboardingFormService.saveProfile(brandId, profile, pillars);
            res.status(200).json(saved);
        } catch (error) {
            next(error);
        }
    }
}

export const onboardingController = new OnboardingController();
