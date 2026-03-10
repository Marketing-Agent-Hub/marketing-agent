import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
    getAISettingsController,
    updateStageASetting,
    updateStageBSetting,
} from '../controllers/settings.controller.js';

const router = Router();

// All settings routes require authentication
router.use(authenticate);

// AI settings
router.get('/ai', getAISettingsController);
router.put('/ai/stage-a', updateStageASetting);
router.put('/ai/stage-b', updateStageBSetting);

export default router;
