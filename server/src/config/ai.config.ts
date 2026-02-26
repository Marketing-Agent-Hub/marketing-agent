import { z } from 'zod';
import OpenAI from 'openai';

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

// Export configuration
export const AI_CONFIG = {
    OPENAI_API_KEY: aiConfig.OPENAI_API_KEY,
    STAGE_A_MODEL: aiConfig.AI_STAGE_A_MODEL,
    STAGE_B_MODEL: aiConfig.AI_STAGE_B_MODEL,
} as const;

// Create and export OpenAI client
export const openai = new OpenAI({
    apiKey: AI_CONFIG.OPENAI_API_KEY,
});

// Log configuration (without exposing key)
console.log('✅ OpenAI configured:');
console.log(`   Stage A Model: ${AI_CONFIG.STAGE_A_MODEL}`);
console.log(`   Stage B Model: ${AI_CONFIG.STAGE_B_MODEL}`);
