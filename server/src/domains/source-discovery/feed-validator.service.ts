import { XMLParser } from 'fast-xml-parser';
import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';

export interface FeedValidationResult {
    valid: boolean;
    reason?: 'INVALID_UNREACHABLE' | 'INVALID_XML' | 'INVALID_STALE';
    metadata?: {
        title: string;
        itemsCount: number;
        latestItemDate: Date;
        feedType: 'RSS' | 'Atom';
    };
}

const FETCH_TIMEOUT_MS = 10_000;
const FRESHNESS_DAYS = 7;

/**
 * Extract the most recent item date from a list of items.
 * Tries common date fields: pubDate (RSS), updated/published (Atom).
 */
function extractLatestDate(items: unknown[]): Date | null {
    let latest: Date | null = null;

    for (const item of items) {
        const record = item as Record<string, unknown>;
        const raw =
            (record['pubDate'] as string | undefined) ??
            (record['updated'] as string | undefined) ??
            (record['published'] as string | undefined);

        if (!raw) continue;

        const d = new Date(raw);
        if (!isNaN(d.getTime())) {
            if (latest === null || d > latest) {
                latest = d;
            }
        }
    }

    return latest;
}

/**
 * Validate an RSS/Atom feed URL.
 *
 * Steps:
 *  1. Fetch with 10s timeout → INVALID_UNREACHABLE on failure
 *  2. Parse XML and detect RSS/Atom → INVALID_XML on failure
 *  3. Freshness check (latest item within 7 days) → INVALID_STALE on failure
 *  4. Return valid=true with metadata
 */
export async function validateFeed(feedUrl: string): Promise<FeedValidationResult> {
    // Step 1: Fetch
    let xmlText: string;
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

        const response = await fetch(feedUrl, {
            signal: controller.signal,
            headers: { 'User-Agent': env.USER_AGENT },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            logger.warn({ feedUrl, status: response.status }, 'Feed unreachable: non-OK HTTP status');
            return { valid: false, reason: 'INVALID_UNREACHABLE' };
        }

        xmlText = await response.text();
    } catch (error) {
        logger.warn({ feedUrl, error }, 'Feed unreachable: fetch failed');
        return { valid: false, reason: 'INVALID_UNREACHABLE' };
    }

    // Step 2: Parse XML
    let feedType: 'RSS' | 'Atom';
    let title: string;
    let items: unknown[];

    try {
        const parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: '@_',
        });

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const parsed = parser.parse(xmlText);

        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (parsed.rss?.channel) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
            const channel = parsed.rss.channel as Record<string, unknown>;
            feedType = 'RSS';
            title = (channel['title'] as string | undefined) ?? '';
            const rawItems = channel['item'];
            items = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        } else if (parsed.feed) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
            const feed = parsed.feed as Record<string, unknown>;
            feedType = 'Atom';
            const rawTitle = feed['title'];
            title = typeof rawTitle === 'string'
                ? rawTitle
                : (rawTitle as Record<string, unknown> | undefined)?.['#text'] as string ?? '';
            const rawEntries = feed['entry'];
            items = Array.isArray(rawEntries) ? rawEntries : rawEntries ? [rawEntries] : [];
        } else {
            logger.warn({ feedUrl }, 'Feed XML is not valid RSS or Atom');
            return { valid: false, reason: 'INVALID_XML' };
        }
    } catch (error) {
        logger.warn({ feedUrl, error }, 'Feed XML parse error');
        return { valid: false, reason: 'INVALID_XML' };
    }

    // Step 3: Freshness check
    const latestItemDate = extractLatestDate(items);
    const cutoff = new Date(Date.now() - FRESHNESS_DAYS * 24 * 60 * 60 * 1000);

    if (!latestItemDate || latestItemDate < cutoff) {
        logger.info({ feedUrl, latestItemDate }, 'Feed is stale: no recent items within 7 days');
        return { valid: false, reason: 'INVALID_STALE' };
    }

    return {
        valid: true,
        metadata: {
            title,
            itemsCount: items.length,
            latestItemDate,
            feedType,
        },
    };
}
