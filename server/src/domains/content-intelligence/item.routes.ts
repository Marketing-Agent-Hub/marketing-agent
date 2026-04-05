import { Router } from 'express';
import { requireInternalAuth } from '../../middleware/internal-auth.js';
import * as itemController from './item.controller.js';

const router = Router();

router.get('/', requireInternalAuth, itemController.getItems);
router.get('/ready', requireInternalAuth, itemController.getReadyItems);
router.get('/stats', requireInternalAuth, itemController.getItemsStats);
router.get('/:id', requireInternalAuth, itemController.getItemById);
router.delete('/all', requireInternalAuth, itemController.deleteAllItems);
router.delete('/all/ready', requireInternalAuth, itemController.deleteAllReadyItems);
router.delete('/', requireInternalAuth, itemController.deleteItems);

export default router;
