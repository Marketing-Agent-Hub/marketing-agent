import { XMLParser } from 'fast-xml-parser';
import { env } from '../config/env.js';

export interface RSSValidationResult {
    ok: boolean;
    type?: 'RSS' | 'Atom';
    title?: string;
    itemsCount?: number;
    error?: string;
}

/**
 * Parse and validate an RSS/Atom feed
 */
export async function validateRSSFeed(
    url: string,
    timeoutMs = 10000
): Promise<RSSValidationResult> {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': env.USER_AGENT,
            },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            return {
                ok: false,
                error: `HTTP ${response.status}: ${response.statusText}`,
            };
        }

        const contentType = response.headers.get('content-type') || '';
        if (
            !contentType.includes('xml') &&
            !contentType.includes('rss') &&
            !contentType.includes('atom')
        ) {
            return {
                ok: false,
                error: 'Response is not XML/RSS/Atom',
            };
        }

        const xmlText = await response.text();
        const parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: '@_',
        });

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const parsed = parser.parse(xmlText);

        // Detect RSS
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (parsed.rss?.channel) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
            const channel = parsed.rss.channel;
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
            const items = Array.isArray(channel.item) ? channel.item : channel.item ? [channel.item] : [];
            return {
                ok: true,
                type: 'RSS',
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                title: channel.title as string | undefined,
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
                itemsCount: items.length,
            };
        }

        // Detect Atom
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (parsed.feed) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
            const feed = parsed.feed;
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
            const entries = Array.isArray(feed.entry) ? feed.entry : feed.entry ? [feed.entry] : [];
            return {
                ok: true,
                type: 'Atom',
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                title: feed.title as string | undefined,
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
                itemsCount: entries.length,
            };
        }

        return {
            ok: false,
            error: 'Could not detect RSS or Atom format',
        };
    } catch (error) {
        if (error instanceof Error) {
            if (error.name === 'AbortError') {
                return {
                    ok: false,
                    error: 'Request timeout',
                };
            }
            return {
                ok: false,
                error: error.message,
            };
        }
        return {
            ok: false,
            error: 'Unknown error',
        };
    }
}

