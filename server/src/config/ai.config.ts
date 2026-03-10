import { z } from 'zod';
import OpenAI from 'openai';
import { prisma } from '../db/index.js';

// AI configuration schema
const aiConfigSchema = z.object({
    OPENAI_API_KEY: z.string().min(1, 'OpenAI API key is required'),
    AI_STAGE_A_MODEL: z.string().default('gpt-4o-mini'),
    AI_STAGE_B_MODEL: z.string().default('gpt-4o'),
});

// Parse and validate AI configuration
const aiConfig = aiConfigSchema.parse({
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    AI_STAGE_A_MODEL: process.env.AI_STAGE_A_MODEL,
    AI_STAGE_B_MODEL: process.env.AI_STAGE_B_MODEL,
});

// Runtime AI feature toggles (loaded from database)
let stageAEnabled = false; // Default: DISABLED to save tokens
let stageBEnabled = false; // Default: DISABLED to save tokens

// Export configuration
export const AI_CONFIG = {
    OPENAI_API_KEY: aiConfig.OPENAI_API_KEY,
    STAGE_A_MODEL: aiConfig.AI_STAGE_A_MODEL,
    STAGE_B_MODEL: aiConfig.AI_STAGE_B_MODEL,
    get STAGE_A_ENABLED() {
        return stageAEnabled;
    },
    get STAGE_B_ENABLED() {
        return stageBEnabled;
    },
} as const;

// Create and export OpenAI client
export const openai = new OpenAI({
    apiKey: AI_CONFIG.OPENAI_API_KEY,
});

/**
 * Load AI settings from database
 */
export async function loadAISettings() {
    try {
        const settings = await prisma.setting.findMany({
            where: {
                key: {
                    in: ['ai_stage_a_enabled', 'ai_stage_b_enabled'],
                },
            },
        });

        const settingsMap = new Map(settings.map(s => [s.key, s.value]));

        stageAEnabled = settingsMap.get('ai_stage_a_enabled') === 'true';
        stageBEnabled = settingsMap.get('ai_stage_b_enabled') === 'true';

        console.log('✅ AI Settings loaded from database:');
        console.log(`   Stage A: ${stageAEnabled ? 'ENABLED' : 'DISABLED'} (${AI_CONFIG.STAGE_A_MODEL})`);
        console.log(`   Stage B: ${stageBEnabled ? 'ENABLED' : 'DISABLED'} (${AI_CONFIG.STAGE_B_MODEL})`);

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

    await prisma.setting.upsert({
        where: { key },
        update: { value: enabled.toString() },
        create: {
            key,
            value: enabled.toString(),
            description: `Enable/disable AI Stage ${stage}`,
        },
    });

    if (stage === 'A') {
        stageAEnabled = enabled;
    } else {
        stageBEnabled = enabled;
    }

    console.log(`✅ AI Stage ${stage}: ${enabled ? 'ENABLED' : 'DISABLED'}`);
}

/**
 * Get current AI settings
 */
export function getAISettings() {
    return {
        stageA: {
            enabled: stageAEnabled,
            model: AI_CONFIG.STAGE_A_MODEL,
            description: 'AI filtering & categorization',
        },
        stageB: {
            enabled: stageBEnabled,
            model: AI_CONFIG.STAGE_B_MODEL,
            description: 'AI article generation',
        },
    };
}

