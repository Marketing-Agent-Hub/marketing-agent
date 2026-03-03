import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import { prisma } from '../db/index.js';
import { ItemStatus } from '@prisma/client';
import { env } from '../config/env.js';

const MAX_CONTENT_LENGTH_CHARS = 10000; // ~2500 tokens for AI processing

/**
 * Fetch full HTML from URL with timeout
 */
export async function fetchFullHtml(url: string, timeoutMs = 10000): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': env.USER_AGENT,
                Accept: 'text/html,application/xhtml+xml,application/xml',
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
 * Extract main content from HTML using Readability
 */
export function extractMainContent(html: string, url: string): {
    content: string;
    textContent: string;
    title: string;
    excerpt: string;
} | null {
    try {
        const dom = new JSDOM(html, { url });
        const reader = new Readability(dom.window.document);
        const article = reader.parse();

        if (!article || !article.textContent) {
            return null;
        }

        return {
            content: article.content || '', // HTML content
            textContent: article.textContent, // Plain text
            title: article.title || 'Untitled',
            excerpt: article.excerpt || '',
        };
    } catch (error) {
        console.error('[Extraction] Error parsing HTML:', error);
        return null;
    }
}

/**
 * Truncate content to max length for token optimization
 */
export function truncateContent(content: string, maxLength = MAX_CONTENT_LENGTH_CHARS): string {
    if (content.length <= maxLength) {
        return content;
    }

    // Truncate at word boundary
    const truncated = content.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');

    if (lastSpace > 0) {
        return truncated.substring(0, lastSpace) + '...';
    }

    return truncated + '...';
}

/**
 * Process an item: fetch HTML, extract content, save to articles table
 */
export async function processItem(itemId: number): Promise<{
    success: boolean;
    error?: string;
}> {
    try {
        // Fetch item details
        const item = await prisma.item.findUnique({
            where: { id: itemId },
            select: {
                id: true,
                link: true,
                title: true,
                snippet: true,
                status: true,
            },
        });

        if (!item) {
            return { success: false, error: 'Item not found' };
        }

        // Skip if already processed
        if (item.status !== ItemStatus.NEW) {
            console.log(`[Extraction] Item ${itemId} already processed (status: ${item.status})`);
            return { success: false, error: 'Item already processed' };
        }

        console.log(`[Extraction] Fetching content for: ${item.title}`);

        // Fetch full HTML
        const html = await fetchFullHtml(item.link);

        // Extract main content
        const extracted = extractMainContent(html, item.link);

        if (!extracted) {
            console.warn(`[Extraction] Could not extract content for: ${item.title}`);

            // Update item status to EXTRACTED but with empty content
            await prisma.item.update({
                where: { id: itemId },
                data: { status: ItemStatus.EXTRACTED },
            });

            // Create article with snippet only
            await prisma.article.create({
                data: {
                    itemId: item.id,
                    fullHtml: null,
                    extractedContent: item.snippet || 'No content available',
                    truncatedContent: item.snippet || 'No content available',
                },
            });

            return { success: true };
        }

        // Truncate for AI processing
        const truncated = truncateContent(extracted.textContent);

        // Save article
        await prisma.article.create({
            data: {
                itemId: item.id,
                fullHtml: html,
                extractedContent: extracted.textContent,
                truncatedContent: truncated,
            },
        });

        // Update item status
        await prisma.item.update({
            where: { id: itemId },
            data: { status: ItemStatus.EXTRACTED },
        });

        console.log(`[Extraction] Successfully extracted content for: ${item.title} (${truncated.length} chars)`);

        return { success: true };
    } catch (error: any) {
        console.error(`[Extraction] Error processing item ${itemId}:`, error);
        return { success: false, error: error.message };
    }
}

/**
 * Process all NEW items (batch extraction)
 */
export async function processNewItems(limitPerBatch = 10): Promise<{
    processed: number;
    errors: number;
}> {
    const items = await prisma.item.findMany({
        where: { status: ItemStatus.NEW },
        take: limitPerBatch,
        select: { id: true },
    });

    console.log(`[Extraction] Processing ${items.length} new items`);

    let processed = 0;
    let errors = 0;

    for (const item of items) {
        const result = await processItem(item.id);
        if (result.success) {
            processed++;
        } else {
            errors++;
        }
    }

    console.log(`[Extraction] Batch complete: ${processed} processed, ${errors} errors`);

    return { processed, errors };
}

