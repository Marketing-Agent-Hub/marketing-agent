import { Router } from 'express';
import { asyncHandler } from '../../lib/async-handler.js';
import { requireInternalAuth } from '../../middleware/internal-auth.js';
import { sourceController } from './source.controller.js';

const router = Router();

router.get('/export', requireInternalAuth, asyncHandler((req, res, next) => sourceController.exportSources(req, res, next)));
router.post('/validate', requireInternalAuth, asyncHandler((req, res, next) => sourceController.validateRSS(req, res, next)));
router.get('/', requireInternalAuth, asyncHandler((req, res, next) => sourceController.getAllSources(req, res, next)));
router.get('/:id', requireInternalAuth, asyncHandler((req, res, next) => sourceController.getSourceById(req, res, next)));
router.post('/:id/validate-config', requireInternalAuth, asyncHandler((req, res, next) => sourceController.validatePluginConfig(req, res, next)));
router.post('/', requireInternalAuth, asyncHandler((req, res, next) => sourceController.createSource(req, res, next)));
router.patch('/:id', requireInternalAuth, asyncHandler((req, res, next) => sourceController.updateSource(req, res, next)));
router.delete('/:id', requireInternalAuth, asyncHandler((req, res, next) => sourceController.deleteSource(req, res, next)));

export default router;
