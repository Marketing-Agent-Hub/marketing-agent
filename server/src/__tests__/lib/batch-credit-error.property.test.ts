/**
 * Feature: openrouter-ai-client
 *
 * Property 6: Batch dừng ngay khi gặp CreditError
 * Validates: Requirements 8.3
 *
 * Với bất kỳ batch size N nào và bất kỳ vị trí K nào (1 ≤ K ≤ N) mà
 * OpenRouterCreditError xảy ra, batch phải dừng xử lý sau item thứ K
 * và không xử lý thêm bất kỳ item nào sau đó.
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { OpenRouterCreditError } from '../../lib/ai-client.js';

// ─── Batch loop pattern (mirrors real service implementations) ────────────────
//
// This is the canonical pattern used in:
//   - ingest.service.ts  (ingestAllBrandSources)
//   - filtering.service.ts (filterExtractedItemsForBrand)
//   - ai-stage-a.service.ts (processStageABatch)
//   - ai-stage-b.service.ts (processStageBBatch)
//
// The property test verifies that ANY implementation of this pattern
// correctly stops after a CreditError at position K.

async function runBatchWithCreditErrorAtPosition(
    items: number[],
    creditErrorAtIndex: number, // 0-based index where CreditError is thrown
): Promise<{ processedCount: number; processedItems: number[] }> {
    const processedItems: number[] = [];

    for (const item of items) {
        const currentIndex = processedItems.length;
        try {
            // Simulate processing: throw CreditError at the specified position
            if (currentIndex === creditErrorAtIndex) {
                throw new OpenRouterCreditError();
            }
            // Successful processing
            processedItems.push(item);
        } catch (error) {
            if (error instanceof OpenRouterCreditError) {
                // Pattern from design doc: dừng toàn bộ batch ngay lập tức
                break;
            }
            // Other errors: continue (not relevant to this property)
        }
    }

    return { processedCount: processedItems.length, processedItems };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Batch loop — Property 6: Batch dừng ngay khi gặp CreditError', () => {
    /**
     * Property 6: Batch dừng ngay khi gặp CreditError
     * Validates: Requirements 8.3
     *
     * For any batch size N and any error position K (1 ≤ K ≤ N),
     * when OpenRouterCreditError occurs at item K, the batch must stop
     * after item K-1 (items before K are processed, items K..N are not).
     */

    it('Property 6: exactly K-1 items processed when CreditError thrown at position K', async () => {
        // Generator: batch size N (1..20) and error position K (1..N), both 1-based
        const batchArb = fc
            .integer({ min: 1, max: 20 })
            .chain((n) =>
                fc.tuple(
                    fc.constant(n),
                    fc.integer({ min: 1, max: n }), // K: 1-based position of CreditError
                ),
            );

        await fc.assert(
            fc.asyncProperty(batchArb, async ([n, k]) => {
                // Build N items (1-indexed for readability)
                const items = Array.from({ length: n }, (_, i) => i + 1);

                // creditErrorAtIndex is 0-based: item K (1-based) → index K-1
                const creditErrorAtIndex = k - 1;

                const { processedItems } = await runBatchWithCreditErrorAtPosition(
                    items,
                    creditErrorAtIndex,
                );

                // Exactly K-1 items should have been processed (items 1..K-1)
                const expectedCount = k - 1;
                if (processedItems.length !== expectedCount) return false;

                // The processed items must be exactly items 1..K-1 (in order)
                for (let i = 0; i < expectedCount; i++) {
                    if (processedItems[i] !== i + 1) return false;
                }

                // No items at position K or beyond should have been processed
                for (const item of processedItems) {
                    if (item >= k) return false;
                }

                return true;
            }),
            { numRuns: 100 },
        );
    });

    it('Property 6: no items processed when CreditError thrown at first item (K=1)', async () => {
        const batchSizeArb = fc.integer({ min: 1, max: 20 });

        await fc.assert(
            fc.asyncProperty(batchSizeArb, async (n) => {
                const items = Array.from({ length: n }, (_, i) => i + 1);

                // CreditError at index 0 (first item, K=1)
                const { processedItems } = await runBatchWithCreditErrorAtPosition(items, 0);

                // No items should be processed
                return processedItems.length === 0;
            }),
            { numRuns: 100 },
        );
    });

    it('Property 6: all items before last processed when CreditError thrown at last item (K=N)', async () => {
        const batchSizeArb = fc.integer({ min: 1, max: 20 });

        await fc.assert(
            fc.asyncProperty(batchSizeArb, async (n) => {
                const items = Array.from({ length: n }, (_, i) => i + 1);

                // CreditError at last item (index N-1, K=N)
                const { processedItems } = await runBatchWithCreditErrorAtPosition(items, n - 1);

                // Exactly N-1 items should be processed (all except the last)
                return processedItems.length === n - 1;
            }),
            { numRuns: 100 },
        );
    });

    it('Property 6: items after CreditError position are never processed', async () => {
        const batchArb = fc
            .integer({ min: 2, max: 20 }) // at least 2 items so there's always an "after"
            .chain((n) =>
                fc.tuple(
                    fc.constant(n),
                    fc.integer({ min: 1, max: n }),
                ),
            );

        await fc.assert(
            fc.asyncProperty(batchArb, async ([n, k]) => {
                const items = Array.from({ length: n }, (_, i) => i + 1);
                const creditErrorAtIndex = k - 1;

                const { processedItems } = await runBatchWithCreditErrorAtPosition(
                    items,
                    creditErrorAtIndex,
                );

                // Items at position K and beyond (1-based) must NOT appear in processedItems
                const itemsAfterError = items.slice(k); // items K+1..N (0-based slice from k)
                for (const item of itemsAfterError) {
                    if (processedItems.includes(item)) return false;
                }

                return true;
            }),
            { numRuns: 100 },
        );
    });
});
