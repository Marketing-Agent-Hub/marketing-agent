import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as itemController from '../controllers/item.controller.js';

const router = Router();

// All item routes require authentication
router.use(requireAuth);

// Get items list with filtering
router.get('/', itemController.getItems);

// Get ready-to-publish items
router.get('/ready', itemController.getReadyItems);

// Get statistics
router.get('/stats', itemController.getItemsStats);

// Get item by ID
router.get('/:id', itemController.getItemById);

export default router;

