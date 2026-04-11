import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../db/index.js', () => ({
    prisma: {
        brandSource: {
            create: vi.fn(),
            delete: vi.fn(),
            findMany: vi.fn(),
            update: vi.fn(),
        },
    },
}));

import { prisma } from '../../../db/index.js';
import {
    subscribeBrandToSource,
    unsubscribeBrandFromSource,
    listBrandSources,
    updateBrandSourceOverrides,
    ConflictError,
    NotFoundError,
} from '../../../domains/content-intelligence/brand-source.service.js';

describe('subscribeBrandToSource', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('creates BrandSource with correct fields', async () => {
        const mockResult = { brandId: 1, sourceId: 2, enabled: true, fetchIntervalMinutes: 30 };
        vi.mocked(prisma.brandSource.create).mockResolvedValue(mockResult as any);

        const result = await subscribeBrandToSource(1, 2, { fetchIntervalMinutes: 30 });

        expect(prisma.brandSource.create).toHaveBeenCalledWith({
            data: {
                brandId: 1,
                sourceId: 2,
                fetchIntervalMinutes: 30,
                enabled: true,
            },
        });
        expect(result).toEqual(mockResult);
    });

    it('throws ConflictError when P2002 (duplicate subscription)', async () => {
        const prismaError = Object.assign(new Error('Unique constraint'), { code: 'P2002' });
        vi.mocked(prisma.brandSource.create).mockRejectedValue(prismaError);

        await expect(subscribeBrandToSource(1, 2)).rejects.toThrow(ConflictError);
        await expect(subscribeBrandToSource(1, 2)).rejects.toThrow('ALREADY_SUBSCRIBED');
    });
});

describe('unsubscribeBrandFromSource', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('calls prisma.brandSource.delete with correct where clause', async () => {
        vi.mocked(prisma.brandSource.delete).mockResolvedValue({} as any);

        await unsubscribeBrandFromSource(1, 2);

        expect(prisma.brandSource.delete).toHaveBeenCalledWith({
            where: { brandId_sourceId: { brandId: 1, sourceId: 2 } },
        });
    });

    it('Requirement 9.5: unsubscribe deletes only the BrandSource record — NOT the Source', async () => {
        vi.mocked(prisma.brandSource.delete).mockResolvedValue({} as any);

        await unsubscribeBrandFromSource(1, 2);

        // Only brandSource.delete is called — source.delete must NOT be called
        expect(prisma.brandSource.delete).toHaveBeenCalledTimes(1);
        // Verify the mock has no source.delete method called (prisma mock only has brandSource)
        expect(prisma.brandSource.delete).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { brandId_sourceId: { brandId: 1, sourceId: 2 } },
            }),
        );
        // The prisma mock does not expose source.delete — confirming the service never calls it
        expect((prisma as any).source).toBeUndefined();
    });

    it('throws NotFoundError when P2025', async () => {
        const prismaError = Object.assign(new Error('Record not found'), { code: 'P2025' });
        vi.mocked(prisma.brandSource.delete).mockRejectedValue(prismaError);

        await expect(unsubscribeBrandFromSource(1, 2)).rejects.toThrow(NotFoundError);
        await expect(unsubscribeBrandFromSource(1, 2)).rejects.toThrow('Subscription not found');
    });
});

describe('listBrandSources', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns all subscriptions with source data included', async () => {
        const mockResults = [
            { brandId: 1, sourceId: 2, enabled: true, source: { id: 2, name: 'Source A' } },
            { brandId: 1, sourceId: 3, enabled: false, source: { id: 3, name: 'Source B' } },
        ];
        vi.mocked(prisma.brandSource.findMany).mockResolvedValue(mockResults as any);

        const result = await listBrandSources(1);

        expect(prisma.brandSource.findMany).toHaveBeenCalledWith({
            where: { brandId: 1 },
            include: { source: true },
        });
        expect(result).toEqual(mockResults);
    });
});

describe('updateBrandSourceOverrides', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('updates only enabled when only enabled is provided', async () => {
        const mockResult = { brandId: 1, sourceId: 2, enabled: false, fetchIntervalMinutes: null };
        vi.mocked(prisma.brandSource.update).mockResolvedValue(mockResult as any);

        await updateBrandSourceOverrides(1, 2, { enabled: false });

        expect(prisma.brandSource.update).toHaveBeenCalledWith({
            where: { brandId_sourceId: { brandId: 1, sourceId: 2 } },
            data: { enabled: false },
        });
    });

    it('updates only fetchIntervalMinutes when only fetchIntervalMinutes is provided', async () => {
        const mockResult = { brandId: 1, sourceId: 2, enabled: true, fetchIntervalMinutes: 60 };
        vi.mocked(prisma.brandSource.update).mockResolvedValue(mockResult as any);

        await updateBrandSourceOverrides(1, 2, { fetchIntervalMinutes: 60 });

        expect(prisma.brandSource.update).toHaveBeenCalledWith({
            where: { brandId_sourceId: { brandId: 1, sourceId: 2 } },
            data: { fetchIntervalMinutes: 60 },
        });
    });

    it('updates both fields when both are provided', async () => {
        const mockResult = { brandId: 1, sourceId: 2, enabled: false, fetchIntervalMinutes: 120 };
        vi.mocked(prisma.brandSource.update).mockResolvedValue(mockResult as any);

        await updateBrandSourceOverrides(1, 2, { enabled: false, fetchIntervalMinutes: 120 });

        expect(prisma.brandSource.update).toHaveBeenCalledWith({
            where: { brandId_sourceId: { brandId: 1, sourceId: 2 } },
            data: { enabled: false, fetchIntervalMinutes: 120 },
        });
    });

    it('throws NotFoundError when P2025', async () => {
        const prismaError = Object.assign(new Error('Record not found'), { code: 'P2025' });
        vi.mocked(prisma.brandSource.update).mockRejectedValue(prismaError);

        await expect(updateBrandSourceOverrides(1, 2, { enabled: true })).rejects.toThrow(NotFoundError);
        await expect(updateBrandSourceOverrides(1, 2, { enabled: true })).rejects.toThrow('Subscription not found');
    });
});
