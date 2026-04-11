import { describe, it } from 'vitest';
import * as fc from 'fast-check';
import {
    shouldCreatePendingSource,
    mapPendingToSource,
} from '../../../domains/source-discovery/pending-source.repository.js';
import type { PendingSource } from '@prisma/client';

/**
 * Feature: ai-source-discovery
 *
 * Property 6: Không tạo Pending_Source cho feedUrl đã được xử lý
 * Validates: Requirements 6.2, 9.3
 *
 * Property 7: Approve tạo Source với field mapping đúng và hỗ trợ override
 * Validates: Requirements 8.2, 8.5
 */

// Arbitrary for a minimal PendingSource object
const arbitraryPendingSource = (): fc.Arbitrary<PendingSource> =>
    fc.record({
        id: fc.integer({ min: 1 }),
        feedUrl: fc.webUrl(),
        siteUrl: fc.option(fc.webUrl(), { nil: null }),
        suggestedName: fc.option(fc.string({ minLength: 1, maxLength: 80 }), { nil: null }),
        trustScore: fc.integer({ min: 0, max: 100 }),
        topicTags: fc.array(fc.string({ minLength: 1, maxLength: 30 })),
        suggestedDenyKeywords: fc.array(fc.string({ minLength: 1, maxLength: 30 })),
        qualityReason: fc.option(fc.string(), { nil: null }),
        feedType: fc.option(fc.constantFrom('RSS', 'Atom'), { nil: null }),
        status: fc.constantFrom('PENDING', 'APPROVED', 'REJECTED') as fc.Arbitrary<PendingSource['status']>,
        rejectionReason: fc.option(fc.string(), { nil: null }),
        discoveredAt: fc.date(),
        sourceSearchQuery: fc.option(fc.string(), { nil: null }),
        promptTokens: fc.option(fc.integer({ min: 0 }), { nil: null }),
        completionTokens: fc.option(fc.integer({ min: 0 }), { nil: null }),
    });

describe('pending-source.repository — property tests', () => {
    /**
     * Property 6: Không tạo Pending_Source cho feedUrl đã được xử lý
     * Validates: Requirements 6.2, 9.3
     *
     * For any feedUrl that already exists with any status in {PENDING, APPROVED, REJECTED},
     * shouldCreatePendingSource() SHALL return false.
     */
    it('Property 6: shouldCreatePendingSource — returns false when feedUrl already exists with any status', () => {
        fc.assert(
            fc.property(
                fc.webUrl(),
                fc.constantFrom('PENDING', 'APPROVED', 'REJECTED'),
                (feedUrl, status) => {
                    const existing = [{ feedUrl, status }];
                    return shouldCreatePendingSource(feedUrl, existing) === false;
                }
            ),
            { numRuns: 100 }
        );
    });

    it('Property 6 (corollary): shouldCreatePendingSource — returns true when feedUrl is not in existing list', () => {
        fc.assert(
            fc.property(
                fc.webUrl(),
                fc.array(
                    fc.record({
                        feedUrl: fc.webUrl(),
                        status: fc.constantFrom('PENDING', 'APPROVED', 'REJECTED'),
                    })
                ),
                (feedUrl, existing) => {
                    // Ensure feedUrl is not in the existing list
                    const filteredExisting = existing.filter((e) => e.feedUrl !== feedUrl);
                    return shouldCreatePendingSource(feedUrl, filteredExisting) === true;
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Property 7: Approve tạo Source với field mapping đúng và hỗ trợ override
     * Validates: Requirements 8.2, 8.5
     *
     * For any PendingSource and any set of override values (possibly empty),
     * mapPendingToSource() SHALL produce a Source with:
     *   - rssUrl === feedUrl
     *   - enabled === false
     *   - each overridden field uses the override value instead of the AI value
     */
    it('Property 7: mapPendingToSource — rssUrl equals feedUrl and enabled is always false', () => {
        fc.assert(
            fc.property(
                arbitraryPendingSource(),
                fc.record({
                    name: fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
                    trustScore: fc.option(fc.integer({ min: 0, max: 100 }), { nil: undefined }),
                    topicTags: fc.option(fc.array(fc.string()), { nil: undefined }),
                    denyKeywords: fc.option(fc.array(fc.string()), { nil: undefined }),
                }),
                (pending, overrides) => {
                    const source = mapPendingToSource(pending, overrides);
                    return source.rssUrl === pending.feedUrl && source.enabled === false;
                }
            ),
            { numRuns: 100 }
        );
    });

    it('Property 7: mapPendingToSource — override values take priority over AI values', () => {
        fc.assert(
            fc.property(
                arbitraryPendingSource(),
                fc.record({
                    name: fc.string({ minLength: 1 }),
                    trustScore: fc.integer({ min: 0, max: 100 }),
                    topicTags: fc.array(fc.string()),
                    denyKeywords: fc.array(fc.string()),
                }),
                (pending, overrides) => {
                    const source = mapPendingToSource(pending, overrides);
                    return (
                        source.name === overrides.name &&
                        source.trustScore === overrides.trustScore &&
                        source.topicTags === overrides.topicTags &&
                        source.denyKeywords === overrides.denyKeywords
                    );
                }
            ),
            { numRuns: 100 }
        );
    });

    it('Property 7: mapPendingToSource — falls back to AI values when no overrides provided', () => {
        fc.assert(
            fc.property(
                arbitraryPendingSource(),
                (pending) => {
                    const source = mapPendingToSource(pending, {});
                    return (
                        source.trustScore === pending.trustScore &&
                        source.topicTags === pending.topicTags &&
                        source.denyKeywords === pending.suggestedDenyKeywords
                    );
                }
            ),
            { numRuns: 100 }
        );
    });
});
