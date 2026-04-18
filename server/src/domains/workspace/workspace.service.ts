import { WorkspaceRole } from '@prisma/client';
import { customAlphabet } from 'nanoid';
import slugify from 'slugify';
import { prisma } from '../../db/index.js';
import { AddMemberInput, CreateWorkspaceInput } from '../../shared/marketing/schemas/workspace.schema.js';

// nanoid with URL-safe alphabet, 7 chars → ~35 bits of entropy
// collision probability ≈ 1 in 10^10 per generation
const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 7);

/**
 * Generate a URL-friendly base slug from a workspace name.
 * Handles Vietnamese diacritics and special characters.
 */
function generateBaseSlug(name: string): string {
    return slugify(name, {
        lower: true,
        strict: true,      // remove all non-alphanumeric except hyphens
        locale: 'vi',      // Vietnamese diacritic removal
        trim: true,
    }) || 'workspace';    // fallback if name is all special chars
}

/**
 * Generate a unique slug: <base>-<nanoid7>
 * e.g. "oc-news-team-x8b9qzr"
 *
 * Uses nanoid suffix to avoid DB lookups for uniqueness.
 * On the rare P2002 collision, retries with a fresh nanoid.
 */
function generateSlug(name: string): string {
    const base = generateBaseSlug(name);
    return `${base}-${nanoid()}`;
}

export class WorkspaceService {
    async create(userId: number, data: CreateWorkspaceInput) {
        const MAX_RETRIES = 3;

        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            const slug = generateSlug(data.name);

            try {
                return await prisma.$transaction(async (tx) => {
                    return tx.workspace.create({
                        data: {
                            name: data.name,
                            slug,
                            members: {
                                create: {
                                    userId,
                                    role: WorkspaceRole.OWNER,
                                },
                            },
                        },
                        include: { members: true },
                    });
                });
            } catch (error: any) {
                // P2002 = unique constraint violation — retry with new nanoid
                if (error?.code === 'P2002' && attempt < MAX_RETRIES - 1) {
                    continue;
                }
                throw error;
            }
        }

        // Should never reach here, but TypeScript needs a return
        const error = new Error('Không thể tạo workspace sau nhiều lần thử') as any;
        error.statusCode = 500;
        throw error;
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
