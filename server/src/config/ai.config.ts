import { settingService, AiSettingsResponse } from '../lib/setting.service.js';

// Runtime AI feature toggles (loaded from database)
let stageAEnabled = false; // Default: DISABLED to save tokens
let stageBEnabled = false; // Default: DISABLED to save tokens

// Export configuration (model fields removed — managed via runtime settings in DB)
export const AI_CONFIG = {
    get STAGE_A_ENABLED() {
        return stageAEnabled;
    },
    get STAGE_B_ENABLED() {
        return stageBEnabled;
    },
} as const;

/**
 * Load AI settings from database
 */
export async function loadAISettings() {
    try {
        const settings = await settingService.getAllAiSettings();

        stageAEnabled = settings.stages.stageA.enabled;
        stageBEnabled = settings.stages.stageB.enabled;

        console.log('✅ AI Settings loaded from database:');
        console.log(`   Stage A: ${stageAEnabled ? 'ENABLED' : 'DISABLED'} (model: ${settings.models.stageA})`);
        console.log(`   Stage B: ${stageBEnabled ? 'ENABLED' : 'DISABLED'} (model: ${settings.models.stageB})`);

        if (!stageAEnabled) {
            console.warn('⚠️  AI Stage A disabled - using heuristic filtering');
        }
        if (!stageBEnabled) {
            console.warn('⚠️  AI Stage B disabled - using simple summaries');
        }
    } catch (error) {
        console.error('❌ Error loading AI settings:', error);
        console.warn('⚠️  Using default settings (AI disabled)');
    }
}

/**
 * Update AI setting in database and runtime
 */
export async function updateAISetting(stage: 'A' | 'B', enabled: boolean) {
    const key = stage === 'A' ? 'ai_stage_a_enabled' : 'ai_stage_b_enabled';

    await settingService.setModel(key, enabled.toString());

    if (stage === 'A') {
        stageAEnabled = enabled;
    } else {
        stageBEnabled = enabled;
    }

    console.log(`✅ AI Stage ${stage}: ${enabled ? 'ENABLED' : 'DISABLED'}`);
}

/**
 * Get current AI settings (delegates to settingService)
 */
export async function getAISettings(): Promise<AiSettingsResponse & {
    stageA: { enabled: boolean; model: string; description: string };
    stageB: { enabled: boolean; model: string; description: string };
}> {
    const settings = await settingService.getAllAiSettings();
    return {
        ...settings,
        stageA: {
            enabled: stageAEnabled,
            model: settings.models.stageA,
            description: 'AI filtering & categorization',
        },
        stageB: {
            enabled: stageBEnabled,
            model: settings.models.stageB,
            description: 'AI article generation',
        },
    };
}
