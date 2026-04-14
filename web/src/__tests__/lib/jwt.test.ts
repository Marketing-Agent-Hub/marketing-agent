import { describe, it, expect } from 'vitest';
import { decodeAppToken, isTokenExpired } from '@/lib/jwt';

// Helper: build a mock JWT (no real signature — jwtDecode only reads payload)
function makeMockJwt(payload: Record<string, unknown>): string {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const body = btoa(JSON.stringify(payload));
    return `${header}.${body}.mock_sig`;
}

const NOW_SEC = Math.floor(Date.now() / 1000);

describe('decodeAppToken', () => {
    it('returns payload for a valid token', () => {
        const token = makeMockJwt({
            userId: 1,
            email: 'user@example.com',
            systemRole: 'USER',
            iat: NOW_SEC,
            exp: NOW_SEC + 3600,
        });
        const payload = decodeAppToken(token);
        expect(payload).not.toBeNull();
        expect(payload!.userId).toBe(1);
        expect(payload!.email).toBe('user@example.com');
        expect(payload!.systemRole).toBe('USER');
    });

    it('returns payload with systemRole ADMIN', () => {
        const token = makeMockJwt({
            userId: 42,
            email: 'admin@example.com',
            systemRole: 'ADMIN',
            iat: NOW_SEC,
            exp: NOW_SEC + 3600,
        });
        const payload = decodeAppToken(token);
        expect(payload!.systemRole).toBe('ADMIN');
    });

    it('returns null for an invalid token string', () => {
        expect(decodeAppToken('not.a.jwt')).toBeNull();
        expect(decodeAppToken('')).toBeNull();
        expect(decodeAppToken('garbage')).toBeNull();
    });

    it('returns payload for an expired token (decode does not verify expiry)', () => {
        const token = makeMockJwt({
            userId: 1,
            email: 'user@example.com',
            iat: NOW_SEC - 7200,
            exp: NOW_SEC - 3600, // expired 1 hour ago
        });
        const payload = decodeAppToken(token);
        // decodeAppToken just decodes — expiry check is isTokenExpired's job
        expect(payload).not.toBeNull();
        expect(payload!.exp).toBeLessThan(NOW_SEC);
    });

    it('returns payload even when optional fields are missing', () => {
        const token = makeMockJwt({
            userId: 5,
            email: 'minimal@example.com',
            iat: NOW_SEC,
            exp: NOW_SEC + 3600,
            // systemRole intentionally omitted
        });
        const payload = decodeAppToken(token);
        expect(payload).not.toBeNull();
        expect(payload!.systemRole).toBeUndefined();
    });
});

describe('isTokenExpired', () => {
    it('returns false for a token that has not expired', () => {
        const payload = { userId: 1, email: 'u@e.com', iat: NOW_SEC, exp: NOW_SEC + 3600 };
        expect(isTokenExpired(payload)).toBe(false);
    });

    it('returns true for a token that has expired', () => {
        const payload = { userId: 1, email: 'u@e.com', iat: NOW_SEC - 7200, exp: NOW_SEC - 1 };
        expect(isTokenExpired(payload)).toBe(true);
    });

    it('returns true when exp equals current time (boundary)', () => {
        const payload = { userId: 1, email: 'u@e.com', iat: NOW_SEC - 1, exp: NOW_SEC };
        // Date.now() >= exp * 1000 → true at boundary
        expect(isTokenExpired(payload)).toBe(true);
    });
});
