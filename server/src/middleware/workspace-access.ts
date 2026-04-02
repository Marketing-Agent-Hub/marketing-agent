import { Request, Response, NextFunction } from 'express';
import { Workspace, WorkspaceMember, WorkspaceRole } from '@prisma/client';
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
        workspaceMember?: WorkspaceMember & { workspace: Workspace };
    }
}

export function requireWorkspaceAccess(minimumRole: WorkspaceRole) {
    return (req: Request, res: Response, next: NextFunction): void => {
        requireProductAuth(req, res, async () => {
            const workspaceId = parseInt(req.params.workspaceId, 10);
            if (isNaN(workspaceId)) {
                const response: ApiErrorResponse = {
                    error: { code: 'VALIDATION_ERROR', message: 'Invalid workspace ID' },
                };
                res.status(400).json(response);
                return;
            }

            const member = await prisma.workspaceMember.findUnique({
                where: { workspaceId_userId: { workspaceId, userId: req.v2User!.userId } },
                include: { workspace: true },
            });

            if (!member) {
                const response: ApiErrorResponse = {
                    error: { code: 'FORBIDDEN', message: 'Bạn không phải thành viên của workspace này' },
                };
                res.status(403).json(response);
                return;
            }

            if (ROLE_HIERARCHY[member.role] < ROLE_HIERARCHY[minimumRole]) {
                const response: ApiErrorResponse = {
                    error: { code: 'FORBIDDEN', message: `Yêu cầu quyền ${minimumRole} trở lên` },
                };
                res.status(403).json(response);
                return;
            }

            req.workspaceMember = member;
            next();
        });
    };
}
