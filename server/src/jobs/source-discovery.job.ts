import { env } from '../config/env.js';
import { db } from '../db/index.js';
import { logger } from '../lib/logger.js';
import { searchForSources } from '../domains/source-discovery/search.service.js';
import { extractFeedUrl, shouldProceedWithFeed } from '../domains/source-discovery/feed-extractor.service.js';
import { validateFeed } from '../domains/source-discovery/feed-validator.service.js';
import { scoreFeed, shouldCreateFromScore } from '../domains/source-discovery/feed-scorer.service.js';
import {
    createPendingSource,
    shouldCreatePendingSource,
} from '../domains/source-discovery/pending-source.repository.js';

let isRunning = false;

export function isDiscoveryJobRunning(): boolean {
    return isRunning;
}

export async function runDiscoveryJob(): Promise<void> {
    // Guard: check TAVILY_API_KEY early
    if (!env.TAVILY_API_KEY) {
        logger.warn({ job: 'DiscoveryJob' }, '[DiscoveryJob] TAVILY_API_KEY is not configured — skipping job');
        return;
    }

    if (isRunning) {
        logger.warn({ job: 'DiscoveryJob' }, '[DiscoveryJob] Job is already running — skipping');
        return;
    }

    isRunning = true;
    logger.info({ job: 'DiscoveryJob' }, '[DiscoveryJob] Starting discovery pipeline');

    let createdCount = 0;

    try {
        // Step 2: Get existing URLs from DB
        const existingSources = await db.source.findMany({
            select: { rssUrl: true, siteUrl: true },
        });

        const existingUrlsSet = new Set<string>();
        for (const s of existingSources) {
            if (s.rssUrl) existingUrlsSet.add(s.rssUrl);
            if (s.siteUrl) existingUrlsSet.add(s.siteUrl);
        }

        logger.info(
            { job: 'DiscoveryJob', existingCount: existingUrlsSet.size },
            '[DiscoveryJob] Loaded existing source URLs'
        );

        // Step 3: Search for new sources
        const { results: searchResults, queriesExecuted } = await searchForSources(existingUrlsSet);

        logger.info(
            { job: 'DiscoveryJob', queriesExecuted, resultCount: searchResults.length },
            '[DiscoveryJob] Search completed'
        );

        // Step 8: Get existing topics (fetched once, reused for all scoring calls)
        const sourcesWithTags = await db.source.findMany({
            select: { topicTags: true },
        });
        const existingTopics = [
            ...new Set(sourcesWithTags.flatMap((s) => s.topicTags)),
        ];

        // Step 11: Get existing pending sources for duplicate check
        const existingPending = await db.pendingSource.findMany({
            select: { feedUrl: true, status: true },
        });

        // Process each search result through the pipeline
        for (const searchResult of searchResults) {
            const { url, snippet } = searchResult;

            // Step 4: Extract feed URL
            let extractionResult;
            try {
                extractionResult = await extractFeedUrl(url, snippet);
            } catch (err) {
                logger.error({ job: 'DiscoveryJob', url, err }, '[DiscoveryJob] Feed extraction failed — skipping');
                continue;
            }

            // Step 5: Filter by shouldProceedWithFeed
            if (!shouldProceedWithFeed(extractionResult)) {
                logger.debug(
                    { job: 'DiscoveryJob', url, feedUrl: extractionResult.feedUrl, confidence: extractionResult.confidence },
                    '[DiscoveryJob] Skipping: low confidence or null feedUrl'
                );
                continue;
            }

            const feedUrl = extractionResult.feedUrl!;

            // Step 6: Validate feed
            let validationResult;
            try {
                validationResult = await validateFeed(feedUrl);
            } catch (err) {
                logger.error({ job: 'DiscoveryJob', feedUrl, err }, '[DiscoveryJob] Feed validation threw — skipping');
                continue;
            }

            // Step 7: Filter by valid
            if (!validationResult.valid) {
                logger.debug(
                    { job: 'DiscoveryJob', feedUrl, reason: validationResult.reason },
                    '[DiscoveryJob] Skipping: feed validation failed'
                );
                continue;
            }

            // Step 9: Score the feed
            let scoringResult;
            try {
                scoringResult = await scoreFeed(feedUrl, validationResult.metadata, existingTopics);
            } catch (err) {
                logger.error({ job: 'DiscoveryJob', feedUrl, err }, '[DiscoveryJob] Feed scoring threw — skipping');
                continue;
            }

            // Step 10: Filter by shouldCreateFromScore
            if (!shouldCreateFromScore(scoringResult)) {
                logger.debug(
                    { job: 'DiscoveryJob', feedUrl, trustScore: scoringResult.trustScore, isDuplicate: scoringResult.isDuplicate },
                    '[DiscoveryJob] Skipping: score below threshold or duplicate'
                );
                continue;
            }

            // Step 11: Check shouldCreatePendingSource against existing pending
            if (!shouldCreatePendingSource(feedUrl, existingPending)) {
                logger.debug(
                    { job: 'DiscoveryJob', feedUrl },
                    '[DiscoveryJob] Skipping: feedUrl already exists in pending_sources'
                );
                continue;
            }

            // Step 12: Create pending source
            try {
                await createPendingSource({
                    feedUrl,
                    siteUrl: url !== feedUrl ? url : undefined,
                    suggestedName: validationResult.metadata?.title,
                    trustScore: scoringResult.trustScore,
                    topicTags: scoringResult.topicTags,
                    suggestedDenyKeywords: scoringResult.suggestedDenyKeywords,
                    qualityReason: scoringResult.qualityReason,
                    feedType: validationResult.metadata?.feedType,
                    promptTokens: scoringResult.promptTokens,
                    completionTokens: scoringResult.completionTokens,
                });

                createdCount++;

                // Add to in-memory pending list to prevent duplicates within the same run
                existingPending.push({ feedUrl, status: 'PENDING' });
            } catch (err) {
                logger.error({ job: 'DiscoveryJob', feedUrl, err }, '[DiscoveryJob] Failed to create pending source — skipping');
            }
        }

        // Step 13: Log results
        logger.info(
            { job: 'DiscoveryJob', createdCount },
            `[DiscoveryJob] Pipeline complete — ${createdCount} Pending_Source(s) created`
        );
    } catch (err) {
        logger.error({ job: 'DiscoveryJob', err }, '[DiscoveryJob] Unrecoverable error in discovery pipeline');
    } finally {
        // Step 14: Always release the lock
        isRunning = false;
    }
}

/**
 * Per-brand source discovery runner for TenantJobScheduler
 * Source discovery is global (not brand-scoped), so brandId is ignored.
 */
export async function sourceDiscoveryForBrand(_brandId: number): Promise<void> {
    await runDiscoveryJob();
}
