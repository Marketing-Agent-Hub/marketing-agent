import { Request, Response, NextFunction } from 'express';
import { Brand, WorkspaceRole } from '@prisma/client';
import { prisma } from '../db/index.js';
import { ApiErrorResponse } from '../types/index.js';
import { requireProductAuth } from './product-auth.js';

const ROLE_HIERARCHY: Record<WorkspaceRole, number> = {
    VIEWER: 1,
    EDITOR: 2,
    ADMIN: 3,
    OWNER: 4,
};

declare module 'express-serve-static-core' {
    interface Request {
        brand?: Brand;
    }
}

export function requireBrandAccess(minimumRole: WorkspaceRole) {
    return (req: Request, res: Response, next: NextFunction): void => {
        requireProductAuth(req, res, async () => {
            const brandId = parseInt(req.params.brandId, 10);
            if (isNaN(brandId)) {
                const response: ApiErrorResponse = {
                    error: { code: 'VALIDATION_ERROR', message: 'Invalid brand ID' },
                };
                res.status(400).json(response);
                return;
            }

            const brand = await prisma.brand.findUnique({ where: { id: brandId } });
            if (!brand) {
                const response: ApiErrorResponse = {
                    error: { code: 'NOT_FOUND', message: 'Brand not found' },
                };
                res.status(404).json(response);
                return;
            }

            const member = await prisma.workspaceMember.findUnique({
                where: {
                    workspaceId_userId: {
                        workspaceId: brand.workspaceId,
                        userId: req.v2User!.userId,
                    },
                },
            });

            if (!member) {
                const response: ApiErrorResponse = {
                    error: { code: 'FORBIDDEN', message: 'You do not have permission to access this brand' },
                };
                res.status(403).json(response);
                return;
            }

            if (ROLE_HIERARCHY[member.role] < ROLE_HIERARCHY[minimumRole]) {
                const response: ApiErrorResponse = {
                    error: { code: 'FORBIDDEN', message: `Requires ${minimumRole} role or higher` },
                };
                res.status(403).json(response);
                return;
            }

            req.brand = brand;
            next();
        });
    };
}
