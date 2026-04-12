import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import express from 'express';
import request from 'supertest';
import { googleRateLimiter, magicLinkRateLimiter } from '../../../middleware/auth-rate-limiter.js';

/**
 * Feature: hybrid-auth
 *
 * Property 9: Rate limit independence
 * Validates: Requirements 3.4
 */

function buildApp() {
    const app = express();
    app.use(express.json());

    app.post('/auth/magic-link/request', magicLinkRateLimiter, (_req, res) => {
        res.status(200).json({ message: 'ok' });
    });

    app.post('/auth/google', googleRateLimiter, (_req, res) => {
        res.status(200).json({ message: 'ok' });
    });

    return app;
}

describe('rate-limiter — property tests', () => {
    /**
     * Property 9: Rate limit independence
     * Validates: Requirements 3.4
     *
     * Exhausting the magic-link rate limit for an IP must NOT affect
     * the Google OAuth endpoint quota for the same IP.
     */
    it('Property 9: exhausting magic-link rate limit does not affect Google OAuth endpoint', async () => {
        await fc.assert(
            fc.asyncProperty(
                // Generate a fake IP address
                fc.tuple(
                    fc.integer({ min: 1, max: 254 }),
                    fc.integer({ min: 0, max: 255 }),
                    fc.integer({ min: 0, max: 255 }),
                    fc.integer({ min: 1, max: 254 }),
                ).map(([a, b, c, d]) => `${a}.${b}.${c}.${d}`),
                async (ip) => {
                    const app = buildApp();

                    // Exhaust the magic-link rate limit (3 requests per 10 minutes)
                    for (let i = 0; i < 3; i++) {
                        await request(app)
                            .post('/auth/magic-link/request')
                            .set('X-Forwarded-For', ip);
                    }

                    // The 4th request to magic-link should be rate-limited (429)
                    const magicLinkBlocked = await request(app)
                        .post('/auth/magic-link/request')
                        .set('X-Forwarded-For', ip);
                    expect(magicLinkBlocked.status).toBe(429);
                    expect(magicLinkBlocked.body.error.code).toBe('RATE_LIMIT_EXCEEDED');

                    // Google OAuth endpoint must still accept requests from the same IP
                    const googleResponse = await request(app)
                        .post('/auth/google')
                        .set('X-Forwarded-For', ip);
                    expect(googleResponse.status).not.toBe(429);
                }
            ),
            { numRuns: 5 }
        );
    });
});
