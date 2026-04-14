import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SystemRole } from '@prisma/client';

const { mockFetch } = vi.hoisted(() => ({ mockFetch: vi.fn() }));
vi.mock('node-fetch', () => ({ default: mockFetch }));

vi.mock('../../db/index.js', () => ({
    prisma: {
        user: {
            findUnique: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
        },
    },
}));

vi.mock('../../config/env.js', () => ({
    env: {
        JWT_SECRET: 'test-secret-at-least-16-chars',
        GOOGLE_CLIENT_ID: 'test-client-id',
        ADMIN_EMAIL: 'admin@example.com',
    },
}));

vi.mock('../../lib/logger.js', () => ({
    logger: { warn: vi.fn(), info: vi.fn() },
}));

import { prisma } from '../../db/index.js';
import { GoogleOAuthService } from '../../domains/auth/google-oauth.service.js';
import { authService } from '../../domains/auth/auth.service.js';

const ADMIN_EMAIL = 'admin@example.com';
const VALID_TOKEN_INFO = {
    sub: 'google-sub-123',
    email: 'user@example.com',
    name: 'Test User',
    aud: 'test-client-id',
};

function makeUser(overrides: Record<string, unknown> = {}) {
    return {
        id: 1,
        email: 'user@example.com',
        name: 'Test User',
        googleId: 'google-sub-123',
        passwordHash: null,
        systemRole: SystemRole.USER,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
    };
}

function mockGoogleResponse(tokenInfo: object) {
    mockFetch.mockResolvedValue({
        ok: true,
        json: async () => tokenInfo,
    });
}

describe('GoogleOAuthService — role assignment', () => {
    let service: GoogleOAuthService;

    beforeEach(() => {
        service = new GoogleOAuthService();
        vi.clearAllMocks();
    });

    it('assigns ADMIN role and updates DB when email matches ADMIN_EMAIL', async () => {
        const adminUser = makeUser({ email: ADMIN_EMAIL, systemRole: SystemRole.USER });
        const updatedAdminUser = { ...adminUser, systemRole: SystemRole.ADMIN };

        mockGoogleResponse({ ...VALID_TOKEN_INFO, email: ADMIN_EMAIL });
        vi.mocked(prisma.user.findUnique).mockResolvedValue(adminUser as any);
        vi.mocked(prisma.user.update).mockResolvedValue(updatedAdminUser as any);

        const result = await service.signInWithGoogle('valid-id-token');

        // DB should be updated to ADMIN
        expect(prisma.user.update).toHaveBeenCalledWith({
            where: { id: adminUser.id },
            data: { systemRole: SystemRole.ADMIN },
        });

        // JWT should contain ADMIN role
        const payload = authService.verifyToken(result.token);
        expect(payload?.systemRole).toBe(SystemRole.ADMIN);
    });

    it('does not update DB when admin user already has ADMIN role (idempotent)', async () => {
        const adminUser = makeUser({ email: ADMIN_EMAIL, systemRole: SystemRole.ADMIN });

        mockGoogleResponse({ ...VALID_TOKEN_INFO, email: ADMIN_EMAIL });
        vi.mocked(prisma.user.findUnique).mockResolvedValue(adminUser as any);

        const result = await service.signInWithGoogle('valid-id-token');

        // DB update should NOT be called since role is already ADMIN
        expect(prisma.user.update).not.toHaveBeenCalled();

        // JWT should still contain ADMIN role
        const payload = authService.verifyToken(result.token);
        expect(payload?.systemRole).toBe(SystemRole.ADMIN);
    });

    it('keeps USER role when email does not match ADMIN_EMAIL', async () => {
        const regularUser = makeUser({ email: 'user@example.com', systemRole: SystemRole.USER });

        mockGoogleResponse(VALID_TOKEN_INFO);
        vi.mocked(prisma.user.findUnique).mockResolvedValue(regularUser as any);

        const result = await service.signInWithGoogle('valid-id-token');

        // DB should NOT be updated
        expect(prisma.user.update).not.toHaveBeenCalled();

        // JWT should contain USER role
        const payload = authService.verifyToken(result.token);
        expect(payload?.systemRole).toBe(SystemRole.USER);
    });
});
