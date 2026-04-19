import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';

export interface TavilySearchResult {
    url: string;
    snippet: string;
    title?: string;
}

export interface SearchServiceResult {
    results: TavilySearchResult[];
    queriesExecuted: number;
}

const TAVILY_API_URL = 'https://api.tavily.com/search';

/**
 * Universal RSS discovery queries — topic-agnostic.
 * Goal: find as many RSS/Atom feeds as possible across all domains and languages.
 * The feed-scorer LLM will evaluate quality and relevance per feed.
 */
const SEARCH_QUERIES = [
    // —— Universal RSS discovery ————————————————————————————————————————————————————————————————
    'site:feedburner.com RSS feed',
    'inurl:feed OR inurl:rss OR inurl:atom news blog',
    'best RSS feeds to follow 2024',
    'top news blogs with RSS feed',
    'RSS feed directory list 2024',
    'OPML subscription list RSS feeds',
    'feedly popular sources RSS',
    'newsblur popular feeds RSS',
    // —— By content type ——————————————————————————————————————————————————————————————————————
    'industry news blog RSS feed',
    'professional newsletter RSS atom feed',
    'research journal RSS feed',
    'government news RSS feed',
    'startup blog RSS feed',
    'company blog RSS feed site:medium.com',
    'podcast RSS feed directory',
    'YouTube channel RSS feed',
    // —— Vietnamese sources ————————————————————————————————————————————————————————————————
    'news RSS feed globally',
    'industry blog RSS feed english',
    'electronic newspaper RSS feed',
    'news site RSS atom feed',
    // —— By platform ———————————————————————————————————————————————————————————————————————
    'wordpress blog RSS feed',
    'substack newsletter RSS feed',
    'ghost blog RSS feed',
    'blogger RSS feed',
    'tumblr RSS feed',
];

/**
 * Remove duplicate URLs from an array, preserving first occurrence order.
 */
export function deduplicateUrls(urls: string[]): string[] {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const url of urls) {
        if (!seen.has(url)) {
            seen.add(url);
            result.push(url);
        }
    }
    return result;
}

/**
 * Filter out URLs that already exist in the sources table.
 */
export function filterExistingUrls(urls: string[], existing: Set<string>): string[] {
    return urls.filter(url => !existing.has(url));
}

/**
 * Execute diverse search queries via Tavily API to discover RSS/Atom feeds
 * across all topics and languages. Deduplicates results and filters out
 * URLs already present in the sources table.
 *
 * Topic filtering is intentionally absent here — the feed-scorer LLM
 * evaluates each feed's quality and assigns topicTags dynamically.
 */
export async function searchForSources(existingUrls: Set<string>): Promise<SearchServiceResult> {
    const apiKey = env.TAVILY_API_KEY;
    if (!apiKey) {
        logger.warn({ service: 'search.service' }, 'TAVILY_API_KEY is not configured — skipping search');
        return { results: [], queriesExecuted: 0 };
    }

    const allResults: TavilySearchResult[] = [];
    let queriesExecuted = 0;

    for (const query of SEARCH_QUERIES) {
        try {
            const response = await fetch(TAVILY_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    api_key: apiKey,
                    query,
                    search_depth: 'basic',
                    max_results: 5,
                }),
            });

            if (!response.ok) {
                logger.warn(
                    { service: 'search.service', query, status: response.status },
                    'Tavily API returned non-OK status — skipping query'
                );
                continue;
            }

            const data = (await response.json()) as {
                results: Array<{ url: string; content?: string; title?: string }>;
            };

            for (const item of data.results ?? []) {
                allResults.push({
                    url: item.url,
                    snippet: item.content ?? '',
                    title: item.title,
                });
            }

            queriesExecuted++;
        } catch (err) {
            logger.error({ service: 'search.service', query, err }, 'Error executing Tavily query — skipping');
        }
    }

    const uniqueUrls = deduplicateUrls(allResults.map(r => r.url));
    const filteredUrls = filterExistingUrls(uniqueUrls, existingUrls);
    const filteredSet = new Set(filteredUrls);

    const urlToResult = new Map<string, TavilySearchResult>();
    for (const r of allResults) {
        if (!urlToResult.has(r.url)) urlToResult.set(r.url, r);
    }

    const results = filteredUrls
        .map(url => urlToResult.get(url))
        .filter((r): r is TavilySearchResult => r !== undefined && filteredSet.has(r.url));

    logger.info(
        {
            service: 'search.service',
            queriesExecuted,
            totalRaw: allResults.length,
            afterDedup: uniqueUrls.length,
            afterFilter: results.length,
        },
        'Search completed'
    );

    return { results, queriesExecuted };
}
