import { Router } from 'express';
import { requireAdminAuth } from '../../middleware/admin-auth.js';
import * as itemController from './item.controller.js';

const router = Router();

router.get('/', requireAdminAuth, itemController.getItems);
router.get('/ready', requireAdminAuth, itemController.getReadyItems);
router.get('/stats', requireAdminAuth, itemController.getItemsStats);
router.get('/:id', requireAdminAuth, itemController.getItemById);
router.delete('/all', requireAdminAuth, itemController.deleteAllItems);
router.delete('/all/ready', requireAdminAuth, itemController.deleteAllReadyItems);
router.delete('/', requireAdminAuth, itemController.deleteItems);

export default router;
