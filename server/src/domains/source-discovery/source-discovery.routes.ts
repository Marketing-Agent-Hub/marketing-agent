import { Router } from 'express';
import { requireInternalAuth } from '../../middleware/internal-auth.js';
import { asyncHandler } from '../../lib/async-handler.js';
import {
    listPendingHandler,
    approvePendingHandler,
    rejectPendingHandler,
    triggerDiscoveryJobHandler,
} from './source-discovery.controller.js';

const router = Router();

router.get('/pending', requireInternalAuth, asyncHandler(listPendingHandler));
router.post('/pending/:id/approve', requireInternalAuth, asyncHandler(approvePendingHandler));
router.post('/pending/:id/reject', requireInternalAuth, asyncHandler(rejectPendingHandler));
router.post('/jobs/run', requireInternalAuth, asyncHandler(triggerDiscoveryJobHandler));

export default router;
