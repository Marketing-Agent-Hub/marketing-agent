import { XMLParser } from 'fast-xml-parser';
import { aiClient } from '../../lib/ai-client.js';
import { settingService } from '../../lib/setting.service.js';
import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';
import type { FeedValidationResult } from './feed-validator.service.js';

export interface FeedScoringResult {
    trustScore: number;           // 0–100
    topicTags: string[];
    suggestedDenyKeywords: string[];
    qualityReason: string;
    isDuplicate: boolean;
    promptTokens: number;
    completionTokens: number;
}

const FETCH_TIMEOUT_MS = 10_000;
const MAX_ITEMS = 5;
const MIN_ITEMS = 3;

/**
 * Determine whether to create a PendingSource from a scoring result.
 * Returns false if trustScore < 40 or isDuplicate === true.
 */
export function shouldCreateFromScore(
    scoring: Pick<FeedScoringResult, 'trustScore' | 'isDuplicate'>
): boolean {
    if (scoring.trustScore < 40) return false;
    if (scoring.isDuplicate === true) return false;
    return true;
}

/**
 * Extract item title and description/summary from a parsed feed item.
 */
function extractItemSnippet(item: Record<string, unknown>): string {
    const title = (item['title'] as string | undefined) ?? '';
    const description =
        (item['description'] as string | undefined) ??
        (item['summary'] as string | undefined) ??
        (item['content'] as string | undefined) ??
        '';

    // Strip HTML tags and trim
    const cleanDesc = description.replace(/<[^>]*>/g, '').trim().slice(0, 300);
    return `Title: ${title}\nSnippet: ${cleanDesc}`;
}

/**
 * Fetch the feed XML and extract the 3–5 most recent items as text snippets.
 */
async function fetchRecentItems(feedUrl: string): Promise<string[]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let xmlText: string;
    try {
        const response = await fetch(feedUrl, {
            signal: controller.signal,
            headers: { 'User-Agent': env.USER_AGENT },
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            logger.warn({ feedUrl, status: response.status }, '[FeedScorer] Feed fetch returned non-OK status');
            return [];
        }
        xmlText = await response.text();
    } catch (error) {
        clearTimeout(timeoutId);
        logger.warn({ feedUrl, error }, '[FeedScorer] Failed to fetch feed for scoring');
        return [];
    }

    try {
        const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const parsed = parser.parse(xmlText);

        let items: unknown[] = [];

        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (parsed.rss?.channel) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            const channel = parsed.rss.channel as Record<string, unknown>;
            const rawItems = channel['item'];
            items = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        } else if (parsed.feed) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            const feed = parsed.feed as Record<string, unknown>;
            const rawEntries = feed['entry'];
            items = Array.isArray(rawEntries) ? rawEntries : rawEntries ? [rawEntries] : [];
        }

        const count = Math.min(MAX_ITEMS, Math.max(MIN_ITEMS, items.length));
        return items
            .slice(0, count)
            .map((item) => extractItemSnippet(item as Record<string, unknown>));
    } catch (error) {
        logger.warn({ feedUrl, error }, '[FeedScorer] Failed to parse feed XML for scoring');
        return [];
    }
}

/**
 * Score a feed using LLM based on its recent content and existing topics.
 *
 * Fetches 3–5 recent items, calls LLM with structured output schema,
 * and records token usage.
 */
export async function scoreFeed(
    feedUrl: string,
    feedMetadata: FeedValidationResult['metadata'],
    existingTopics: string[]
): Promise<FeedScoringResult> {
    const model = await settingService.getModel('ai.models.discovery');

    // Fetch recent items for context
    const recentItems = await fetchRecentItems(feedUrl);

    const itemsText = recentItems.length > 0
        ? recentItems.join('\n\n---\n\n')
        : '(No items available)';

    const existingTopicsText = existingTopics.length > 0
        ? existingTopics.join(', ')
        : '(none)';

    const feedTitle = feedMetadata?.title ?? feedUrl;
    const feedType = feedMetadata?.feedType ?? 'RSS';

    const prompt = `You are evaluating an RSS/Atom feed for inclusion in a news aggregator.

Feed URL: ${feedUrl}
Feed Title: ${feedTitle}
Feed Type: ${feedType}

Recent articles (${recentItems.length} items):
${itemsText}

Existing topics already covered by the aggregator: ${existingTopicsText}

Please evaluate this feed and return a JSON object with:
- trustScore (0-100): Quality and trustworthiness score. Consider: content quality, relevance, editorial standards, update frequency.
- topicTags (string[]): 2-5 topic tags describing the feed's main subjects.
- suggestedDenyKeywords (string[]): Keywords to filter out low-quality or off-topic content from this feed.
- qualityReason (string): Brief explanation of the trust score.
- isDuplicate (boolean): true if this feed covers the same perspective/niche as existing topics (${existingTopicsText}), making it redundant.

Return only valid JSON matching this schema:
{
  "trustScore": number,
  "topicTags": string[],
  "suggestedDenyKeywords": string[],
  "qualityReason": string,
  "isDuplicate": boolean
}`;

    const { data: response } = await aiClient.chat({
        model,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
    });

    const promptTokens = response.usage?.prompt_tokens ?? 0;
    const completionTokens = response.usage?.completion_tokens ?? 0;

    const raw = response.choices[0]?.message?.content ?? '{}';
    let parsed: {
        trustScore?: unknown;
        topicTags?: unknown;
        suggestedDenyKeywords?: unknown;
        qualityReason?: unknown;
        isDuplicate?: unknown;
    };

    try {
        parsed = JSON.parse(raw);
    } catch {
        logger.warn({ feedUrl }, '[FeedScorer] LLM returned invalid JSON, using defaults');
        return {
            trustScore: 0,
            topicTags: [],
            suggestedDenyKeywords: [],
            qualityReason: 'LLM returned invalid response',
            isDuplicate: false,
            promptTokens,
            completionTokens,
        };
    }

    const trustScore =
        typeof parsed.trustScore === 'number' && parsed.trustScore >= 0 && parsed.trustScore <= 100
            ? Math.round(parsed.trustScore)
            : 0;

    const topicTags = Array.isArray(parsed.topicTags)
        ? (parsed.topicTags as unknown[]).filter((t): t is string => typeof t === 'string')
        : [];

    const suggestedDenyKeywords = Array.isArray(parsed.suggestedDenyKeywords)
        ? (parsed.suggestedDenyKeywords as unknown[]).filter((k): k is string => typeof k === 'string')
        : [];

    const qualityReason =
        typeof parsed.qualityReason === 'string' ? parsed.qualityReason : '';

    const isDuplicate = parsed.isDuplicate === true;

    logger.info(
        { feedUrl, trustScore, isDuplicate, topicTags },
        '[FeedScorer] Feed scored'
    );

    return {
        trustScore,
        topicTags,
        suggestedDenyKeywords,
        qualityReason,
        isDuplicate,
        promptTokens,
        completionTokens,
    };
}
