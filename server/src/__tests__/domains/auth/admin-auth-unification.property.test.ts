/**
 * Property-Based Tests: Admin Auth Unification
 * Feature: admin-auth-unification
 *
 * Tests 5 correctness properties using fast-check.
 */

import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';
import jwt from 'jsonwebtoken';
import { SystemRole } from '@prisma/client';

vi.mock('../../../config/env.js', () => ({
    env: {
        JWT_SECRET: 'test-secret-at-least-16-chars',
        ADMIN_EMAIL: 'admin@example.com',
    },
}));

// Import after mock
const { authService } = await import('../../../domains/auth/auth.service.js');
const { requireAdminAuth } = await import('../../../middleware/admin-auth.js');
const { requireProductAuth } = await import('../../../middleware/product-auth.js');

const ADMIN_EMAIL = 'admin@example.com';
const JWT_SECRET = 'test-secret-at-least-16-chars';

/**
 * Simulate Express middleware with a Bearer token.
 * Returns the HTTP status set on res, and whether next() was called.
 */
function simulateMiddleware(
    middleware: Function,
    token: string,
): { status: number | null; calledNext: boolean } {
    let status: number | null = null;
    let calledNext = false;
    const req = { headers: { authorization: `Bearer ${token}` } } as any;
    const res = {
        status: (s: number) => {
            status = s;
            return { json: () => { } };
        },
        json: () => { },
    } as any;
    const next = () => {
        calledNext = true;
    };
    middleware(req, res, next);
    return { status, calledNext };
}

describe('admin-auth-unification property-based tests', () => {
    /**
     * Property 1: Admin role assignment is idempotent
     * Validates: Requirements 3.4
     *
     * For any userId and email === ADMIN_EMAIL,
     * issueToken(userId, email, ADMIN) → verifyToken() always returns systemRole === 'ADMIN'
     */
    it('Property 1: Admin role assignment is idempotent', () => {
        fc.assert(
            fc.property(fc.integer({ min: 1 }), (userId) => {
                const token = authService.issueToken(userId, ADMIN_EMAIL, SystemRole.ADMIN);
                const payload = authService.verifyToken(token);
                return payload?.systemRole === 'ADMIN';
            }),
            { numRuns: 100 },
        );
    });

    /**
     * Property 2: Non-admin users never receive ADMIN role
     * Validates: Requirements 3.3
     *
     * For any userId and email that is NOT ADMIN_EMAIL,
     * issueToken(userId, email, USER) → verifyToken() always returns systemRole === 'USER'
     */
    it('Property 2: Non-admin users never receive ADMIN role', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: 1 }),
                fc.emailAddress().filter((e) => e !== ADMIN_EMAIL),
                (userId, email) => {
                    const token = authService.issueToken(userId, email, SystemRole.USER);
                    const payload = authService.verifyToken(token);
                    return payload?.systemRole === 'USER';
                },
            ),
            { numRuns: 100 },
        );
    });

    /**
     * Property 3: JWT round-trip preserves systemRole
     * Validates: Requirements 4.1, 4.2, 4.5
     *
     * For any userId, email, and systemRole from {USER, ADMIN},
     * issueToken → verifyToken returns payload where systemRole, userId, email all match exactly.
     */
    it('Property 3: JWT round-trip preserves systemRole', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: 1 }),
                fc.emailAddress(),
                fc.constantFrom(SystemRole.USER, SystemRole.ADMIN),
                (userId, email, systemRole) => {
                    const token = authService.issueToken(userId, email, systemRole);
                    const payload = authService.verifyToken(token);
                    return (
                        payload?.systemRole === systemRole &&
                        payload?.userId === userId &&
                        payload?.email === email
                    );
                },
            ),
            { numRuns: 100 },
        );
    });

    /**
     * Property 4: requireAdminAuth rejects non-ADMIN tokens
     * Validates: Requirements 5.3, 5.4, 5.5, 8.3
     *
     * For any userId, email, and systemRole from {USER},
     * requireAdminAuth responds with 403.
     * Also, legacy tokens (no systemRole field) are rejected with 403.
     */
    it('Property 4: requireAdminAuth rejects non-ADMIN tokens', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: 1 }),
                fc.emailAddress(),
                (userId, email) => {
                    // USER token → 403
                    const userToken = authService.issueToken(userId, email, SystemRole.USER);
                    const { status: userStatus } = simulateMiddleware(requireAdminAuth, userToken);
                    if (userStatus !== 403) return false;

                    // Legacy token (no systemRole) → 403
                    const legacyToken = jwt.sign({ userId, email }, JWT_SECRET);
                    const { status: legacyStatus } = simulateMiddleware(requireAdminAuth, legacyToken);
                    return legacyStatus === 403;
                },
            ),
            { numRuns: 100 },
        );
    });

    /**
     * Property 5: requireProductAuth accepts all valid JWTs regardless of systemRole
     * Validates: Requirements 8.4, 8.5
     *
     * For any userId, email, and systemRole from {USER, ADMIN, undefined (legacy)},
     * requireProductAuth calls next() (calledNext === true).
     */
    it('Property 5: requireProductAuth accepts all valid JWTs regardless of systemRole', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: 1 }),
                fc.emailAddress(),
                fc.constantFrom(SystemRole.USER, SystemRole.ADMIN, null),
                (userId, email, systemRole) => {
                    const token =
                        systemRole !== null
                            ? authService.issueToken(userId, email, systemRole)
                            : jwt.sign({ userId, email }, JWT_SECRET); // legacy: no systemRole

                    const { calledNext } = simulateMiddleware(requireProductAuth, token);
                    return calledNext === true;
                },
            ),
            { numRuns: 100 },
        );
    });
});
