import { Request, Response } from 'express';
import { getAISettings, updateAISetting } from '../config/ai.config.js';

/**
 * Get AI settings
 * GET /api/settings/ai
 */
export const getAISettingsController = async (req: Request, res: Response) => {
    try {
        const settings = getAISettings();

        res.json({
            success: true,
            data: {
                stageA: settings.stageA,
                stageB: settings.stageB,
            },
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to get AI settings',
        });
    }
};

/**
 * Update AI Stage A setting
 * PUT /api/settings/ai/stage-a
 */
export const updateStageASetting = async (req: Request, res: Response) => {
    try {
        const { enabled } = req.body;

        if (typeof enabled !== 'boolean') {
            return res.status(400).json({
                success: false,
                error: 'enabled must be a boolean',
            });
        }

        await updateAISetting('A', enabled);

        return res.json({
            success: true,
            data: {
                stage: 'A',
                enabled,
                message: enabled
                    ? 'AI Stage A enabled (using GPT-4o-mini for filtering)'
                    : 'AI Stage A disabled (using heuristic filtering)',
            },
        });
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to update AI Stage A setting',
        });
    }
};

/**
 * Update AI Stage B setting
 * PUT /api/settings/ai/stage-b
 */
export const updateStageBSetting = async (req: Request, res: Response) => {
    try {
        const { enabled } = req.body;

        if (typeof enabled !== 'boolean') {
            return res.status(400).json({
                success: false,
                error: 'enabled must be a boolean',
            });
        }

        await updateAISetting('B', enabled);

        return res.json({
            success: true,
            data: {
                stage: 'B',
                enabled,
                message: enabled
                    ? 'AI Stage B enabled (using GPT-4o for article generation)'
                    : 'AI Stage B disabled (using simple summaries)',
            },
        });
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to update AI Stage B setting',
        });
    }
};
