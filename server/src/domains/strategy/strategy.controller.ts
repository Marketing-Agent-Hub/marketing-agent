import { Request, Response, NextFunction } from 'express';
import { ApiErrorResponse } from '../../types/index.js';
import { generateStrategySchema } from '../../shared/marketing/schemas/strategy.schema.js';
import { strategyService } from './strategy.service.js';

export class StrategyController {
    async generateStrategy(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const brandId = parseInt(req.params.brandId, 10);
            const input = generateStrategySchema.parse(req.body);
            const strategy = await strategyService.generateStrategy(brandId, input);
            res.status(201).json(strategy);
        } catch (error) {
            next(error);
        }
    }

    async listStrategies(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const brandId = parseInt(req.params.brandId, 10);
            const strategies = await strategyService.listStrategies(brandId);
            res.json({ strategies });
        } catch (error) {
            next(error);
        }
    }

    async getStrategy(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const strategyId = parseInt(req.params.strategyId, 10);
            if (isNaN(strategyId)) {
                const r: ApiErrorResponse = { error: { code: 'VALIDATION_ERROR', message: 'Invalid strategy ID' } };
                res.status(400).json(r);
                return;
            }

            const strategy = await strategyService.getStrategy(strategyId);
            if (!strategy) {
                const r: ApiErrorResponse = { error: { code: 'NOT_FOUND', message: 'Strategy not found' } };
                res.status(404).json(r);
                return;
            }

            res.json(strategy);
        } catch (error) {
            next(error);
        }
    }

    async activateStrategy(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const strategyId = parseInt(req.params.strategyId, 10);
            if (isNaN(strategyId)) {
                const r: ApiErrorResponse = { error: { code: 'VALIDATION_ERROR', message: 'Invalid strategy ID' } };
                res.status(400).json(r);
                return;
            }

            const strategy = await strategyService.activateStrategy(strategyId);
            res.json(strategy);
        } catch (error) {
            next(error);
        }
    }

    async listSlots(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const strategyId = parseInt(req.params.strategyId, 10);
            if (isNaN(strategyId)) {
                const r: ApiErrorResponse = { error: { code: 'VALIDATION_ERROR', message: 'Invalid strategy ID' } };
                res.status(400).json(r);
                return;
            }

            const slots = await strategyService.listSlots(strategyId);
            res.json({ slots });
        } catch (error) {
            next(error);
        }
    }
}

export const strategyController = new StrategyController();
