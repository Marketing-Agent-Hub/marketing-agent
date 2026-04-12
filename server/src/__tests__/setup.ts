/**
 * Global test setup — ensures all required env vars are present before any
 * module that imports `src/config/env.ts` is loaded.
 *
 * Tests that need specific values should override with vi.mock('../../config/env.js', …).
 */

// New hybrid-auth vars added in tasks 1-6 — provide safe test defaults so that
// tests which don't mock env.ts don't crash with process.exit(1).
process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? 'test-google-client-id.apps.googleusercontent.com';
process.env.APP_URL = process.env.APP_URL ?? 'http://localhost:3001';
process.env.SMTP_HOST = process.env.SMTP_HOST ?? 'smtp.test.example.com';
process.env.SMTP_PORT = process.env.SMTP_PORT ?? '587';
process.env.SMTP_USER = process.env.SMTP_USER ?? 'test-smtp-user';
process.env.SMTP_PASS = process.env.SMTP_PASS ?? 'test-smtp-pass';
process.env.EMAIL_FROM = process.env.EMAIL_FROM ?? 'noreply@test.example.com';
