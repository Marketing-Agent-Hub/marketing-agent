import { ItemStatus } from '@prisma/client';
import { prisma } from '../../db/index.js';
import { logProcessingError } from '../../lib/job-monitoring.js';
import { logger } from '../../lib/logger.js';
import { NormalizedItem } from '../../lib/plugins/base.plugin.js';
import { getPlugin } from '../../lib/plugins/plugin-registry.js';
import { metricService } from '../../domains/monitoring/metric.service.js';

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
