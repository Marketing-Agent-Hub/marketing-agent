import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';
import { runFilterEngine } from '../../../domains/content-intelligence/filter-engine.js';
import type { ArticleInput, FilterProfileInput } from '../../../domains/content-intelligence/filter-engine.js';

/**
 * Feature: multi-tenant-filter-pipeline
 *
 * Property 3: FilterEngine PASS_THROUGH Identity
 * Validates: Requirements 6.5
 *
 * Property 4: FilterEngine Threshold Monotonicity
 * Validates: Requirements 6.7, 6.8
 *
 * Property 8: FilterEngine Uses Stored VectorProfile
 * Validates: Requirements 12.5
 */

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

const articleArb = fc.record<ArticleInput>({
    title: fc.string(),
    extractedContent: fc.string(),
});

// ---------------------------------------------------------------------------
// Property 3: FilterEngine PASS_THROUGH Identity
// ---------------------------------------------------------------------------

describe('FilterEngine — Property 3: FilterEngine PASS_THROUGH Identity', () => {
    /**
     * Property 3: FilterEngine PASS_THROUGH Identity
     * Validates: Requirements 6.5
     *
     * For any article content, PASS_THROUGH mode must return
     * { allowed: true, score: 1.0, reason: 'pass_through' } and embedFn must NOT be called.
     */
    it('Property 3: PASS_THROUGH always returns allowed:true, score:1.0, reason:pass_through and never calls embedFn', async () => {
        await fc.assert(
            fc.asyncProperty(articleArb, async (article) => {
                const embedFn = vi.fn().mockResolvedValue([1, 0]);
                const filterProfile: FilterProfileInput = {
                    mode: 'PASS_THROUGH',
                    vectorProfile: null,
                    similarityThreshold: 0.5,
                };

                const result = await runFilterEngine(article, filterProfile, embedFn);

                expect(result).toEqual({ allowed: true, score: 1.0, reason: 'pass_through' });
                expect(embedFn).not.toHaveBeenCalled();
            }),
            { numRuns: 100 },
        );
    });
});

// ---------------------------------------------------------------------------
// Property 4: FilterEngine Threshold Monotonicity
// ---------------------------------------------------------------------------

describe('FilterEngine — Property 4: FilterEngine Threshold Monotonicity', () => {
    /**
     * Property 4: FilterEngine Threshold Monotonicity
     * Validates: Requirements 6.7, 6.8
     *
     * Using two identical unit vectors (cosine similarity = 1.0), vary threshold in [0,1].
     * allowed must equal (1.0 >= threshold).
     */
    it('Property 4: allowed = (score >= threshold) for all thresholds in [0,1]', async () => {
        // Unit vector — cosine similarity with itself is exactly 1.0
        const unitVector = [1, 0];

        await fc.assert(
            fc.asyncProperty(
                fc.float({ min: 0, max: 1, noNaN: true }),
                articleArb,
                async (threshold, article) => {
                    const embedFn = vi.fn().mockResolvedValue(unitVector);
                    const filterProfile: FilterProfileInput = {
                        mode: 'AI_EMBEDDING',
                        vectorProfile: unitVector,
                        similarityThreshold: threshold,
                    };

                    const result = await runFilterEngine(article, filterProfile, embedFn);

                    // cosine([1,0],[1,0]) = 1.0, so allowed = (1.0 >= threshold)
                    expect(result.allowed).toBe(1.0 >= threshold);
                },
            ),
            { numRuns: 100 },
        );
    });
});

// ---------------------------------------------------------------------------
// Property 8: FilterEngine Uses Stored VectorProfile
// ---------------------------------------------------------------------------

describe('FilterEngine — Property 8: FilterEngine Uses Stored VectorProfile', () => {
    /**
     * Property 8: FilterEngine Uses Stored VectorProfile
     * Validates: Requirements 12.5
     *
     * For a batch of N articles, embedFn is called exactly N times —
     * once per article, never to recompute the brand vector.
     */
    it('Property 8: embedFn is called exactly N times for N articles', async () => {
        const articlesArb = fc.array(articleArb, { minLength: 1, maxLength: 10 });

        await fc.assert(
            fc.asyncProperty(articlesArb, async (articles) => {
                const unitVector = [1, 0];
                const embedFn = vi.fn().mockResolvedValue(unitVector);
                const filterProfile: FilterProfileInput = {
                    mode: 'AI_EMBEDDING',
                    vectorProfile: unitVector,
                    similarityThreshold: 0.5,
                };

                for (const article of articles) {
                    await runFilterEngine(article, filterProfile, embedFn);
                }

                expect(embedFn).toHaveBeenCalledTimes(articles.length);
            }),
            { numRuns: 100 },
        );
    });
});

// ---------------------------------------------------------------------------
// Task 2.7 — Unit tests for FilterEngine
// ---------------------------------------------------------------------------

describe('FilterEngine — unit tests', () => {
    it('PASS_THROUGH: embedFn is never called', async () => {
        const embedFn = vi.fn();
        const result = await runFilterEngine(
            { title: 'Hello', extractedContent: 'World' },
            { mode: 'PASS_THROUGH', vectorProfile: null, similarityThreshold: 0.5 },
            embedFn,
        );
        expect(result).toEqual({ allowed: true, score: 1.0, reason: 'pass_through' });
        expect(embedFn).not.toHaveBeenCalled();
    });

    it('AI_EMBEDDING: score above threshold → allowed: true', async () => {
        const unitVector = [1, 0];
        const embedFn = vi.fn().mockResolvedValue(unitVector);
        const result = await runFilterEngine(
            { title: 'Test', extractedContent: 'Content' },
            { mode: 'AI_EMBEDDING', vectorProfile: unitVector, similarityThreshold: 0.5 },
            embedFn,
        );
        expect(result.allowed).toBe(true);
        expect(result.score).toBeCloseTo(1.0, 10);
        expect(result.reason).toBe('above_threshold');
    });

    it('AI_EMBEDDING: score below threshold → allowed: false', async () => {
        // article vector [1,0], brand vector [0,1] → cosine = 0.0
        const embedFn = vi.fn().mockResolvedValue([1, 0]);
        const result = await runFilterEngine(
            { title: 'Test', extractedContent: 'Content' },
            { mode: 'AI_EMBEDDING', vectorProfile: [0, 1], similarityThreshold: 0.5 },
            embedFn,
        );
        expect(result.allowed).toBe(false);
        expect(result.score).toBeCloseTo(0.0, 10);
        expect(result.reason).toBe('below_threshold');
    });

    it('null vectorProfile → allowed: true, reason: no_vector_profile', async () => {
        const embedFn = vi.fn();
        const result = await runFilterEngine(
            { title: 'Test', extractedContent: 'Content' },
            { mode: 'AI_EMBEDDING', vectorProfile: null, similarityThreshold: 0.5 },
            embedFn,
        );
        expect(result).toEqual({ allowed: true, score: 0, reason: 'no_vector_profile' });
        expect(embedFn).not.toHaveBeenCalled();
    });

    it('embedFn throws → allowed: true, reason: embedding_error', async () => {
        const embedFn = vi.fn().mockRejectedValue(new Error('API failure'));
        const result = await runFilterEngine(
            { title: 'Test', extractedContent: 'Content' },
            { mode: 'AI_EMBEDDING', vectorProfile: [1, 0], similarityThreshold: 0.5 },
            embedFn,
        );
        expect(result).toEqual({ allowed: true, score: 0, reason: 'embedding_error' });
    });
});
