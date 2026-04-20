import { ItemStatus } from '@prisma/client';
import { prisma } from '../../db/index.js';
import { logProcessingError } from '../../lib/job-monitoring.js';
import { logger } from '../../lib/logger.js';
import { NormalizedItem } from '../../lib/plugins/base.plugin.js';
import { getPlugin } from '../../lib/plugins/plugin-registry.js';
import { metricService } from '../../domains/monitoring/metric.service.js';
import { OpenRouterCreditError, OpenRouterOverloadedError } from '../../lib/ai-client.js';

async function retryWithBackoff<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            if (error instanceof OpenRouterOverloadedError && attempt < maxRetries) {
                const delay = Math.pow(2, attempt) * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }
            throw error;
        }
    }
    throw new Error('Max retries exceeded');
}

export interface IngestResult {
    success: boolean;
    itemsCreated: number;
    itemsExisting: number;
    error?: string;
}

export async function fetchEnabledSources() {
    return prisma.source.findMany({
        where: { enabled: true },
        select: {
            id: true,
            name: true,
            type: true,
            config: true,
            rssUrl: true,
            fetchIntervalMinutes: true,
            lastFetchedAt: true,
        },
    });
}

export async function saveItems(items: NormalizedItem[]): Promise<{ created: number; existing: number }> {
    if (items.length === 0) return { created: 0, existing: 0 };

    const sourceIds = Array.from(new Set(items.map((item) => item.sourceId)));
    const brandSources = await prisma.brandSource.findMany({
        where: { enabled: true, sourceId: { in: sourceIds } },
        select: { sourceId: true, brandId: true },
    });

    if (brandSources.length === 0) {
        logger.warn('[Ingest] Skip saveItems because no enabled brand-source mapping found');
        return { created: 0, existing: 0 };
    }

    const brandIdsBySource = new Map<number, number[]>();
    for (const bs of brandSources) {
        const current = brandIdsBySource.get(bs.sourceId) ?? [];
        current.push(bs.brandId);
        brandIdsBySource.set(bs.sourceId, current);
    }

    let created = 0;
    let existing = 0;

    for (const sourceId of sourceIds) {
        const sourceItems = items.filter((item) => item.sourceId === sourceId);
        const brandIds = brandIdsBySource.get(sourceId) ?? [];

        for (const brandId of brandIds) {
            const result = await saveBrandItems(sourceItems, brandId);
            created += result.created;
            existing += result.existing;
        }
    }

    return { created, existing };
}

export async function ingestSource(sourceId: number): Promise<IngestResult> {
    const source = await prisma.source.findUnique({ where: { id: sourceId } });

    if (!source) {
        return { success: false, itemsCreated: 0, itemsExisting: 0, error: 'Source not found' };
    }

    const startTime = Date.now();

    try {
        const plugin = getPlugin(source.type);

        if (!plugin.validateConfig(source.config)) {
            throw new Error(`Config khong hop le cho plugin ${source.type}`);
        }

        logger.info(`[Ingest] Fetching source: ${source.name} (type: ${source.type})`);
        const raw = await plugin.fetch(source);
        const items = await plugin.parse(raw, source);
        logger.info(`[Ingest] Parsed ${items.length} items from ${source.name}`);

        const result = await saveItems(items);
        logger.info(`[Ingest] Saved ${result.created} new, ${result.existing} duplicates from ${source.name}`);

        await metricService.incrementCounter('ingest_items_total', result.created, {
            sourceType: source.type,
            status: 'created',
        });
        await metricService.incrementCounter('job_completed_total', 1, {
            job: 'IngestJob',
            status: 'success',
            sourceType: source.type,
        });
        const duration = Date.now() - startTime;
        await metricService.recordHistogram('job_duration_ms', duration, 'ms', {
            job: 'IngestJob',
            sourceType: source.type,
        });

        await prisma.source.update({
            where: { id: sourceId },
            data: {
                lastFetchedAt: new Date(),
                lastFetchStatus: 'SUCCESS',
                itemsCount: { increment: result.created },
            },
        });

        return { success: true, itemsCreated: result.created, itemsExisting: result.existing };
    } catch (error: any) {
        await logProcessingError('IngestService', `Loi ingest source ${source.name}`, error, {
            sourceType: source.type,
            sourceId,
        });

        await prisma.source.update({
            where: { id: sourceId },
            data: {
                lastFetchedAt: new Date(),
                lastFetchStatus: `ERROR: ${error.message}`,
            },
        });

        return { success: false, itemsCreated: 0, itemsExisting: 0, error: error.message };
    }
}

