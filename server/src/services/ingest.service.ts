import { XMLParser } from 'fast-xml-parser';
import crypto from 'crypto';
import { prisma } from '../db/index.js';
import { ItemStatus } from '@prisma/client';
import { logProcessingError } from '../lib/job-monitoring';

interface RssItem {
    sourceId: number;
    guid?: string;
    title: string;
    link: string;
    snippet?: string;
    contentHash: string;
    publishedAt?: Date;
}

/**
 * Fetch all enabled sources from the database
 */
export async function fetchEnabledSources() {
    return await prisma.source.findMany({
        where: { enabled: true },
        select: {
            id: true,
            name: true,
            rssUrl: true,
            fetchIntervalMinutes: true,
            lastFetchedAt: true,
        },
    });
}

/**
 * Fetch RSS feed from URL with timeout
 */
export async function fetchRssFeed(url: string, timeoutMs = 10000): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'OpenCampusVietnamBot/1.0',
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.text();
    } finally {
        clearTimeout(timeout);
    }
}

/**
 * Parse RSS/Atom XML and extract items
 */
export async function parseRssItems(xml: string, sourceId: number): Promise<RssItem[]> {
    const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '_',
    });

    const parsed = parser.parse(xml);
    const items: RssItem[] = [];

    // Detect RSS 2.0
    if (parsed.rss?.channel?.item) {
        const rssItems = Array.isArray(parsed.rss.channel.item)
            ? parsed.rss.channel.item
            : [parsed.rss.channel.item];

        for (const item of rssItems) {
            const title = item.title || 'Untitled';
            const link = item.link || item.guid;
            if (!link) continue;

            const snippet = item.description || item['content:encoded'] || '';
            const guid = item.guid || link;
            const pubDate = item.pubDate ? new Date(item.pubDate) : undefined;

            items.push({
                sourceId,
                guid,
                title,
                link,
                snippet: snippet.substring(0, 1000), // Truncate snippets
                contentHash: generateContentHash({ title, link, snippet }),
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
            const link = entry.link?._href || entry.id;
            if (!link) continue;

            const snippet = entry.summary || entry.content || '';
            const guid = entry.id || link;
            const pubDate = entry.updated || entry.published;

            items.push({
                sourceId,
                guid,
                title,
                link,
                snippet: typeof snippet === 'string' ? snippet.substring(0, 1000) : '',
                contentHash: generateContentHash({ title, link, snippet: typeof snippet === 'string' ? snippet : '' }),
                publishedAt: pubDate ? new Date(pubDate) : undefined,
            });
        }
    }

    return items;
}

/**
 * Generate a unique content hash for deduplication
 */
export function generateContentHash(item: { title: string; link: string; snippet?: string }): string {
    const normalized = `${item.title.trim().toLowerCase()}|${item.link.trim()}|${(item.snippet || '').trim().toLowerCase().substring(0, 200)}`;
    return crypto.createHash('sha256').update(normalized).digest('hex');
}

/**
 * Save items to database with deduplication
 */
export async function saveItems(items: RssItem[]): Promise<{ created: number; existing: number }> {
    let created = 0;
    let existing = 0;

    for (const item of items) {
        try {
            await prisma.item.create({
                data: {
                    sourceId: item.sourceId,
                    guid: item.guid,
                    title: item.title,
                    link: item.link,
                    snippet: item.snippet,
                    contentHash: item.contentHash,
                    publishedAt: item.publishedAt,
                    status: ItemStatus.NEW,
                },
            });
            created++;
        } catch (error: any) {
            // Check for unique constraint violation (duplicate contentHash or sourceId+link)
            if (error.code === 'P2002') {
                existing++;
            } else {
                await logProcessingError(
                    'Ingest',
                    `Error saving item: ${item.title}`,
                    error,
                    { sourceId: item.sourceId, link: item.link }
                );
            }
        }
    }

    return { created, existing };
}

/**
 * Ingest RSS feed for a specific source
 */
export async function ingestSource(sourceId: number): Promise<{
    success: boolean;
    itemsCreated: number;
    itemsExisting: number;
    error?: string;
}> {
    try {
        // Fetch source details
        const source = await prisma.source.findUnique({
            where: { id: sourceId },
            select: { id: true, name: true, rssUrl: true },
        });

        if (!source) {
            return { success: false, itemsCreated: 0, itemsExisting: 0, error: 'Source not found' };
        }

        console.log(`[Ingest] Fetching RSS feed: ${source.name} (${source.rssUrl})`);

        // Fetch RSS feed
        const xml = await fetchRssFeed(source.rssUrl);

        // Parse items
        const items = await parseRssItems(xml, sourceId);
        console.log(`[Ingest] Parsed ${items.length} items from ${source.name}`);

        // Save items
        const result = await saveItems(items);
        console.log(`[Ingest] Saved ${result.created} new items, ${result.existing} duplicates`);

        // Update source metadata
        await prisma.source.update({
            where: { id: sourceId },
            data: {
                lastFetchedAt: new Date(),
                lastFetchStatus: 'SUCCESS',
                itemsCount: {
                    increment: result.created,
                },
            },
        });

        return {
            success: true,
            itemsCreated: result.created,
            itemsExisting: result.existing,
        };
    } catch (error: any) {
        console.error(`[Ingest] Error ingesting source ${sourceId}:`, error);

        // Update source with error status
        await prisma.source.update({
            where: { id: sourceId },
            data: {
                lastFetchedAt: new Date(),
                lastFetchStatus: `ERROR: ${error.message}`,
            },
        });

        return {
            success: false,
            itemsCreated: 0,
            itemsExisting: 0,
            error: error.message,
        };
    }
}

/**
 * Ingest all enabled sources
 */
export async function ingestAllSources(): Promise<void> {
    const sources = await fetchEnabledSources();
    console.log(`[Ingest] Starting ingestion for ${sources.length} enabled sources`);

    for (const source of sources) {
        const result = await ingestSource(source.id);
        console.log(`[Ingest] ${source.name}: ${result.success ? 'SUCCESS' : 'FAILED'} - ${result.itemsCreated} new items`);
    }

    console.log(`[Ingest] Completed ingestion for all sources`);
}
