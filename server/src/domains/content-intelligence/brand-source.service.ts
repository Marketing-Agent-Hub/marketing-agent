import { BrandSource, Source } from '@prisma/client';
import { prisma } from '../../db/index.js';

export class ConflictError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ConflictError';
    }
}

export class NotFoundError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'NotFoundError';
    }
}

export interface BrandSourceOverrides {
    fetchIntervalMinutes?: number | null;
    enabled?: boolean;
}

export async function subscribeBrandToSource(
    brandId: number,
    sourceId: number,
    overrides?: BrandSourceOverrides
): Promise<BrandSource> {
    try {
        return await prisma.brandSource.create({
            data: {
                brandId,
                sourceId,
                fetchIntervalMinutes: overrides?.fetchIntervalMinutes,
                enabled: overrides?.enabled ?? true,
            },
        });
    } catch (err: any) {
        if (err?.code === 'P2002') {
            throw new ConflictError('ALREADY_SUBSCRIBED');
        }
        if (err?.code === 'P2025') {
            throw new NotFoundError('Source not found');
        }
        throw err;
    }
}

export async function unsubscribeBrandFromSource(
    brandId: number,
    sourceId: number
): Promise<void> {
    try {
        await prisma.brandSource.delete({
            where: { brandId_sourceId: { brandId, sourceId } },
        });
    } catch (err: any) {
        if (err?.code === 'P2025') {
            throw new NotFoundError('Subscription not found');
        }
        throw err;
    }
}

export async function listBrandSources(
    brandId: number
): Promise<Array<BrandSource & { source: Source }>> {
    return prisma.brandSource.findMany({
        where: { brandId },
        include: { source: true },
    });
}

export async function updateBrandSourceOverrides(
    brandId: number,
    sourceId: number,
    overrides: BrandSourceOverrides
): Promise<BrandSource> {
    try {
        return await prisma.brandSource.update({
            where: { brandId_sourceId: { brandId, sourceId } },
            data: {
                ...(overrides.fetchIntervalMinutes !== undefined && {
                    fetchIntervalMinutes: overrides.fetchIntervalMinutes,
                }),
                ...(overrides.enabled !== undefined && { enabled: overrides.enabled }),
            },
        });
    } catch (err: any) {
        if (err?.code === 'P2025') {
            throw new NotFoundError('Subscription not found');
        }
        throw err;
    }
}
