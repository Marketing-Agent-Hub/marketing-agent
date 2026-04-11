import { Prisma, PendingSourceStatus } from '@prisma/client';
import type { PendingSource } from '@prisma/client';
import { db } from '../../db/index.js';
import { logger } from '../../lib/logger.js';

// ============ Types ============

export interface ApproveRequest {
    name?: string;
    trustScore?: number;
    topicTags?: string[];
    denyKeywords?: string[];
}

export interface CreatePendingSourceInput {
    feedUrl: string;
    siteUrl?: string;
    suggestedName?: string;
    trustScore: number;
    topicTags: string[];
    suggestedDenyKeywords: string[];
    qualityReason?: string;
    feedType?: string;
    sourceSearchQuery?: string;
    promptTokens?: number;
    completionTokens?: number;
}

// ============ Pure Functions ============

/**
 * Determine whether a new PendingSource should be created for the given feedUrl.
 * Returns false if feedUrl already exists with status PENDING, APPROVED, or REJECTED.
 *
 * Property 6: Validates Requirements 6.2, 9.3
 */
export function shouldCreatePendingSource(
    feedUrl: string,
    existing: Array<{ feedUrl: string; status: string }>
): boolean {
    const blocked = new Set<string>(['PENDING', 'APPROVED', 'REJECTED']);
    return !existing.some((e) => e.feedUrl === feedUrl && blocked.has(e.status));
}

/**
 * Map a PendingSource to a Prisma SourceCreateInput for the approve flow.
 * Override values take priority over AI-suggested values.
 *
 * Property 7: Validates Requirements 8.2, 8.5
 */
export function mapPendingToSource(
    pending: PendingSource,
    overrides: ApproveRequest
): Prisma.SourceCreateInput {
    return {
        rssUrl: pending.feedUrl,
        enabled: false,
        type: 'RSS',
        name: overrides.name ?? pending.suggestedName ?? pending.feedUrl,
        trustScore: overrides.trustScore ?? pending.trustScore,
        topicTags: overrides.topicTags ?? pending.topicTags,
        denyKeywords: overrides.denyKeywords ?? pending.suggestedDenyKeywords,
        siteUrl: pending.siteUrl ?? undefined,
    };
}

/**
 * Paginate an array of items.
 * Returns the correct slice based on offset (page - 1) * limit.
 *
 * Property 8: Validates Requirements 7.2
 */
export function paginateSources<T>(
    sources: T[],
    page: number,
    limit: number
): { data: T[]; total: number } {
    const offset = (page - 1) * limit;
    return {
        data: sources.slice(offset, offset + limit),
        total: sources.length,
    };
}

/**
 * Filter sources by status.
 *
 * Property 9: Validates Requirements 7.3
 */
export function filterByStatus<T extends { status: string }>(
    sources: T[],
    status: string
): T[] {
    return sources.filter((s) => s.status === status);
}

/**
 * Sort sources by trustScore descending (does not mutate the original array).
 *
 * Property 10: Validates Requirements 7.4
 */
export function sortByTrustScore<T extends { trustScore: number }>(sources: T[]): T[] {
    return [...sources].sort((a, b) => b.trustScore - a.trustScore);
}

// ============ DB Functions ============

/**
 * Create a new PendingSource record.
 */
export async function createPendingSource(
    data: CreatePendingSourceInput
): Promise<PendingSource> {
    const record = await db.pendingSource.create({
        data: {
            feedUrl: data.feedUrl,
            siteUrl: data.siteUrl,
            suggestedName: data.suggestedName,
            trustScore: data.trustScore,
            topicTags: data.topicTags,
            suggestedDenyKeywords: data.suggestedDenyKeywords,
            qualityReason: data.qualityReason,
            feedType: data.feedType,
            sourceSearchQuery: data.sourceSearchQuery,
            promptTokens: data.promptTokens,
            completionTokens: data.completionTokens,
        },
    });

    logger.info({ id: record.id, feedUrl: record.feedUrl }, '[PendingSource] Created');
    return record;
}

/**
 * Find a PendingSource by its ID.
 */
export async function findPendingById(id: number): Promise<PendingSource | null> {
    return db.pendingSource.findUnique({ where: { id } });
}

/**
 * Update the status (and optional rejectionReason) of a PendingSource.
 */
export async function updatePendingStatus(
    id: number,
    status: PendingSourceStatus,
    rejectionReason?: string
): Promise<PendingSource> {
    const record = await db.pendingSource.update({
        where: { id },
        data: {
            status,
            rejectionReason: rejectionReason ?? null,
        },
    });

    logger.info({ id, status }, '[PendingSource] Status updated');
    return record;
}

/**
 * List PendingSources with optional status filter, sorted by trustScore DESC, paginated.
 */
export async function listPending(opts: {
    status?: PendingSourceStatus;
    page: number;
    limit: number;
}): Promise<{ data: PendingSource[]; total: number }> {
    const where: Prisma.PendingSourceWhereInput = opts.status ? { status: opts.status } : {};

    const [data, total] = await Promise.all([
        db.pendingSource.findMany({
            where,
            orderBy: { trustScore: 'desc' },
            skip: (opts.page - 1) * opts.limit,
            take: opts.limit,
        }),
        db.pendingSource.count({ where }),
    ]);

    return { data, total };
}
