import { Request, Response, NextFunction } from 'express';
import { ApiErrorResponse } from '../../types/index.js';
import { addMemberSchema, createWorkspaceSchema } from '../../shared/marketing/schemas/workspace.schema.js';
import { workspaceService } from './workspace.service.js';

export class WorkspaceController {
    async createWorkspace(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const input = createWorkspaceSchema.parse(req.body);
            const workspace = await workspaceService.create(req.v2User!.userId, input);
            res.status(201).json(workspace);
        } catch (error) {
            next(error);
        }
    }

    async listWorkspaces(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const workspaces = await workspaceService.listByUser(req.v2User!.userId);
            res.json({ workspaces });
        } catch (error) {
            next(error);
        }
    }

    async getWorkspace(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const workspaceId = parseInt(req.params.workspaceId, 10);
            if (isNaN(workspaceId)) {
                const response: ApiErrorResponse = {
                    error: { code: 'VALIDATION_ERROR', message: 'Invalid workspace ID' },
                };
                res.status(400).json(response);
                return;
            }

            const workspace = await workspaceService.getById(workspaceId);
            if (!workspace) {
                const response: ApiErrorResponse = {
                    error: { code: 'NOT_FOUND', message: 'Workspace không tồn tại' },
                };
                res.status(404).json(response);
                return;
            }

            res.json(workspace);
        } catch (error) {
            next(error);
        }
    }

    async addMember(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const workspaceId = parseInt(req.params.workspaceId, 10);
            if (isNaN(workspaceId)) {
                const response: ApiErrorResponse = {
                    error: { code: 'VALIDATION_ERROR', message: 'Invalid workspace ID' },
                };
                res.status(400).json(response);
                return;
            }

            const input = addMemberSchema.parse(req.body);
            const member = await workspaceService.addMember(workspaceId, input);
            res.status(201).json(member);
        } catch (error) {
            next(error);
        }
    }
}

export const workspaceController = new WorkspaceController();
