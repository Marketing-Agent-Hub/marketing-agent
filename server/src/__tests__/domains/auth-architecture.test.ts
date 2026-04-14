import { describe, expect, it, vi } from 'vitest';
import { SystemRole } from '@prisma/client';

vi.mock('../../config/env.js', () => ({
    env: {
        JWT_SECRET: 'test-secret-at-least-16-chars',
        ADMIN_EMAIL: 'admin@example.com',
        CORS_ORIGIN: 'http://localhost:3000',
        PORT: 3001,
        NODE_ENV: 'test',
        USER_AGENT: 'TestBot/1.0',
    },
}));

describe('Auth architecture regression', () => {
    it('canonical auth service exports expected interface', async () => {
        const { AuthService } = await import('../../domains/auth/auth.service.js');
        const service = new AuthService();
        expect(typeof service.register).toBe('function');
        expect(typeof service.login).toBe('function');
        expect(typeof service.getMe).toBe('function');
        expect(typeof service.verifyToken).toBe('function');
    });

    it('authService.issueToken accepts 3 parameters', async () => {
        const { authService } = await import('../../domains/auth/auth.service.js');
        // Verify calling with 3 args works and returns a valid JWT string
        const token = authService.issueToken(1, 'user@example.com', SystemRole.ADMIN);
        expect(typeof token).toBe('string');
        expect(token.split('.').length).toBe(3); // valid JWT has 3 parts
    });

    it('ProductJwtPayload has optional systemRole field', async () => {
        const { authService } = await import('../../domains/auth/auth.service.js');
        // Issue token with ADMIN role and verify payload contains systemRole
        const token = authService.issueToken(42, 'admin@example.com', SystemRole.ADMIN);
        const payload = authService.verifyToken(token);
        expect(payload).not.toBeNull();
        expect(payload!.systemRole).toBe(SystemRole.ADMIN);
        // Also verify USER role is preserved
        const userToken = authService.issueToken(1, 'user@example.com', SystemRole.USER);
        const userPayload = authService.verifyToken(userToken);
        expect(userPayload!.systemRole).toBe(SystemRole.USER);
    });

    it('requireAdminAuth is exported from middleware/admin-auth.ts', async () => {
        const adminAuthModule = await import('../../middleware/admin-auth.js');
        expect(typeof adminAuthModule.requireAdminAuth).toBe('function');
    });
});
