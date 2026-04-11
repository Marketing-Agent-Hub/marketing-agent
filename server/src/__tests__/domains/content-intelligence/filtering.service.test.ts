import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../db/index.js', () => ({
    prisma: {
        item: {
            findMany: vi.fn(),
            update: vi.fn(),
        },
        filterProfile: {
            findUnique: vi.fn(),
        },
        article: {
            findUnique: vi.fn(),
        },
        setting: {
            findUnique: vi.fn().mockResolvedValue(null),
        },
    },
}));

vi.mock('../../../lib/ai-client.js', () => ({
    aiClient: {
        embed: vi.fn(),
    },
    OpenRouterCreditError: class OpenRouterCreditError extends Error { },
    OpenRouterOverloadedError: class OpenRouterOverloadedError extends Error { },
}));

vi.mock('../../../domains/content-intelligence/filter-engine.js', () => ({
    runFilterEngine: vi.fn(),
}));

import { prisma } from '../../../db/index.js';
import { runFilterEngine } from '../../../domains/content-intelligence/filter-engine.js';
import { filterExtractedItemsForBrand } from '../../../domains/content-intelligence/filtering.service.js';

const mockItems = [
    { id: 1, title: 'Article One' },
    { id: 2, title: 'Article Two' },
];

const mockArticle = { extractedContent: 'Some extracted content' };

describe('filterExtractedItemsForBrand', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(prisma.item.findMany).mockResolvedValue(mockItems as any);
        vi.mocked(prisma.article.findUnique).mockResolvedValue(mockArticle as any);
        vi.mocked(prisma.item.update).mockResolvedValue({} as any);
    });

    // -------------------------------------------------------------------------
    // Test 1: PASS_THROUGH — no FilterProfile in DB
    // -------------------------------------------------------------------------
    it('PASS_THROUGH (no FilterProfile): all items advance to READY_FOR_AI', async () => {
        vi.mocked(prisma.filterProfile.findUnique).mockResolvedValue(null);
        vi.mocked(runFilterEngine).mockResolvedValue({ allowed: true, score: 1.0, reason: 'pass_through' });

        const result = await filterExtractedItemsForBrand(42);

        expect(result).toEqual({ passed: 2, rejected: 0 });
        expect(prisma.item.update).toHaveBeenCalledTimes(2);
        for (const call of vi.mocked(prisma.item.update).mock.calls) {
            expect(call[0].data).toMatchObject({ status: 'READY_FOR_AI', filterReason: null });
        }
    });

    // -------------------------------------------------------------------------
    // Test 2: PASS_THROUGH — FilterProfile exists with mode=PASS_THROUGH
    // -------------------------------------------------------------------------
    it('PASS_THROUGH (FilterProfile mode=PASS_THROUGH): all items advance to READY_FOR_AI', async () => {
        vi.mocked(prisma.filterProfile.findUnique).mockResolvedValue({
            brandId: 42,
            mode: 'PASS_THROUGH',
            vectorProfile: null,
            similarityThreshold: 0.7,
        } as any);
        vi.mocked(runFilterEngine).mockResolvedValue({ allowed: true, score: 1.0, reason: 'pass_through' });

        const result = await filterExtractedItemsForBrand(42);

        expect(result).toEqual({ passed: 2, rejected: 0 });
        expect(prisma.item.update).toHaveBeenCalledTimes(2);
        for (const call of vi.mocked(prisma.item.update).mock.calls) {
            expect(call[0].data).toMatchObject({ status: 'READY_FOR_AI', filterReason: null });
        }
    });

    // -------------------------------------------------------------------------
    // Test 3: AI_EMBEDDING — score >= threshold → READY_FOR_AI
    // -------------------------------------------------------------------------
    it('AI_EMBEDDING: score >= threshold → item advances to READY_FOR_AI', async () => {
        vi.mocked(prisma.item.findMany).mockResolvedValue([{ id: 1, title: 'Article One' }] as any);
        vi.mocked(prisma.filterProfile.findUnique).mockResolvedValue({
            brandId: 42,
            mode: 'AI_EMBEDDING',
            vectorProfile: [1, 0],
            similarityThreshold: 0.5,
        } as any);
        vi.mocked(runFilterEngine).mockResolvedValue({ allowed: true, score: 0.9, reason: 'above_threshold' });

        const result = await filterExtractedItemsForBrand(42);

        expect(result).toEqual({ passed: 1, rejected: 0 });
        expect(prisma.item.update).toHaveBeenCalledWith(
            expect.objectContaining({ data: { status: 'READY_FOR_AI', filterReason: null } }),
        );
    });

    // -------------------------------------------------------------------------
    // Test 4: AI_EMBEDDING — score < threshold → FILTERED_OUT with filterReason
    // -------------------------------------------------------------------------
    it('AI_EMBEDDING: score < threshold → item advances to FILTERED_OUT with filterReason', async () => {
        vi.mocked(prisma.item.findMany).mockResolvedValue([{ id: 1, title: 'Article One' }] as any);
        vi.mocked(prisma.filterProfile.findUnique).mockResolvedValue({
            brandId: 42,
            mode: 'AI_EMBEDDING',
            vectorProfile: [1, 0],
            similarityThreshold: 0.5,
        } as any);
        vi.mocked(runFilterEngine).mockResolvedValue({ allowed: false, score: 0.2, reason: 'below_threshold' });

        const result = await filterExtractedItemsForBrand(42);

        expect(result).toEqual({ passed: 0, rejected: 1 });
        expect(prisma.item.update).toHaveBeenCalledWith(
            expect.objectContaining({ data: { status: 'FILTERED_OUT', filterReason: 'below_threshold' } }),
        );
    });

    // -------------------------------------------------------------------------
    // Test 5: embedding_error → item advances to READY_FOR_AI (with warning log)
    // -------------------------------------------------------------------------
    it('embedding_error: item advances to READY_FOR_AI', async () => {
        vi.mocked(prisma.item.findMany).mockResolvedValue([{ id: 1, title: 'Article One' }] as any);
        vi.mocked(prisma.filterProfile.findUnique).mockResolvedValue({
            brandId: 42,
            mode: 'AI_EMBEDDING',
            vectorProfile: [1, 0],
            similarityThreshold: 0.5,
        } as any);
        vi.mocked(runFilterEngine).mockResolvedValue({ allowed: true, score: 0, reason: 'embedding_error' });

        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });

        const result = await filterExtractedItemsForBrand(42);

        expect(result).toEqual({ passed: 1, rejected: 0 });
        expect(prisma.item.update).toHaveBeenCalledWith(
            expect.objectContaining({ data: { status: 'READY_FOR_AI', filterReason: null } }),
        );
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('[Filter] Embedding error'));

        warnSpy.mockRestore();
    });
});
