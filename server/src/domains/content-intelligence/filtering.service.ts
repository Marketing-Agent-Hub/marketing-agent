import { prisma } from '../../db/index.js';
import { ItemStatus } from '@prisma/client';
import { runFilterEngine, ArticleInput, FilterProfileInput } from './filter-engine.js';
import { openai } from '../../config/ai.config.js';

// Global deny keywords (English) - from SRS requirements
const DENY_KEYWORDS_EN = [
    'price',
    'trading',
    'trade',
    'market price',
    'buy signal',
    'sell signal',
    'pump',
    'dump',
    'moon',
    'lambo',
    'futures',
    'leverage',
    '10x',
    '100x',
    'margin',
    'short',
    'long position',
    'technical analysis',
    'chart pattern',
    'resistance',
    'support level',
];

// Global deny keywords (Vietnamese)
const DENY_KEYWORDS_VI = [
    'giá',
    'giá coin',
    'giao dịch',
    'mua bán',
    'tăng giá',
    'giảm giá',
    'thị trường',
    'phân tích kỹ thuật',
    'đầu tư',
    'lãi',
    'lỗ',
    'margin',
    'futures',
    'x10',
    'x100',
    'bơm',
    'xả',
];

/**
 * Check if content contains market/trading language (BANNED per SRS)
 */
export function hasMarketContent(text: string): boolean {
    const lowerText = text.toLowerCase();

    // Check English keywords
    for (const keyword of DENY_KEYWORDS_EN) {
        if (lowerText.includes(keyword.toLowerCase())) {
            return true;
        }
    }

    // Check Vietnamese keywords
    for (const keyword of DENY_KEYWORDS_VI) {
        if (lowerText.includes(keyword.toLowerCase())) {
            return true;
        }
    }

    return false;
}

/**
 * Check if content matches per-source deny keywords
 */
export function matchesDenyKeywords(text: string, denyKeywords: string[]): string[] {
    const lowerText = text.toLowerCase();
    const matched: string[] = [];

    for (const keyword of denyKeywords) {
        if (lowerText.includes(keyword.toLowerCase())) {
            matched.push(keyword);
        }
    }

    return matched;
}

/**
 * Apply filters to an item and update its status
 */
export async function filterItem(itemId: number): Promise<{
    allowed: boolean;
    reason?: string;
}> {
    try {
        // Fetch item with source and article
        const item = await prisma.item.findUnique({
            where: { id: itemId },
            include: {
                source: {
                    select: { denyKeywords: true },
                },
                article: {
                    select: { extractedContent: true, truncatedContent: true },
                },
            },
        });

        if (!item) {
            return { allowed: false, reason: 'Item not found' };
        }

        // Skip if not in EXTRACTED status
        if (item.status !== ItemStatus.EXTRACTED) {
            console.log(`[Filter] Item ${itemId} not in EXTRACTED status (current: ${item.status})`);
            return { allowed: false, reason: 'Item not ready for filtering' };
        }

        // Combine title, snippet, and article content for filtering
        const contentToCheck = [
            item.title,
            item.snippet || '',
            item.article?.truncatedContent || '',
        ].join(' ');

        // ============================================
        // FILTERING DISABLED FOR TESTING
        // ============================================
        // All items automatically pass to READY_FOR_AI
        // Uncomment the checks below to re-enable filtering

        /* 
        // Check 1: Global market/trading keywords (HARD BAN per SRS)
        if (hasMarketContent(contentToCheck)) {
            console.log(`[Filter] Item ${itemId} REJECTED: Contains trading/market content`);

            await prisma.item.update({
                where: { id: itemId },
                data: {
                    status: ItemStatus.FILTERED_OUT,
                    filterReason: 'Contains banned trading/market keywords',
                },
            });

            return { allowed: false, reason: 'Trading/market content detected' };
        }

        // Check 2: Per-source deny keywords
        if (item.source.denyKeywords.length > 0) {
            const matched = matchesDenyKeywords(contentToCheck, item.source.denyKeywords);
            if (matched.length > 0) {
                console.log(`[Filter] Item ${itemId} REJECTED: Matches source deny keywords: ${matched.join(', ')}`);

                await prisma.item.update({
                    where: { id: itemId },
                    data: {
                        status: ItemStatus.FILTERED_OUT,
                        filterReason: `Matched deny keywords: ${matched.join(', ')}`,
                    },
                });

                return { allowed: false, reason: `Matched deny keywords: ${matched.join(', ')}` };
            }
        }
        */

        // All checks passed (or disabled) - mark as READY_FOR_AI
        console.log(`[Filter] Item ${itemId} PASSED (filtering disabled for testing)`);

        await prisma.item.update({
            where: { id: itemId },
            data: {
                status: ItemStatus.READY_FOR_AI,
                filterReason: null,
            },
        });

        return { allowed: true };
    } catch (error: any) {
        console.error(`[Filter] Error filtering item ${itemId}:`, error);
        return { allowed: false, reason: error.message };
    }
}

