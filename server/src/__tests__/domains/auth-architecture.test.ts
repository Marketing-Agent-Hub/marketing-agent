import { describe, expect, it, vi } from 'vitest';

vi.mock('../../config/env.js', () => ({
    env: {
        JWT_SECRET: 'test-secret-at-least-16-chars',
        ADMIN_EMAIL: 'admin@example.com',
        ADMIN_PASSWORD_HASH: '$2b$10$test',
        CORS_ORIGIN: 'http://localhost:3000',
        PORT: 3001,
        NODE_ENV: 'test',
        USER_AGENT: 'TestBot/1.0',
    },
}));

describe('Auth architecture regression', () => {
    it('internal auth service exports expected interface', async () => {
        const { AuthService } = await import('../../domains/auth/internal-auth.service.js');
        const service = new AuthService();
        expect(typeof service.login).toBe('function');
        expect(typeof service.verifyToken).toBe('function');
    });

    it('canonical auth service exports expected interface', async () => {
        const { AuthService } = await import('../../domains/auth/auth.service.js');
        const service = new AuthService();
        expect(typeof service.register).toBe('function');
        expect(typeof service.login).toBe('function');
        expect(typeof service.getMe).toBe('function');
        expect(typeof service.verifyToken).toBe('function');
    });

    it('internal and product auth services are distinct classes', async () => {
        const { AuthService: InternalAuthService } = await import('../../domains/auth/internal-auth.service.js');
        const { AuthService: ProductAuthService } = await import('../../domains/auth/auth.service.js');
        expect(InternalAuthService).not.toBe(ProductAuthService);
    });
});
