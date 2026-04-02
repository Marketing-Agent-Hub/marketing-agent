import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../db/index.js', () => ({
    prisma: {
        workspace: {
            findUnique: vi.fn(),
            create: vi.fn(),
        },
        workspaceMember: {
            findMany: vi.fn(),
            findUnique: vi.fn(),
            create: vi.fn(),
        },
    },
}));

import { prisma } from '../../db/index.js';
import { WorkspaceService } from '../../domains/workspace/workspace.service.js';

const mockWorkspace = (id = 1) => ({
    id,
    name: `Workspace ${id}`,
    slug: `workspace-${id}`,
    createdAt: new Date(),
    updatedAt: new Date(),
    members: [],
});

describe('WorkspaceService', () => {
    let service: WorkspaceService;

    beforeEach(() => {
        service = new WorkspaceService();
        vi.clearAllMocks();
    });

    it('creates workspace and owner membership', async () => {
        vi.mocked(prisma.workspace.findUnique).mockResolvedValue(null);
        vi.mocked(prisma.workspace.create).mockResolvedValue({
            id: 1,
            name: 'My Workspace',
            slug: 'my-workspace',
            createdAt: new Date(),
            updatedAt: new Date(),
            members: [{ id: 1, workspaceId: 1, userId: 10, role: 'OWNER', createdAt: new Date() }],
        } as any);

        const result = await service.create(10, { name: 'My Workspace', slug: 'my-workspace' });

        expect(result.slug).toBe('my-workspace');
        expect(result.members[0].role).toBe('OWNER');
        expect(result.members[0].userId).toBe(10);
    });

    it('throws 409 when slug already exists', async () => {
        vi.mocked(prisma.workspace.findUnique).mockResolvedValue(mockWorkspace(1) as any);

        await expect(
            service.create(10, { name: 'Duplicate', slug: 'existing-slug' })
        ).rejects.toMatchObject({ statusCode: 409 });
    });

    it('lists user workspaces', async () => {
        vi.mocked(prisma.workspaceMember.findMany).mockResolvedValue([
            { id: 1, workspaceId: 1, userId: 10, role: 'OWNER', createdAt: new Date(), workspace: mockWorkspace(1) },
            { id: 2, workspaceId: 2, userId: 10, role: 'EDITOR', createdAt: new Date(), workspace: mockWorkspace(2) },
        ] as any);

        const result = await service.listByUser(10);

        expect(result).toHaveLength(2);
        expect(result[0].role).toBe('OWNER');
        expect(result[1].role).toBe('EDITOR');
    });

    it('adds a new member to workspace', async () => {
        vi.mocked(prisma.workspaceMember.findUnique).mockResolvedValue(null);
        vi.mocked(prisma.workspaceMember.create).mockResolvedValue({
            id: 5,
            workspaceId: 1,
            userId: 20,
            role: 'EDITOR',
            createdAt: new Date(),
            user: { id: 20, email: 'new@example.com', name: 'New User' },
        } as any);

        const result = await service.addMember(1, { userId: 20, role: 'EDITOR' });

        expect(result.role).toBe('EDITOR');
        expect(result.userId).toBe(20);
    });

    it('throws 409 when user is already a member', async () => {
        vi.mocked(prisma.workspaceMember.findUnique).mockResolvedValue({
            id: 1, workspaceId: 1, userId: 20, role: 'VIEWER', createdAt: new Date(),
        } as any);

        await expect(
            service.addMember(1, { userId: 20, role: 'EDITOR' })
        ).rejects.toMatchObject({ statusCode: 409 });
    });
});