/**
 * Creates an embed function using OpenAI text-embedding-3-small
 */
async function createEmbedFn(): Promise<(text: string) => Promise<number[]>> {
    return async (text: string) => {
        const response = await openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: text,
        });
        return response.data[0].embedding;
    };
}

/**
 * Filter EXTRACTED items for a specific brand using its FilterProfile
 */
export async function filterExtractedItemsForBrand(
    brandId: number,
    limit = 20,
): Promise<{ passed: number; rejected: number }> {
    const items = await prisma.item.findMany({
        where: { status: ItemStatus.EXTRACTED, brandId },
        take: limit,
        select: { id: true, title: true },
    });

    console.log(`[Filter] Processing ${items.length} extracted items for brand ${brandId}`);

    const dbProfile = await prisma.filterProfile.findUnique({ where: { brandId } });

    const filterProfileInput: FilterProfileInput = dbProfile
        ? {
            mode: dbProfile.mode as 'PASS_THROUGH' | 'AI_EMBEDDING',
            vectorProfile: dbProfile.vectorProfile as number[] | null,
            similarityThreshold: dbProfile.similarityThreshold,
        }
        : { mode: 'PASS_THROUGH', vectorProfile: null, similarityThreshold: 0.7 };

    const embedFn = await createEmbedFn();

    let passed = 0;
    let rejected = 0;

    for (const item of items) {
        const article = await prisma.article.findUnique({ where: { itemId: item.id } });

        const articleInput: ArticleInput = {
            title: item.title,
            extractedContent: article?.extractedContent ?? '',
        };

        const result = await runFilterEngine(articleInput, filterProfileInput, embedFn);

        if (result.reason === 'embedding_error') {
            console.warn(`[Filter] Embedding error for item ${item.id}, advancing to READY_FOR_AI`);
        }

        if (result.allowed) {
            await prisma.item.update({
                where: { id: item.id },
                data: { status: ItemStatus.READY_FOR_AI, filterReason: null },
            });
            passed++;
        } else {
            await prisma.item.update({
                where: { id: item.id },
                data: { status: ItemStatus.FILTERED_OUT, filterReason: result.reason },
            });
            rejected++;
        }
    }

    console.log(`[Filter] Brand ${brandId} batch complete: ${passed} passed, ${rejected} rejected`);

    return { passed, rejected };
}

/**
 * Filter all EXTRACTED items (batch processing)
 */
export async function filterExtractedItems(limitPerBatch = 20): Promise<{
    passed: number;
    rejected: number;
}> {
    const items = await prisma.item.findMany({
        where: { status: ItemStatus.EXTRACTED },
        take: limitPerBatch,
        select: { id: true },
    });

    console.log(`[Filter] Processing ${items.length} extracted items`);

    let passed = 0;
    let rejected = 0;

    for (const item of items) {
        const result = await filterItem(item.id);
        if (result.allowed) {
            passed++;
        } else {
            rejected++;
        }
    }

    console.log(`[Filter] Batch complete: ${passed} passed, ${rejected} rejected`);

    return { passed, rejected };
}

