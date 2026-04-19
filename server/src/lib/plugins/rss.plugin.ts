import { XMLParser } from 'fast-xml-parser';
import { Source } from '@prisma/client';
import { env } from '../../config/env.js';
import { BasePlugin, RawPluginData, NormalizedItem, generateContentHash } from './base.plugin.js';

export class RssPlugin implements BasePlugin {
    /**
     * Fetch RSS feed from source.rssUrl
     */
    async fetch(source: Source): Promise<RawPluginData[]> {
        if (!source.rssUrl) {
            throw new Error(`Source ${source.id} (${source.name}) is missing rssUrl`);
        }

        const timeoutMs = 10000;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const response = await fetch(source.rssUrl, {
                signal: controller.signal,
                headers: { 'User-Agent': env.USER_AGENT },
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const xml = await response.text();
            return [{ raw: xml }];
        } finally {
            clearTimeout(timeout);
        }
    }

    /**
     * Parse RSS 2.0 / Atom XML into NormalizedItem[]
     */
    async parse(raw: RawPluginData[], source: Source): Promise<NormalizedItem[]> {
        const xml = raw[0].raw as string;
        const parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: '_',
        });

        const parsed = parser.parse(xml);
        const items: NormalizedItem[] = [];

        // Detect RSS 2.0
        if (parsed.rss?.channel?.item) {
            const rssItems = Array.isArray(parsed.rss.channel.item)
                ? parsed.rss.channel.item
                : [parsed.rss.channel.item];

            for (const item of rssItems) {
                const title = item.title || 'Untitled';

                let link = item.link || item.guid;
                if (typeof link === 'object' && link !== null) {
                    link = link['#text'] || link.text || link._href || '';
                }
                if (!link) continue;
                const linkStr = typeof link === 'string' ? link : String(link);

                const snippet = item.description || item['content:encoded'] || '';

                let guid = item.guid;
                if (typeof guid === 'object' && guid !== null) {
                    guid = guid['#text'] || guid.text || linkStr;
                }
                guid = guid || linkStr;

                const pubDate = item.pubDate ? new Date(item.pubDate) : undefined;

                items.push({
                    sourceId: source.id,
                    guid: typeof guid === 'string' ? guid : String(guid),
                    title,
                    link: linkStr,
                    snippet: snippet.substring(0, 1000),
                    contentHash: generateContentHash({ title, link: linkStr, snippet }),
                    publishedAt: pubDate,
                });
            }
        }

        // Detect Atom
        if (parsed.feed?.entry) {
            const atomEntries = Array.isArray(parsed.feed.entry)
                ? parsed.feed.entry
                : [parsed.feed.entry];

            for (const entry of atomEntries) {
                const title = entry.title || 'Untitled';

                let link = entry.link?._href || entry.id;
                if (typeof link === 'object' && link !== null) {
                    link = link['#text'] || link.text || link._href || '';
                }
                if (!link) continue;
                const linkStr = typeof link === 'string' ? link : String(link);

                const snippet = entry.summary || entry.content || '';

                let guid = entry.id;
                if (typeof guid === 'object' && guid !== null) {
                    guid = guid['#text'] || guid.text || linkStr;
                }
                guid = guid || linkStr;

                const pubDate = entry.updated || entry.published;

                items.push({
                    sourceId: source.id,
                    guid: typeof guid === 'string' ? guid : String(guid),
                    title,
                    link: linkStr,
                    snippet: typeof snippet === 'string' ? snippet.substring(0, 1000) : '',
                    contentHash: generateContentHash({
                        title,
                        link: linkStr,
                        snippet: typeof snippet === 'string' ? snippet : '',
                    }),
                    publishedAt: pubDate ? new Date(pubDate) : undefined,
                });
            }
        }

        return items;
    }

    /**
     * RSS does not require special config
     */
    validateConfig(_config: unknown): boolean {
        return true;
    }
}

export const rssPlugin = new RssPlugin();
