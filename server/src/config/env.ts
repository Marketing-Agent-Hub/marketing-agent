import { z } from 'zod';
import { config } from 'dotenv';

// Load environment variables from .env file
config();

// Environment variables schema
export const envSchema = z.object({
  // Core configuration
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  ADMIN_EMAIL: z.string().email('ADMIN_EMAIL must be a valid email'),
  ADMIN_PASSWORD_HASH: z.string().min(1, 'ADMIN_PASSWORD_HASH is required'),
  CORS_ORIGIN: z.string().url('CORS_ORIGIN must be a valid URL'),
  PORT: z.string().regex(/^\d+$/).transform(Number).default('3001'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Application branding
  APP_NAME: z.string().default('News Aggregator'),
  APP_DESCRIPTION: z.string().default('AI-powered news aggregation system'),
  USER_AGENT: z.string().default('NewsAggregatorBot/1.0'),

  // Content configuration
  CONTENT_LANGUAGE: z.string().default('en'), // ISO 639-1 code (en, vi, etc)
  TARGET_AUDIENCE: z.string().default('general audience'),
  FOCUS_TOPICS: z.string().default('technology,business,science'), // comma-separated
});

export type Env = z.infer<typeof envSchema>;

// Validate and export environment variables
let env: Env;

try {
  env = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('❌ Invalid environment variables:');
    error.errors.forEach((err) => {
      console.error(`  - ${err.path.join('.')}: ${err.message}`);
    });
    process.exit(1);
  }
  throw error;
}

export { env };

