import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { cosineSimilarity } from '../../lib/cosine-similarity.js';

/**
 * Feature: multi-tenant-filter-pipeline
 *
 * Property 5: Cosine Self-Similarity
 * Validates: Requirements 12.2
 */

describe('cosine-similarity — property tests', () => {
    /**
     * Property 5: Cosine Self-Similarity
     * Validates: Requirements 12.2
     *
     * For any non-zero vector v, cosineSimilarity(v, v) === 1.0 (within floating-point tolerance 1e-10)
     */
    it('Property 5: Cosine Self-Similarity — cosineSimilarity(v, v) ≈ 1.0 for any non-zero vector', () => {
        // Generator: non-zero vectors (at least one element is non-zero)
        const nonZeroVector = fc
            .array(fc.float({ min: -1e6, max: 1e6, noNaN: true }), { minLength: 1, maxLength: 50 })
            .filter((v) => v.some((x) => x !== 0));

        fc.assert(
            fc.property(nonZeroVector, (v) => {
                const result = cosineSimilarity(v, v);
                return Math.abs(result - 1.0) < 1e-10;
            }),
            { numRuns: 100 }
        );
    });

    it('orthogonal vectors return 0.0', () => {
        // [1, 0] and [0, 1] are orthogonal
        expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0.0, 10);
        expect(cosineSimilarity([1, 0, 0], [0, 1, 0])).toBeCloseTo(0.0, 10);
        expect(cosineSimilarity([0, 0, 1], [0, 1, 0])).toBeCloseTo(0.0, 10);
    });

    it('throws on vectors with different dimensions', () => {
        expect(() => cosineSimilarity([1, 2], [1, 2, 3])).toThrow('Vectors must have the same dimension');
    });

    it('throws on zero vector', () => {
        expect(() => cosineSimilarity([0, 0, 0], [1, 2, 3])).toThrow('Zero vector has no direction');
        expect(() => cosineSimilarity([1, 2, 3], [0, 0, 0])).toThrow('Zero vector has no direction');
    });
});
