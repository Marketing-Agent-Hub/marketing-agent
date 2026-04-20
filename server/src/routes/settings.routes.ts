import { Router } from 'express';
import { requireAdminAuth } from '../middleware/admin-auth.js';
import {
    getAISettingsController,
    updateStageASetting,
    updateStageBSetting,
} from '../controllers/settings.controller.js';

const router = Router();

// All settings routes require admin authentication
router.use(requireAdminAuth);

// AI settings
router.get('/ai', getAISettingsController);
router.put('/ai/stage-a', updateStageASetting);
router.put('/ai/stage-b', updateStageBSetting);

export default router;
