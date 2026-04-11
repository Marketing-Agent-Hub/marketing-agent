import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateFeed } from '../../../domains/source-discovery/feed-validator.service.js';

// Helper to build a minimal RSS XML with items at given dates
function buildRssXml(title: string, items: { pubDate: string }[]): string {
    const itemsXml = items
        .map((i) => `<item><title>Article</title><pubDate>${i.pubDate}</pubDate></item>`)
        .join('\n');
    return `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <title>${title}</title>
    ${itemsXml}
  </channel>
</rss>`;
}

// Helper to build a minimal Atom XML with entries at given dates
function buildAtomXml(title: string, entries: { updated: string }[]): string {
    const entriesXml = entries
        .map((e) => `<entry><title>Article</title><updated>${e.updated}</updated></entry>`)
        .join('\n');
    return `<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${title}</title>
  ${entriesXml}
</feed>`;
}

function mockFetchWith(body: string, contentType = 'application/xml', status = 200) {
    vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
            ok: status >= 200 && status < 300,
            status,
            statusText: status === 200 ? 'OK' : 'Error',
            headers: { get: () => contentType },
            text: () => Promise.resolve(body),
        })
    );
}

function mockFetchNetworkError() {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));
}

function mockFetchTimeout() {
    vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation((_url: string, opts: { signal?: AbortSignal }) => {
            return new Promise((_resolve, reject) => {
                if (opts?.signal) {
                    opts.signal.addEventListener('abort', () => {
                        const err = new Error('The operation was aborted');
                        err.name = 'AbortError';
                        reject(err);
                    });
                }
            });
        })
    );
}

beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T12:00:00Z'));
});

afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
});

describe('validateFeed', () => {
    describe('INVALID_UNREACHABLE', () => {
        it('returns INVALID_UNREACHABLE when fetch throws a network error', async () => {
            mockFetchNetworkError();
            const result = await validateFeed('https://example.com/feed');
            expect(result).toEqual({ valid: false, reason: 'INVALID_UNREACHABLE' });
        });

        it('returns INVALID_UNREACHABLE when HTTP response is not OK (404)', async () => {
            mockFetchWith('Not Found', 'text/html', 404);
            const result = await validateFeed('https://example.com/feed');
            expect(result).toEqual({ valid: false, reason: 'INVALID_UNREACHABLE' });
        });

        it('returns INVALID_UNREACHABLE when request times out (AbortError)', async () => {
            mockFetchTimeout();
            // Advance timers past the 10s timeout
            const promise = validateFeed('https://example.com/feed');
            vi.advanceTimersByTime(11_000);
            const result = await promise;
            expect(result).toEqual({ valid: false, reason: 'INVALID_UNREACHABLE' });
        });
    });

    describe('INVALID_XML', () => {
        it('returns INVALID_XML when response body is not valid XML', async () => {
            mockFetchWith('this is not xml at all!!!', 'application/xml');
            const result = await validateFeed('https://example.com/feed');
            expect(result).toEqual({ valid: false, reason: 'INVALID_XML' });
        });

        it('returns INVALID_XML when XML does not contain RSS or Atom structure', async () => {
            mockFetchWith('<root><data>hello</data></root>', 'application/xml');
            const result = await validateFeed('https://example.com/feed');
            expect(result).toEqual({ valid: false, reason: 'INVALID_XML' });
        });
    });

    describe('INVALID_STALE', () => {
        it('returns INVALID_STALE when all RSS items are older than 7 days', async () => {
            // Current time: 2024-06-15, items from 2024-06-01 (14 days ago)
            const xml = buildRssXml('Old Blog', [
                { pubDate: 'Sat, 01 Jun 2024 10:00:00 GMT' },
                { pubDate: 'Mon, 27 May 2024 10:00:00 GMT' },
            ]);
            mockFetchWith(xml);
            const result = await validateFeed('https://example.com/feed');
            expect(result).toEqual({ valid: false, reason: 'INVALID_STALE' });
        });

        it('returns INVALID_STALE when RSS feed has no items', async () => {
            const xml = buildRssXml('Empty Blog', []);
            mockFetchWith(xml);
            const result = await validateFeed('https://example.com/feed');
            expect(result).toEqual({ valid: false, reason: 'INVALID_STALE' });
        });

        it('returns INVALID_STALE when Atom feed entries are all older than 7 days', async () => {
            const xml = buildAtomXml('Old Atom Feed', [
                { updated: '2024-06-01T10:00:00Z' },
            ]);
            mockFetchWith(xml);
            const result = await validateFeed('https://example.com/feed');
            expect(result).toEqual({ valid: false, reason: 'INVALID_STALE' });
        });
    });

    describe('valid feed', () => {
        it('returns valid=true with metadata for a fresh RSS feed', async () => {
            // Current time: 2024-06-15, item from 2024-06-13 (2 days ago)
            const xml = buildRssXml('Fresh Blog', [
                { pubDate: 'Thu, 13 Jun 2024 10:00:00 GMT' },
                { pubDate: 'Mon, 10 Jun 2024 10:00:00 GMT' },
            ]);
            mockFetchWith(xml);
            const result = await validateFeed('https://example.com/feed');

            expect(result.valid).toBe(true);
            expect(result.reason).toBeUndefined();
            expect(result.metadata).toBeDefined();
            expect(result.metadata!.feedType).toBe('RSS');
            expect(result.metadata!.title).toBe('Fresh Blog');
            expect(result.metadata!.itemsCount).toBe(2);
            expect(result.metadata!.latestItemDate).toEqual(new Date('Thu, 13 Jun 2024 10:00:00 GMT'));
        });

        it('returns valid=true with metadata for a fresh Atom feed', async () => {
            // Current time: 2024-06-15, entry from 2024-06-14 (1 day ago)
            const xml = buildAtomXml('Fresh Atom', [
                { updated: '2024-06-14T08:00:00Z' },
            ]);
            mockFetchWith(xml);
            const result = await validateFeed('https://example.com/feed');

            expect(result.valid).toBe(true);
            expect(result.metadata).toBeDefined();
            expect(result.metadata!.feedType).toBe('Atom');
            expect(result.metadata!.title).toBe('Fresh Atom');
            expect(result.metadata!.itemsCount).toBe(1);
            expect(result.metadata!.latestItemDate).toEqual(new Date('2024-06-14T08:00:00Z'));
        });

        it('returns valid=true when at least one item is within 7 days even if others are older', async () => {
            const xml = buildRssXml('Mixed Blog', [
                { pubDate: 'Thu, 13 Jun 2024 10:00:00 GMT' }, // 2 days ago — fresh
                { pubDate: 'Mon, 01 Jan 2024 10:00:00 GMT' }, // very old
            ]);
            mockFetchWith(xml);
            const result = await validateFeed('https://example.com/feed');
            expect(result.valid).toBe(true);
        });
    });
});
