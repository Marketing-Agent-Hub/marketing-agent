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
  CORS_ORIGIN: z.string().url('CORS_ORIGIN must be a valid URL'),
  PORT: z.string().regex(/^\d+$/).transform(Number).default('3001'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // HTTP Client
  USER_AGENT: z.string().default('NewsAggregatorBot/1.0'),

  // OpenRouter AI (one key for all models; model names configured via admin settings in DB)
  OPENROUTER_API_KEY: z.string().min(1, 'OPENROUTER_API_KEY is required'),

  // AI Source Discovery
  TAVILY_API_KEY: z.string().optional(),

  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().min(1, 'GOOGLE_CLIENT_ID is required'),

  // App URL
  APP_URL: z.string().url('APP_URL must be a valid URL'),

  // SMTP / Email
  SMTP_HOST: z.string().min(1, 'SMTP_HOST is required'),
  SMTP_PORT: z.coerce.number().int().positive(),
  SMTP_USER: z.string().min(1, 'SMTP_USER is required'),
  SMTP_PASS: z.string().min(1, 'SMTP_PASS is required'),
  EMAIL_FROM: z.string().min(1, 'EMAIL_FROM is required'),

  // Stripe (Credit Wallet)
  STRIPE_SECRET_KEY: z.string().min(1, 'STRIPE_SECRET_KEY is required'),
  STRIPE_WEBHOOK_SECRET: z.string().min(1, 'STRIPE_WEBHOOK_SECRET is required'),

  // S3 storage (same variables for all envs)
  S3_ENDPOINT: z.string().url('S3_ENDPOINT must be a valid URL'),
  S3_ACCESS_KEY: z.string().min(1, 'S3_ACCESS_KEY is required'),
  S3_SECRET_KEY: z.string().min(1, 'S3_SECRET_KEY is required'),
  S3_BUCKET: z.string().min(1, 'S3_BUCKET is required'),
});

export type Env = z.infer<typeof envSchema>;

// Validate and export environment variables
let env: Env;

try {
  env = envSchema.parse(process.env);

  // Single S3 config for all environments.
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

