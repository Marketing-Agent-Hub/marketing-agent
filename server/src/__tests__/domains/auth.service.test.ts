import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../db/index.js', () => ({
    prisma: {
        user: {
            findUnique: vi.fn(),
            create: vi.fn(),
        },
    },
}));

vi.mock('../../config/env.js', () => ({
    env: { JWT_SECRET: 'test-secret-at-least-16-chars' },
}));

import { prisma } from '../../db/index.js';
import { AuthService } from '../../domains/auth/auth.service.js';

describe('AuthService', () => {
    let service: AuthService;

    beforeEach(() => {
        service = new AuthService();
        vi.clearAllMocks();
    });

    describe('register', () => {
        it('creates a user and returns a token when email is new', async () => {
            vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
            vi.mocked(prisma.user.create).mockResolvedValue({
                id: 1,
                email: 'test@example.com',
                name: 'Test User',
                passwordHash: 'hash',
                createdAt: new Date(),
                updatedAt: new Date(),
            } as any);

            const result = await service.register({
                email: 'test@example.com',
                password: 'password123',
                name: 'Test User',
            });

            expect(result.token).toBeTruthy();
            expect(result.user.email).toBe('test@example.com');
            expect(result.user.id).toBe(1);
        });

        it('throws 409 when email already exists', async () => {
            vi.mocked(prisma.user.findUnique).mockResolvedValue({
                id: 1,
                email: 'existing@example.com',
            } as any);

            await expect(
                service.register({ email: 'existing@example.com', password: 'password123' })
            ).rejects.toMatchObject({ statusCode: 409 });
        });
    });

    describe('login', () => {
        it('returns a token when credentials are valid', async () => {
            const bcrypt = await import('bcrypt');
            const hash = await bcrypt.hash('correctpassword', 10);

            vi.mocked(prisma.user.findUnique).mockResolvedValue({
                id: 1,
                email: 'user@example.com',
                name: null,
                passwordHash: hash,
                createdAt: new Date(),
                updatedAt: new Date(),
            } as any);

            const result = await service.login({
                email: 'user@example.com',
                password: 'correctpassword',
            });

            expect(result.token).toBeTruthy();
            expect(result.user.email).toBe('user@example.com');
        });

        it('throws 401 when password is invalid', async () => {
            const bcrypt = await import('bcrypt');
            const hash = await bcrypt.hash('correctpassword', 10);

            vi.mocked(prisma.user.findUnique).mockResolvedValue({
                id: 1,
                email: 'user@example.com',
                name: null,
                passwordHash: hash,
                createdAt: new Date(),
                updatedAt: new Date(),
            } as any);

            await expect(
                service.login({ email: 'user@example.com', password: 'wrongpassword' })
            ).rejects.toMatchObject({ statusCode: 401 });
        });

        it('throws 401 when email does not exist', async () => {
            vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

            await expect(
                service.login({ email: 'notfound@example.com', password: 'password123' })
            ).rejects.toMatchObject({ statusCode: 401 });
        });
    });

    describe('verifyToken', () => {
        it('returns payload for a valid token', async () => {
            vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
            vi.mocked(prisma.user.create).mockResolvedValue({
                id: 5,
                email: 'verify@example.com',
                name: null,
                passwordHash: 'hash',
                createdAt: new Date(),
                updatedAt: new Date(),
            } as any);

            const result = await service.register({
                email: 'verify@example.com',
                password: 'password123',
            });

            const payload = service.verifyToken(result.token);
            expect(payload).not.toBeNull();
            expect(payload?.userId).toBe(5);
        });

        it('returns null for an invalid token', () => {
            const payload = service.verifyToken('invalid.token.here');
            expect(payload).toBeNull();
        });
    });
});
