import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';

/**
 * Feature: multi-tenant-filter-pipeline
 *
 * Property 1: Item Isolation Between Brands
 * Validates: Requirements 3.1, 3.2, 3.4
 *
 * Property 2: BrandSource Effective Interval
 * Validates: Requirements 2.3, 4.2
 */

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('../../../db/index.js', () => ({
    prisma: {
        brandSource: {
            findMany: vi.fn(),
            update: vi.fn(),
        },
        item: {
            create: vi.fn(),
        },
    },
}));

vi.mock('../../../lib/plugins/plugin-registry.js', () => ({
    getPlugin: vi.fn(),
}));

vi.mock('../../../lib/job-monitoring.js', () => ({
    logProcessingError: vi.fn(),
}));

vi.mock('../../../lib/logger.js', () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
    },
}));

import { prisma } from '../../../db/index.js';
import { getPlugin } from '../../../lib/plugins/plugin-registry.js';
import {
    getEffectiveInterval,
    saveBrandItems,
    ingestAllBrandSources,
} from '../../../domains/content-intelligence/ingest.service.js';

// ---------------------------------------------------------------------------
// Property 1: Item Isolation Between Brands
// ---------------------------------------------------------------------------

describe('IngestService — Property 1: Item Isolation Between Brands', () => {
    /**
     * Property 1: Item Isolation Between Brands
     * Validates: Requirements 3.1, 3.2, 3.4
     *
     * For any two distinct brands subscribing to the same Source, the IngestJob
     * SHALL create separate Item records with distinct brandId values, and
     * querying items for brand A SHALL never return items belonging to brand B.
     */

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('Property 1: items created for brand A and brand B are isolated — no cross-brand contamination', async () => {
        // Generators: two distinct brand IDs and a shared source ID
        const distinctBrandIdsArb = fc
            .tuple(
                fc.integer({ min: 1, max: 10_000 }),
                fc.integer({ min: 1, max: 10_000 }),
            )
            .filter(([a, b]) => a !== b);

        const sourceIdArb = fc.integer({ min: 1, max: 10_000 });

        const articleArb = fc.record({
            title: fc.string({ minLength: 1, maxLength: 100 }),
            link: fc.webUrl(),
            guid: fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
        });

        const articlesArb = fc.array(articleArb, { minLength: 1, maxLength: 5 });

        await fc.assert(
            fc.asyncProperty(
                distinctBrandIdsArb,
                sourceIdArb,
                articlesArb,
                async ([brandIdA, brandIdB], sourceId, articles) => {
                    // Track items created per brand
                    const createdItems: Array<{ brandId: number; sourceId: number; link: string }> = [];

                    vi.mocked(prisma.item.create).mockImplementation(async ({ data }: any) => {
                        createdItems.push({
                            brandId: data.brandId,
                            sourceId: data.sourceId,
                            link: data.link,
                        });
                        return data as any;
                    });

                    // Ingest same articles for brand A
                    const normalizedItems = articles.map((a) => ({
                        sourceId,
                        guid: a.guid ?? null,
                        title: a.title,
                        link: a.link,
                        snippet: null,
                        contentHash: `hash-${a.link}`,
                        publishedAt: null,
                    }));

                    await saveBrandItems(normalizedItems as any, brandIdA);
                    await saveBrandItems(normalizedItems as any, brandIdB);

                    // Items for brand A
                    const itemsForA = createdItems.filter((i) => i.brandId === brandIdA);
                    // Items for brand B
                    const itemsForB = createdItems.filter((i) => i.brandId === brandIdB);

                    // Requirement 3.1: each item has a brandId
                    for (const item of createdItems) {
                        expect(item.brandId).toBeDefined();
                        expect(typeof item.brandId).toBe('number');
                    }

                    // Requirement 3.2: separate Item records per brand
                    expect(itemsForA.length).toBe(articles.length);
                    expect(itemsForB.length).toBe(articles.length);

                    // Requirement 3.4: querying brand A never returns brand B items
                    const brandAIds = new Set(itemsForA.map((i) => i.brandId));
                    const brandBIds = new Set(itemsForB.map((i) => i.brandId));

                    expect(brandAIds.has(brandIdA)).toBe(true);
                    expect(brandAIds.has(brandIdB)).toBe(false);

                    expect(brandBIds.has(brandIdB)).toBe(true);
                    expect(brandBIds.has(brandIdA)).toBe(false);

                    // Reset for next iteration
                    createdItems.length = 0;
                    vi.clearAllMocks();
                },
            ),
            { numRuns: 50 },
        );
    });

    it('Property 1: ingestAllBrandSources creates items with correct brandId per brand-source', async () => {
        const brandIdA = 10;
        const brandIdB = 20;
        const sourceId = 99;

        const mockArticles = [
            { sourceId, guid: null, title: 'Article 1', link: 'https://example.com/1', snippet: null, contentHash: 'h1', publishedAt: null },
            { sourceId, guid: null, title: 'Article 2', link: 'https://example.com/2', snippet: null, contentHash: 'h2', publishedAt: null },
        ];

        const mockPlugin = {
            fetch: vi.fn().mockResolvedValue('<rss/>'),
            parse: vi.fn().mockResolvedValue(mockArticles),
            validateConfig: vi.fn().mockReturnValue(true),
        };
        vi.mocked(getPlugin).mockReturnValue(mockPlugin as any);

        const createdItems: Array<{ brandId: number; link: string }> = [];
        vi.mocked(prisma.item.create).mockImplementation(async ({ data }: any) => {
            createdItems.push({ brandId: data.brandId, link: data.link });
            return data as any;
        });
        vi.mocked(prisma.brandSource.update).mockResolvedValue({} as any);

        const sharedSource = {
            id: sourceId,
            name: 'Shared Source',
            type: 'RSS' as any,
            config: null,
            rssUrl: 'https://example.com/feed.xml',
            fetchIntervalMinutes: 60,
            lastFetchedAt: null,
        };

        vi.mocked(prisma.brandSource.findMany).mockResolvedValue([
            { id: 1, brandId: brandIdA, sourceId, fetchIntervalMinutes: null, enabled: true, lastFetchedAt: null, lastFetchStatus: null, createdAt: new Date(), updatedAt: new Date(), source: sharedSource } as any,
            { id: 2, brandId: brandIdB, sourceId, fetchIntervalMinutes: null, enabled: true, lastFetchedAt: null, lastFetchStatus: null, createdAt: new Date(), updatedAt: new Date(), source: sharedSource } as any,
        ]);

        await ingestAllBrandSources();

        // Both brands should have items
        const itemsForA = createdItems.filter((i) => i.brandId === brandIdA);
        const itemsForB = createdItems.filter((i) => i.brandId === brandIdB);

        expect(itemsForA.length).toBe(mockArticles.length);
        expect(itemsForB.length).toBe(mockArticles.length);

        // No cross-contamination
        expect(itemsForA.every((i) => i.brandId === brandIdA)).toBe(true);
        expect(itemsForB.every((i) => i.brandId === brandIdB)).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// Property 2: BrandSource Effective Interval
// ---------------------------------------------------------------------------

describe('IngestService — Property 2: BrandSource Effective Interval', () => {
    /**
     * Property 2: BrandSource Effective Interval
     * Validates: Requirements 2.3, 4.2
     *
     * For any BrandSource with nullable fetchIntervalMinutes and a Source with fetchIntervalMinutes:
     * - When BrandSource.fetchIntervalMinutes is non-null → effective interval = BrandSource.fetchIntervalMinutes
     * - When BrandSource.fetchIntervalMinutes is null → effective interval = Source.fetchIntervalMinutes
     */
    it('Property 2: non-null brandSourceInterval overrides sourceInterval', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: 0, max: 10_000 }),
                fc.integer({ min: 0, max: 10_000 }),
                (brandSourceInterval, sourceInterval) => {
                    const result = getEffectiveInterval(brandSourceInterval, sourceInterval);
                    expect(result).toBe(brandSourceInterval);
                },
            ),
            { numRuns: 100 },
        );
    });

    it('Property 2: null brandSourceInterval falls back to sourceInterval', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: 0, max: 10_000 }),
                (sourceInterval) => {
                    const result = getEffectiveInterval(null, sourceInterval);
                    expect(result).toBe(sourceInterval);
                },
            ),
            { numRuns: 100 },
        );
    });
});

// ---------------------------------------------------------------------------
// Unit tests for getEffectiveInterval
// ---------------------------------------------------------------------------

describe('IngestService — unit tests: getEffectiveInterval', () => {
    it('returns override when non-null', () => {
        expect(getEffectiveInterval(30, 60)).toBe(30);
    });

    it('returns source default when null', () => {
        expect(getEffectiveInterval(null, 60)).toBe(60);
    });

    it('returns 0 when both are 0', () => {
        expect(getEffectiveInterval(0, 0)).toBe(0);
    });
});
