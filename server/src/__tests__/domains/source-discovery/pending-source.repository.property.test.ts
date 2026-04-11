import { describe, it } from 'vitest';
import * as fc from 'fast-check';
import type { PendingSource } from '@prisma/client';
import {
    shouldCreatePendingSource,
    mapPendingToSource,
    paginateSources,
    filterByStatus,
    sortByTrustScore,
} from '../../../domains/source-discovery/pending-source.repository.js';

/**
 * Feature: ai-source-discovery
 *
 * Property 6: Không tạo Pending_Source cho feedUrl đã được xử lý
 * Validates: Requirements 6.2, 9.3
 *
 * Property 7: Approve tạo Source với field mapping đúng và hỗ trợ override
 * Validates: Requirements 8.2, 8.5
 *
 * Property 8: Pagination correctness
 * Validates: Requirements 7.2
 *
 * Property 9: Status filter correctness
 * Validates: Requirements 7.3
 *
 * Property 10: Sort by trustScore descending
 * Validates: Requirements 7.4
 */

// ============ Arbitraries ============

const arbitraryStatus = fc.constantFrom('PENDING', 'APPROVED', 'REJECTED');

const arbitraryPendingSource = (): fc.Arbitrary<PendingSource> =>
    fc.record({
        id: fc.integer({ min: 1 }),
        feedUrl: fc.webUrl(),
        siteUrl: fc.option(fc.webUrl(), { nil: null }),
        suggestedName: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: null }),
        trustScore: fc.integer({ min: 0, max: 100 }),
        topicTags: fc.array(fc.string({ minLength: 1, maxLength: 20 })),
        suggestedDenyKeywords: fc.array(fc.string({ minLength: 1, maxLength: 20 })),
        qualityReason: fc.option(fc.string(), { nil: null }),
        feedType: fc.option(fc.constantFrom('RSS', 'Atom'), { nil: null }),
        status: arbitraryStatus as fc.Arbitrary<'PENDING' | 'APPROVED' | 'REJECTED'>,
        rejectionReason: fc.option(fc.string(), { nil: null }),
        discoveredAt: fc.date(),
        sourceSearchQuery: fc.option(fc.string(), { nil: null }),
        promptTokens: fc.option(fc.integer({ min: 0 }), { nil: null }),
        completionTokens: fc.option(fc.integer({ min: 0 }), { nil: null }),
    });

// ============ Tests ============

describe('pending-source.repository — property tests', () => {
    /**
     * Property 6: Không tạo Pending_Source cho feedUrl đã được xử lý
     * Validates: Requirements 6.2, 9.3
     *
     * For any feedUrl that already exists with any status in {PENDING, APPROVED, REJECTED},
     * shouldCreatePendingSource() SHALL return false.
     */
    it('Property 6: shouldCreatePendingSource — returns false when feedUrl exists with any status', () => {
        fc.assert(
            fc.property(
                fc.webUrl(),
                arbitraryStatus,
                (feedUrl, status) => {
                    const existing = [{ feedUrl, status }];
                    return shouldCreatePendingSource(feedUrl, existing) === false;
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Property 7: Approve tạo Source với field mapping đúng và hỗ trợ override
     * Validates: Requirements 8.2, 8.5
     *
     * For any PendingSource and any set of override values,
     * mapPendingToSource() SHALL create a Source with rssUrl = feedUrl,
     * enabled = false, and override values take priority.
     */
    it('Property 7: mapPendingToSource — rssUrl = feedUrl, enabled = false, overrides take priority', () => {
        fc.assert(
            fc.property(
                arbitraryPendingSource(),
                fc.record({
                    name: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
                    trustScore: fc.option(fc.integer({ min: 0, max: 100 }), { nil: undefined }),
                    topicTags: fc.option(fc.array(fc.string({ minLength: 1 })), { nil: undefined }),
                    denyKeywords: fc.option(fc.array(fc.string({ minLength: 1 })), { nil: undefined }),
                }),
                (pending, overrides) => {
                    const source = mapPendingToSource(pending, overrides);

                    // rssUrl must equal feedUrl
                    if (source.rssUrl !== pending.feedUrl) return false;

                    // enabled must be false
                    if (source.enabled !== false) return false;

                    // trustScore override takes priority
                    const expectedTrustScore =
                        overrides.trustScore !== undefined
                            ? overrides.trustScore
                            : pending.trustScore;
                    if (source.trustScore !== expectedTrustScore) return false;

                    // name override takes priority
                    const expectedName =
                        overrides.name !== undefined
                            ? overrides.name
                            : (pending.suggestedName ?? pending.feedUrl);
                    if (source.name !== expectedName) return false;

                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Property 8: Pagination correctness
     * Validates: Requirements 7.2
     *
     * For any list of sources and any valid (page, limit) pair,
     * the result SHALL contain the correct number of items starting from offset (page-1)*limit.
     */
    it('Property 8: paginateSources — returns correct slice size and total', () => {
        fc.assert(
            fc.property(
                fc.array(arbitraryPendingSource(), { minLength: 0, maxLength: 100 }),
                fc.integer({ min: 1, max: 10 }),
                fc.integer({ min: 1, max: 20 }),
                (sources, page, limit) => {
                    const result = paginateSources(sources, page, limit);
                    const offset = (page - 1) * limit;
                    const expectedCount = Math.max(0, Math.min(limit, sources.length - offset));

                    return result.data.length === expectedCount && result.total === sources.length;
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Property 9: Status filter correctness
     * Validates: Requirements 7.3
     *
     * For any list of sources and any status filter,
     * all items in the result SHALL have exactly the filtered status.
     */
    it('Property 9: filterByStatus — all returned items have the correct status', () => {
        fc.assert(
            fc.property(
                fc.array(arbitraryPendingSource()),
                arbitraryStatus,
                (sources, statusFilter) => {
                    const result = filterByStatus(sources, statusFilter);
                    return result.every((s) => s.status === statusFilter);
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Property 10: Sort by trustScore descending
     * Validates: Requirements 7.4
     *
     * For any list of sources, sortByTrustScore() SHALL return a list where
     * result[i].trustScore >= result[i+1].trustScore for all i.
     */
    it('Property 10: sortByTrustScore — result is sorted descending by trustScore', () => {
        fc.assert(
            fc.property(
                fc.array(arbitraryPendingSource(), { minLength: 0, maxLength: 50 }),
                (sources) => {
                    const result = sortByTrustScore(sources);

                    // Must not mutate original
                    // (we can't check reference equality easily, but we verify sort correctness)
                    for (let i = 0; i < result.length - 1; i++) {
                        if (result[i].trustScore < result[i + 1].trustScore) return false;
                    }
                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Additional: sortByTrustScore does not mutate the original array
     */
    it('Property 10 (non-mutation): sortByTrustScore — does not mutate the original array', () => {
        fc.assert(
            fc.property(
                fc.array(arbitraryPendingSource(), { minLength: 1, maxLength: 20 }),
                (sources) => {
                    const originalOrder = sources.map((s) => s.trustScore);
                    sortByTrustScore(sources);
                    const afterOrder = sources.map((s) => s.trustScore);
                    return originalOrder.every((v, i) => v === afterOrder[i]);
                }
            ),
            { numRuns: 100 }
        );
    });
});
