import { Request, Response, NextFunction } from 'express';
import { ApiErrorResponse } from '../../types/index.js';
import { addMessageSchema } from '../../shared/marketing/schemas/onboarding.schema.js';
import { onboardingService } from './onboarding.service.js';

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
}

export const onboardingController = new OnboardingController();
