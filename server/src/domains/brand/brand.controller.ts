import { Request, Response, NextFunction } from 'express';
import { ApiErrorResponse } from '../../types/index.js';
import { createBrandSchema, updateBrandSchema } from '../../shared/marketing/schemas/brand.schema.js';
import { brandService } from './brand.service.js';

export class BrandController {
    async createBrand(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const workspaceId = parseInt(req.params.workspaceId, 10);
            const input = createBrandSchema.parse(req.body);
            const brand = await brandService.create(workspaceId, input);
            res.status(201).json(brand);
        } catch (error) {
            next(error);
        }
    }

    async listBrands(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const workspaceId = parseInt(req.params.workspaceId, 10);
            const brands = await brandService.listByWorkspace(workspaceId);
            res.json({ brands });
        } catch (error) {
            next(error);
        }
    }

    async getBrand(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const brandId = parseInt(req.params.brandId, 10);
            if (isNaN(brandId)) {
                const response: ApiErrorResponse = {
                    error: { code: 'VALIDATION_ERROR', message: 'Invalid brand ID' },
                };
                res.status(400).json(response);
                return;
            }

            const brand = await brandService.getById(brandId);
            if (!brand) {
                const response: ApiErrorResponse = {
                    error: { code: 'NOT_FOUND', message: 'Brand không tồn tại' },
                };
                res.status(404).json(response);
                return;
            }

            res.json(brand);
        } catch (error) {
            next(error);
        }
    }

    async addKnowledgeDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const brandId = parseInt(req.params.brandId, 10);
            const { title, content, sourceUrl, docType } = req.body;
            if (!title || !content) {
                const response: ApiErrorResponse = {
                    error: { code: 'VALIDATION_ERROR', message: 'title và content là bắt buộc' },
                };
                res.status(400).json(response);
                return;
            }
            const doc = await brandService.addKnowledgeDocument(brandId, { title, content, sourceUrl, docType });
            res.status(201).json(doc);
        } catch (error) {
            next(error);
        }
    }

    async updateBrand(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const brandId = parseInt(req.params.brandId, 10);
            if (isNaN(brandId)) {
                const response: ApiErrorResponse = {
                    error: { code: 'VALIDATION_ERROR', message: 'Invalid brand ID' },
                };
                res.status(400).json(response);
                return;
            }

            const input = updateBrandSchema.parse(req.body);
            const brand = await brandService.update(brandId, input);
            res.json(brand);
        } catch (error) {
            next(error);
        }
    }
}

export const brandController = new BrandController();
