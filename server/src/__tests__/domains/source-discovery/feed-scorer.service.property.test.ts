import { describe, it } from 'vitest';
import * as fc from 'fast-check';
import { shouldCreateFromScore } from '../../../domains/source-discovery/feed-scorer.service.js';

/**
 * Feature: ai-source-discovery
 *
 * Property 5: Lọc scoring không đạt ngưỡng chất lượng
 * Validates: Requirements 5.4, 5.5
 */

describe('feed-scorer.service — property tests', () => {
    /**
     * Property 5: Lọc scoring không đạt ngưỡng chất lượng
     * Validates: Requirements 5.4, 5.5
     *
     * For any scoring result with trustScore < 40 or isDuplicate = true,
     * shouldCreateFromScore() SHALL return false.
     */
    it('Property 5: shouldCreateFromScore — returns false when trustScore < 40 or isDuplicate is true', () => {
        fc.assert(
            fc.property(
                fc.oneof(
                    // Case 1: trustScore below threshold (any isDuplicate value)
                    fc.record({
                        trustScore: fc.integer({ min: 0, max: 39 }),
                        isDuplicate: fc.boolean(),
                    }),
                    // Case 2: isDuplicate is true (any trustScore value)
                    fc.record({
                        trustScore: fc.integer({ min: 0, max: 100 }),
                        isDuplicate: fc.constant(true),
                    })
                ),
                (scoring) => shouldCreateFromScore(scoring) === false
            ),
            { numRuns: 100 }
        );
    });
});
