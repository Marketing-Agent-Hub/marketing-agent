import { WorkspaceRole } from '@prisma/client';
import { prisma } from '../../db/index.js';
import { AddMemberInput, CreateWorkspaceInput } from '../../shared/marketing/schemas/workspace.schema.js';

export class WorkspaceService {
    async create(userId: number, data: CreateWorkspaceInput) {
        const existing = await prisma.workspace.findUnique({ where: { slug: data.slug } });
        if (existing) {
            const error = new Error('Slug đã được sử dụng') as any;
            error.statusCode = 409;
            error.code = 'CONFLICT';
            throw error;
        }

        return prisma.workspace.create({
            data: {
                name: data.name,
                slug: data.slug,
                members: {
                    create: {
                        userId,
                        role: WorkspaceRole.OWNER,
                    },
                },
            },
            include: { members: true },
        });
    }

    async listByUser(userId: number) {
        const memberships = await prisma.workspaceMember.findMany({
            where: { userId },
            include: { workspace: true },
            orderBy: { createdAt: 'desc' },
        });

        return memberships.map(membership => ({ ...membership.workspace, role: membership.role }));
    }

    async getById(workspaceId: number) {
        return prisma.workspace.findUnique({
            where: { id: workspaceId },
            include: {
                members: {
                    include: { user: { select: { id: true, email: true, name: true } } },
                },
                brands: { select: { id: true, name: true, status: true } },
            },
        });
    }

    async addMember(workspaceId: number, data: AddMemberInput) {
        const existing = await prisma.workspaceMember.findUnique({
            where: { workspaceId_userId: { workspaceId, userId: data.userId } },
        });
        if (existing) {
            const error = new Error('User đã là thành viên của workspace này') as any;
            error.statusCode = 409;
            error.code = 'CONFLICT';
            throw error;
        }

        return prisma.workspaceMember.create({
            data: {
                workspaceId,
                userId: data.userId,
                role: data.role as WorkspaceRole,
            },
            include: { user: { select: { id: true, email: true, name: true } } },
        });
    }
}

export const workspaceService = new WorkspaceService();
