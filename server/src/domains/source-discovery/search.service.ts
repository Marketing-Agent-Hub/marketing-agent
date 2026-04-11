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

const SEARCH_QUERIES = [
    // English queries — Education & EdTech
    'best EdTech blogs RSS feed 2024',
    'education technology blog atom feed',
    'online learning platform news RSS',
    'e-learning industry blog feed',
    'educational technology newsletter RSS',
    // English queries — Blockchain & Web3
    'blockchain news site:medium.com RSS',
    'web3 developer newsletter feed',
    'crypto education blog RSS feed',
    'DeFi news and analysis RSS',
    'NFT and blockchain technology blog feed',
    // Vietnamese queries — Education & EdTech
    'blog giáo dục công nghệ RSS feed',
    'tin tức EdTech Việt Nam RSS',
    'học trực tuyến e-learning blog feed',
    // Vietnamese queries — Blockchain & Web3
    'blockchain web3 tin tức Việt Nam RSS',
    'tiền điện tử crypto blog feed Việt Nam',
    // Mixed / broader
    'decentralized education blockchain RSS',
    'learn to earn web3 education blog',
    'metaverse education technology feed',
    'open source education platform blog RSS',
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
    return urls.filter((url) => !existing.has(url));
}

/**
 * Execute 10–20 diverse search queries via Tavily API, deduplicate results,
 * and filter out URLs already present in the sources table.
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
            logger.error(
                { service: 'search.service', query, err },
                'Error executing Tavily query — skipping'
            );
        }
    }

    // Deduplicate by URL
    const uniqueUrls = deduplicateUrls(allResults.map((r) => r.url));

    // Filter URLs already in sources
    const filteredUrls = filterExistingUrls(uniqueUrls, existingUrls);
    const filteredSet = new Set(filteredUrls);

    // Rebuild result list preserving snippet/title, keeping only filtered URLs
    const urlToResult = new Map<string, TavilySearchResult>();
    for (const r of allResults) {
        if (!urlToResult.has(r.url)) {
            urlToResult.set(r.url, r);
        }
    }

    const results = filteredUrls
        .map((url) => urlToResult.get(url))
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
