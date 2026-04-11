import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';
import { buildVectorProfile, ValidationError } from '../../../domains/content-intelligence/vector-profile.builder.js';

/**
 * Feature: multi-tenant-filter-pipeline
 *
 * Property 6: VectorProfile Determinism
 * Validates: Requirements 3.1
 *
 * Property 7: VectorProfile Unit Normalization
 * Validates: Requirements 3.2
 */

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

/** At least one non-empty tag */
const topicTagsArb = fc.array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 10 });

/** Non-empty description string */
const descriptionArb = fc.string({ minLength: 1 });

/** Deterministic embedFn: maps each char code to a float, always same output for same input */
function deterministicEmbedFn(dim = 4): (text: string) => Promise<number[]> {
    return async (text: string) => {
        const vec = new Array(dim).fill(0);
        for (let i = 0; i < text.length; i++) {
            vec[i % dim] += text.charCodeAt(i) / 1000;
        }
        // Ensure non-zero
        vec[0] += 1;
        return vec;
    };
}

// ---------------------------------------------------------------------------
// Property 6: VectorProfile Determinism
// ---------------------------------------------------------------------------

describe('VectorProfile Builder — Property 6: VectorProfile Determinism', () => {
    /**
     * Property 6: VectorProfile Determinism
     * Validates: Requirements 3.1
     *
     * For any valid (topicTags, description) input with a deterministic embedFn,
     * calling buildVectorProfile twice SHALL return numerically identical vectors.
     */
    it('Property 6: same inputs always produce identical vectors', async () => {
        const embedFn = deterministicEmbedFn();

        await fc.assert(
            fc.asyncProperty(
                topicTagsArb,
                fc.option(descriptionArb, { nil: null }),
                async (topicTags, description) => {
                    const v1 = await buildVectorProfile(topicTags, description, embedFn);
                    const v2 = await buildVectorProfile(topicTags, description, embedFn);

                    expect(v1).toHaveLength(v2.length);
                    for (let i = 0; i < v1.length; i++) {
                        expect(v1[i]).toBe(v2[i]);
                    }
                },
            ),
            { numRuns: 100 },
        );
    });
});

// ---------------------------------------------------------------------------
// Property 7: VectorProfile Unit Normalization
// ---------------------------------------------------------------------------

describe('VectorProfile Builder — Property 7: VectorProfile Unit Normalization', () => {
    /**
     * Property 7: VectorProfile Unit Normalization
     * Validates: Requirements 3.2
     *
     * For any valid (topicTags, description) input, the resulting vector
     * SHALL have L2 norm ≈ 1.0 (within tolerance 1e-10).
     */
    it('Property 7: resulting vector has L2 norm ≈ 1.0', async () => {
        await fc.assert(
            fc.asyncProperty(
                topicTagsArb,
                fc.option(descriptionArb, { nil: null }),
                async (topicTags, description) => {
                    // Random-ish but deterministic embedFn based on input length
                    const embedFn = async (text: string): Promise<number[]> => {
                        const seed = text.length + 1;
                        return [seed * 0.3, seed * 0.7, seed * 1.1, seed * 0.5];
                    };

                    const vector = await buildVectorProfile(topicTags, description, embedFn);

                    const norm = Math.sqrt(vector.reduce((sum, x) => sum + x * x, 0));
                    expect(Math.abs(norm - 1.0)).toBeLessThan(1e-10);
                },
            ),
            { numRuns: 100 },
        );
    });
});

// ---------------------------------------------------------------------------
// Task 3.4 — Unit tests for VectorProfile Builder
// ---------------------------------------------------------------------------

describe('VectorProfile Builder — unit tests', () => {
    it('weighted average 0.6*tags + 0.4*desc is applied before normalization when description is provided', async () => {
        const tagsVec = [3, 0, 0, 0];
        const descVec = [0, 4, 0, 0];
        const embedFn = vi.fn()
            .mockResolvedValueOnce(tagsVec)
            .mockResolvedValueOnce(descVec);

        const result = await buildVectorProfile(['ai'], 'some description', embedFn);

        // combined = [0.6*3, 0.4*4, 0, 0] = [1.8, 1.6, 0, 0]
        // norm = sqrt(1.8^2 + 1.6^2) = sqrt(3.24 + 2.56) = sqrt(5.8)
        const norm = Math.sqrt(1.8 * 1.8 + 1.6 * 1.6);
        expect(result[0]).toBeCloseTo(1.8 / norm, 10);
        expect(result[1]).toBeCloseTo(1.6 / norm, 10);
        expect(result[2]).toBeCloseTo(0, 10);
        expect(result[3]).toBeCloseTo(0, 10);
    });

    it('tags-only path is used when description is null', async () => {
        const tagsVec = [3, 4, 0, 0];
        const embedFn = vi.fn().mockResolvedValueOnce(tagsVec);

        const result = await buildVectorProfile(['ai', 'ml'], null, embedFn);

        expect(embedFn).toHaveBeenCalledTimes(1);
        // norm = sqrt(9+16) = 5
        expect(result[0]).toBeCloseTo(3 / 5, 10);
        expect(result[1]).toBeCloseTo(4 / 5, 10);
    });

    it('tags-only path is used when description is empty string', async () => {
        const tagsVec = [0, 3, 4, 0];
        const embedFn = vi.fn().mockResolvedValueOnce(tagsVec);

        const result = await buildVectorProfile(['tech'], '', embedFn);

        expect(embedFn).toHaveBeenCalledTimes(1);
        // norm = sqrt(9+16) = 5
        expect(result[1]).toBeCloseTo(3 / 5, 10);
        expect(result[2]).toBeCloseTo(4 / 5, 10);
    });

    it('throws ValidationError when topicTags is empty and description is null', async () => {
        const embedFn = vi.fn();
        await expect(buildVectorProfile([], null, embedFn)).rejects.toBeInstanceOf(ValidationError);
        expect(embedFn).not.toHaveBeenCalled();
    });

    it('throws ValidationError when topicTags is empty and description is empty string', async () => {
        const embedFn = vi.fn();
        await expect(buildVectorProfile([], '', embedFn)).rejects.toBeInstanceOf(ValidationError);
        expect(embedFn).not.toHaveBeenCalled();
    });
});
