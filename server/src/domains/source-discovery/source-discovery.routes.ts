import { Router } from 'express';
import { requireAdminAuth } from '../../middleware/admin-auth.js';
import { asyncHandler } from '../../lib/async-handler.js';
import {
    listPendingHandler,
    approvePendingHandler,
    rejectPendingHandler,
    triggerDiscoveryJobHandler,
} from './source-discovery.controller.js';

const router = Router();

router.get('/pending', requireAdminAuth, asyncHandler(listPendingHandler));
router.post('/pending/:id/approve', requireAdminAuth, asyncHandler(approvePendingHandler));
router.post('/pending/:id/reject', requireAdminAuth, asyncHandler(rejectPendingHandler));
router.post('/jobs/run', requireAdminAuth, asyncHandler(triggerDiscoveryJobHandler));

export default router;
