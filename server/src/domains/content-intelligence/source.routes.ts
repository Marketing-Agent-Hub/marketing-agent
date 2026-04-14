import { Router } from 'express';
import { asyncHandler } from '../../lib/async-handler.js';
import { requireAdminAuth } from '../../middleware/admin-auth.js';
import { sourceController } from './source.controller.js';

const router = Router();

router.get('/export', requireAdminAuth, asyncHandler((req, res, next) => sourceController.exportSources(req, res, next)));
router.post('/validate', requireAdminAuth, asyncHandler((req, res, next) => sourceController.validateRSS(req, res, next)));
router.get('/', requireAdminAuth, asyncHandler((req, res, next) => sourceController.getAllSources(req, res, next)));
router.get('/:id', requireAdminAuth, asyncHandler((req, res, next) => sourceController.getSourceById(req, res, next)));
router.post('/:id/validate-config', requireAdminAuth, asyncHandler((req, res, next) => sourceController.validatePluginConfig(req, res, next)));
router.post('/', requireAdminAuth, asyncHandler((req, res, next) => sourceController.createSource(req, res, next)));
router.patch('/:id', requireAdminAuth, asyncHandler((req, res, next) => sourceController.updateSource(req, res, next)));
router.delete('/:id', requireAdminAuth, asyncHandler((req, res, next) => sourceController.deleteSource(req, res, next)));

export default router;
