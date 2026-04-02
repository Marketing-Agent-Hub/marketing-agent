import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../db/index.js', () => ({
    prisma: {
        user: { findUnique: vi.fn(), create: vi.fn() },
        workspace: { findUnique: vi.fn(), create: vi.fn() },
        workspaceMember: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
    },
}));

vi.mock('../../config/env.js', () => ({
    env: { JWT_SECRET: 'test-secret-at-least-16-chars' },
}));

import { prisma } from '../../db/index.js';
import { AuthService } from '../../domains/auth/auth.service.js';
import { WorkspaceService } from '../../domains/workspace/workspace.service.js';

describe('Integration: register -> login -> create workspace -> add member', () => {
    let authService: AuthService;
    let workspaceService: WorkspaceService;

    beforeEach(() => {
        authService = new AuthService();
        workspaceService = new WorkspaceService();
        vi.clearAllMocks();
    });

    it('runs the full happy path', async () => {
        vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);
        vi.mocked(prisma.user.create).mockResolvedValueOnce({
            id: 1, email: 'owner@example.com', name: 'Owner', passwordHash: 'hash',
            createdAt: new Date(), updatedAt: new Date(),
        } as any);

        const registerResult = await authService.register({
            email: 'owner@example.com',
            password: 'password123',
            name: 'Owner',
        });

        expect(registerResult.token).toBeTruthy();
        expect(registerResult.user.id).toBe(1);

        const bcrypt = await import('bcrypt');
        const hash = await bcrypt.hash('password123', 10);
        vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
            id: 1, email: 'owner@example.com', name: 'Owner', passwordHash: hash,
            createdAt: new Date(), updatedAt: new Date(),
        } as any);

        const loginResult = await authService.login({
            email: 'owner@example.com',
            password: 'password123',
        });

        expect(loginResult.token).toBeTruthy();

        vi.mocked(prisma.workspace.findUnique).mockResolvedValueOnce(null);
        vi.mocked(prisma.workspace.create).mockResolvedValueOnce({
            id: 10, name: 'My Company', slug: 'my-company', createdAt: new Date(), updatedAt: new Date(),
            members: [{ id: 1, workspaceId: 10, userId: 1, role: 'OWNER', createdAt: new Date() }],
        } as any);

        const workspace = await workspaceService.create(1, { name: 'My Company', slug: 'my-company' });

        expect(workspace.id).toBe(10);
        expect(workspace.members[0].role).toBe('OWNER');

        vi.mocked(prisma.workspaceMember.findUnique).mockResolvedValueOnce(null);
        vi.mocked(prisma.workspaceMember.create).mockResolvedValueOnce({
            id: 2, workspaceId: 10, userId: 2, role: 'EDITOR', createdAt: new Date(),
            user: { id: 2, email: 'editor@example.com', name: 'Editor' },
        } as any);

        const member = await workspaceService.addMember(10, { userId: 2, role: 'EDITOR' });

        expect(member.role).toBe('EDITOR');
        expect(member.userId).toBe(2);
    });
});
