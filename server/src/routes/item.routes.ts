import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import * as itemController from '../controllers/item.controller';

const router = Router();

// All item routes require authentication
router.use(requireAuth);

// Get items list with filtering
router.get('/', itemController.getItems);

// Get statistics
router.get('/stats', itemController.getItemsStats);

// Get item by ID
router.get('/:id', itemController.getItemById);

export default router;