export async function ingestAllSources(): Promise<void> {
    const sources = await fetchEnabledSources();
    logger.info(`[Ingest] Starting ingestion for ${sources.length} enabled sources`);

    const CONCURRENCY = 5;
    for (let i = 0; i < sources.length; i += CONCURRENCY) {
        const batch = sources.slice(i, i + CONCURRENCY);
        await Promise.allSettled(batch.map(s => ingestSource(s.id)));
    }

    logger.info('[Ingest] Completed ingestion for all sources');
}

// ============ MULTI-TENANT FUNCTIONS ============

export function getEffectiveInterval(brandSourceInterval: number | null, sourceInterval: number): number {
    return brandSourceInterval !== null ? brandSourceInterval : sourceInterval;
}

export async function ingestAllBrandSources(): Promise<void> {
    const brandSources = await prisma.brandSource.findMany({
        where: { enabled: true },
        include: {
            source: {
                select: {
                    id: true,
                    name: true,
                    type: true,
                    config: true,
                    rssUrl: true,
                    fetchIntervalMinutes: true,
                    lastFetchedAt: true,
                },
            },
        },
    });

    logger.info(`[Ingest] Starting multi-tenant ingestion for ${brandSources.length} brand sources`);

    const now = Date.now();
    const due = brandSources.filter(bs => {
        if (!bs.lastFetchedAt) return true;
        const effectiveInterval = getEffectiveInterval(bs.fetchIntervalMinutes, bs.source.fetchIntervalMinutes);
        return now - bs.lastFetchedAt.getTime() >= effectiveInterval * 60 * 1000;
    });

    let creditExhausted = false;
    const CONCURRENCY = 5;
    for (let i = 0; i < due.length && !creditExhausted; i += CONCURRENCY) {
        const batch = due.slice(i, i + CONCURRENCY);
        for (const bs of batch) {
            try {
                await retryWithBackoff(() => ingestBrandSource(bs));
            } catch (error) {
                if (error instanceof OpenRouterCreditError) {
                    logger.error('[Ingest] OpenRouter credit exhausted, stopping batch immediately');
                    creditExhausted = true;
                    break;
                }
                if (error instanceof OpenRouterOverloadedError) {
                    logger.warn({ brandSourceId: bs.id }, '[Ingest] OpenRouter overloaded after 3 retries, skipping brand source');
                    continue;
                }
                logger.error({ error, brandSourceId: bs.id }, '[Ingest] Error processing brand source');
            }
        }
    }

    logger.info('[Ingest] Completed multi-tenant ingestion for all brand sources');
}

export async function ingestBrandSource(brandSource: {
    id: number;
    brandId: number;
    sourceId: number;
    source: {
        id: number;
        name: string;
        type: any;
        config: any;
        rssUrl: string | null;
        fetchIntervalMinutes: number;
    };
}): Promise<IngestResult> {
    try {
        const plugin = getPlugin(brandSource.source.type);

        logger.info(`[Ingest] Fetching brand source: ${brandSource.source.name} (brandId: ${brandSource.brandId})`);
        const raw = await plugin.fetch(brandSource.source as any);
        const items = await plugin.parse(raw, brandSource.source as any);
        logger.info(`[Ingest] Parsed ${items.length} items from ${brandSource.source.name} for brand ${brandSource.brandId}`);

        const result = await saveBrandItems(items, brandSource.brandId);
        logger.info(`[Ingest] Saved ${result.created} new, ${result.existing} duplicates for brand ${brandSource.brandId}`);

        await prisma.brandSource.update({
            where: { id: brandSource.id },
            data: {
                lastFetchedAt: new Date(),
                lastFetchStatus: 'SUCCESS',
            },
        });

        return { success: true, itemsCreated: result.created, itemsExisting: result.existing };
    } catch (error: any) {
        logger.error(`[Ingest] Error ingesting brand source ${brandSource.source.name} for brand ${brandSource.brandId}: ${error.message}`);

        await prisma.brandSource.update({
            where: { id: brandSource.id },
            data: {
                lastFetchStatus: `ERROR: ${error.message}`,
            },
        });

        return { success: false, itemsCreated: 0, itemsExisting: 0, error: error.message };
    }
}

export async function saveBrandItems(items: NormalizedItem[], brandId: number): Promise<{ created: number; existing: number }> {
    let created = 0;
    let existing = 0;

    for (const item of items) {
        try {
            await prisma.item.create({
                data: {
                    brandId,
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
            if (error.code === 'P2002') {
                existing++;
            } else {
                await logProcessingError(
                    'Ingest',
                    `Error saving brand item: ${item.title}`,
                    error,
                    { brandId, sourceId: item.sourceId, link: item.link }
                );
            }
        }
    }

    return { created, existing };
}
