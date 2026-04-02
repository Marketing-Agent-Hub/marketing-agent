import { Router } from 'express';
import { asyncHandler } from '../../lib/async-handler.js';
import { requireProductAuth } from '../../middleware/product-auth.js';
import { requireWorkspaceAccess } from '../../middleware/workspace-access.js';
import { workspaceController } from './workspace.controller.js';

const router = Router();

router.get('/', requireProductAuth, asyncHandler((req, res, next) => workspaceController.listWorkspaces(req, res, next)));
router.post('/', requireProductAuth, asyncHandler((req, res, next) => workspaceController.createWorkspace(req, res, next)));
router.get('/:workspaceId', requireProductAuth, requireWorkspaceAccess('VIEWER'), asyncHandler((req, res, next) => workspaceController.getWorkspace(req, res, next)));
router.post('/:workspaceId/members', requireProductAuth, requireWorkspaceAccess('ADMIN'), asyncHandler((req, res, next) => workspaceController.addMember(req, res, next)));

export default router;
