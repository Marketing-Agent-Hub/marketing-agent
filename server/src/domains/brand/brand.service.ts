import { prisma } from '../../db/index.js';
import { CreateBrandInput, UpdateBrandInput } from '../../shared/marketing/schemas/brand.schema.js';

export class BrandService {
    async create(workspaceId: number, data: CreateBrandInput) {
        return prisma.brand.create({
            data: {
                workspaceId,
                name: data.name,
                websiteUrl: data.websiteUrl,
                industry: data.industry,
                timezone: data.timezone,
                defaultLanguage: data.defaultLanguage ?? 'en',
            },
        });
    }

    async listByWorkspace(workspaceId: number) {
        return prisma.brand.findMany({
            where: { workspaceId },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                name: true,
                websiteUrl: true,
                industry: true,
                status: true,
                defaultLanguage: true,
                createdAt: true,
            },
        });
    }

    async getById(brandId: number) {
        return prisma.brand.findUnique({
            where: { id: brandId },
            include: {
                profile: true,
                pillars: true,
                socialAccounts: { select: { id: true, platform: true, accountName: true, status: true } },
            },
        });
    }

    async addKnowledgeDocument(brandId: number, data: { title: string; content: string; sourceUrl?: string; docType?: string }) {
        return prisma.brandKnowledgeDocument.create({
            data: {
                brandId,
                title: data.title,
                content: data.content,
                sourceUrl: data.sourceUrl,
                docType: data.docType,
            },
        });
    }

    async update(brandId: number, data: UpdateBrandInput) {
        const existing = await prisma.brand.findUnique({ where: { id: brandId } });
        if (!existing) {
            const error = new Error('Brand không tồn tại') as any;
            error.statusCode = 404;
            error.code = 'NOT_FOUND';
            throw error;
        }

        return prisma.brand.update({
            where: { id: brandId },
            data,
        });
    }
}

export const brandService = new BrandService();
