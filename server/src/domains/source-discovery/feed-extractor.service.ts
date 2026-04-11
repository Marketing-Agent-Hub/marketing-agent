import { openai } from '../../config/ai.config.js';
import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';

export interface FeedExtractionResult {
    feedUrl: string | null;
    confidence: 'low' | 'medium' | 'high';
    source: 'heuristic' | 'llm';
}

const HEURISTIC_PATHS = ['/feed', '/rss', '/feed.xml', '/atom.xml', '/rss.xml'];

/**
 * Generate a list of candidate feed URLs by appending common feed paths to the base URL.
 */
export function generateHeuristicFeedUrls(baseUrl: string): string[] {
    const parsed = new URL(baseUrl);
    const origin = parsed.origin;
    return HEURISTIC_PATHS.map((path) => `${origin}${path}`);
}

/**
 * Determine whether to proceed with a feed extraction result.
 * Returns false if feedUrl is null or confidence is 'low'.
 */
export function shouldProceedWithFeed(result: Pick<FeedExtractionResult, 'feedUrl' | 'confidence'>): boolean {
    if (result.feedUrl === null) return false;
    if (result.confidence === 'low') return false;
    return true;
}

/**
 * Try a HEAD request to check if a URL is reachable and looks like a feed.
 */
async function checkHeuristicUrl(url: string): Promise<boolean> {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal,
            headers: { 'User-Agent': env.USER_AGENT },
        });
        clearTimeout(timeout);
        if (!response.ok) return false;
        const contentType = response.headers.get('content-type') ?? '';
        return (
            contentType.includes('xml') ||
            contentType.includes('rss') ||
            contentType.includes('atom') ||
            contentType.includes('feed')
        );
    } catch {
        return false;
    }
}

/**
 * Call LLM to infer the most likely RSS/Atom feed URL from a webpage URL and snippet.
 */
async function extractFeedUrlWithLLM(url: string, snippet: string): Promise<FeedExtractionResult> {
    const model = env.DISCOVERY_MODEL;

    const response = await openai.chat.completions.create({
        model,
        messages: [
            {
                role: 'user',
                content: `Given this webpage URL and snippet, infer the most likely RSS/Atom feed URL. Return JSON: { feedUrl: string | null, confidence: 'low' | 'medium' | 'high' }\n\nURL: ${url}\nSnippet: ${snippet}`,
            },
        ],
        response_format: { type: 'json_object' },
    });

    const raw = response.choices[0]?.message?.content ?? '{}';
    let parsed: { feedUrl?: string | null; confidence?: string };
    try {
        parsed = JSON.parse(raw);
    } catch {
        logger.warn({ url }, '[FeedExtractor] LLM returned invalid JSON');
        return { feedUrl: null, confidence: 'low', source: 'llm' };
    }

    const feedUrl = typeof parsed.feedUrl === 'string' ? parsed.feedUrl : null;
    const confidence = (['low', 'medium', 'high'] as const).includes(parsed.confidence as any)
        ? (parsed.confidence as 'low' | 'medium' | 'high')
        : 'low';

    // Validate feedUrl is parseable
    if (feedUrl !== null) {
        try {
            new URL(feedUrl);
        } catch {
            logger.warn({ url, feedUrl }, '[FeedExtractor] LLM returned invalid feedUrl');
            return { feedUrl: null, confidence: 'low', source: 'llm' };
        }
    }

    return { feedUrl, confidence, source: 'llm' };
}

/**
 * Extract the feed URL for a given webpage URL and snippet.
 * Tries heuristic paths first (HEAD request), falls back to LLM if none found.
 */
export async function extractFeedUrl(url: string, snippet: string): Promise<FeedExtractionResult> {
    // Step 1: Try heuristic paths
    let heuristicUrls: string[];
    try {
        heuristicUrls = generateHeuristicFeedUrls(url);
    } catch {
        logger.warn({ url }, '[FeedExtractor] Invalid base URL, skipping heuristic');
        heuristicUrls = [];
    }

    for (const candidateUrl of heuristicUrls) {
        const reachable = await checkHeuristicUrl(candidateUrl);
        if (reachable) {
            logger.debug({ url, feedUrl: candidateUrl }, '[FeedExtractor] Found feed via heuristic');
            return { feedUrl: candidateUrl, confidence: 'high', source: 'heuristic' };
        }
    }

    // Step 2: Fall back to LLM
    logger.debug({ url }, '[FeedExtractor] Heuristic failed, calling LLM');
    try {
        return await extractFeedUrlWithLLM(url, snippet);
    } catch (error) {
        logger.error({ url, error }, '[FeedExtractor] LLM call failed');
        return { feedUrl: null, confidence: 'low', source: 'llm' };
    }
}
