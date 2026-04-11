import { describe, it } from 'vitest';
import * as fc from 'fast-check';
import { deduplicateUrls, filterExistingUrls } from '../../../domains/source-discovery/search.service.js';

/**
 * Feature: ai-source-discovery
 *
 * Property 1: Deduplication URL tổng hợp
 * Validates: Requirements 2.5
 *
 * Property 2: Lọc URL đã tồn tại
 * Validates: Requirements 2.6
 */

describe('search.service — property tests', () => {
    /**
     * Property 1: Deduplication URL tổng hợp
     * Validates: Requirements 2.5
     *
     * For any array of URLs (possibly containing duplicates), deduplicateUrls()
     * SHALL return a list where no URL appears more than once.
     */
    it('Property 1: deduplicateUrls — result contains no duplicate URLs', () => {
        fc.assert(
            fc.property(fc.array(fc.webUrl()), (urls) => {
                const result = deduplicateUrls(urls);
                return new Set(result).size === result.length;
            }),
            { numRuns: 100 }
        );
    });

    /**
     * Property 2: Lọc URL đã tồn tại
     * Validates: Requirements 2.6
     *
     * For any list of URLs and set of existing URLs, filterExistingUrls()
     * SHALL return a list that contains no URL belonging to the existing set.
     */
    it('Property 2: filterExistingUrls — result contains no URL from existing set', () => {
        fc.assert(
            fc.property(fc.array(fc.webUrl()), fc.array(fc.webUrl()), (urls, existing) => {
                const existingSet = new Set(existing);
                const result = filterExistingUrls(urls, existingSet);
                return result.every((url) => !existingSet.has(url));
            }),
            { numRuns: 100 }
        );
    });
});
