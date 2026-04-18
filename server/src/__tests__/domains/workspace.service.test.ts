import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockCreate, mockTransaction } = vi.hoisted(() => ({
    mockCreate: vi.fn(),
    mockTransaction: vi.fn(),
}));

vi.mock('../../db/index.js', () => ({
    prisma: {
        workspace: {
            findUnique: vi.fn(),
            create: mockCreate,
        },
        workspaceMember: {
            findMany: vi.fn(),
            findUnique: vi.fn(),
            create: vi.fn(),
        },
        $transaction: mockTransaction,
    },
}));

import { prisma } from '../../db/index.js';
import { WorkspaceService } from '../../domains/workspace/workspace.service.js';

const mockWorkspace = (id = 1) => ({
    id,
    name: `Workspace ${id}`,
    slug: `workspace-${id}-abc1234`,
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

    it('creates workspace and owner membership with auto-generated slug', async () => {
        const created = {
            id: 1,
            name: 'My Workspace',
            slug: 'my-workspace-x8b9qzr',
            createdAt: new Date(),
            updatedAt: new Date(),
            members: [{ id: 1, workspaceId: 1, userId: 10, role: 'OWNER', createdAt: new Date() }],
        };

        // $transaction executes the callback with a tx object
        mockTransaction.mockImplementation(async (fn: any) => fn({ workspace: { create: vi.fn().mockResolvedValue(created) } }));

        const result = await service.create(10, { name: 'My Workspace' });

        expect(result.name).toBe('My Workspace');
        // slug should be auto-generated: starts with base slug
        expect(result.slug).toMatch(/^my-workspace-/);
        expect(result.members[0].role).toBe('OWNER');
        expect(result.members[0].userId).toBe(10);
    });

    it('retries on P2002 slug collision and succeeds on second attempt', async () => {
        const p2002Error = Object.assign(new Error('Unique constraint'), { code: 'P2002' });
        const created = {
            id: 2,
            name: 'Collision Test',
            slug: 'collision-test-zzz9999',
            createdAt: new Date(),
            updatedAt: new Date(),
            members: [{ id: 1, workspaceId: 2, userId: 5, role: 'OWNER', createdAt: new Date() }],
        };

        let callCount = 0;
        mockTransaction.mockImplementation(async (fn: any) => {
            callCount++;
            if (callCount === 1) throw p2002Error;
            return fn({ workspace: { create: vi.fn().mockResolvedValue(created) } });
        });

        const result = await service.create(5, { name: 'Collision Test' });

        expect(result.name).toBe('Collision Test');
        expect(mockTransaction).toHaveBeenCalledTimes(2);
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
