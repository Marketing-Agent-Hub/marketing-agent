import { AI_CONFIG } from '../../config/ai.config.js';
import { prisma } from '../../db/index.js';
import { ItemStatus } from '@prisma/client';
import { aiClient, OpenRouterCreditError, OpenRouterOverloadedError } from '../../lib/ai-client.js';
import { settingService } from '../../lib/setting.service.js';
import { logger } from '../../lib/logger.js';

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

interface StageAOutput {
    isAllowed: boolean;
    topicTags: string[];
    importanceScore: number;
    oneLineSummary: string;
    reason?: string;
}

/**
 * Build AI Stage A prompt
 * Configurable content analyzer based on environment settings
 */
function buildStageAPrompt(item: {
    title: string;
    snippet?: string;
    sourceName: string;
    publishedAt?: Date | null;
}): string {
    return `You are a content intelligence analyzer for a marketing automation platform.

TASK: Analyze this RSS item and categorize it.

ACCEPT all content unless it's:
- Spam or clearly irrelevant (adult content, completely unrelated industries)
- Duplicate or broken content

RSS ITEM:
Source: ${item.sourceName}
Published: ${item.publishedAt ? item.publishedAt.toISOString() : 'Unknown'}
Title: ${item.title}
Snippet: ${item.snippet || 'N/A'}

OUTPUT FORMAT (valid JSON only):
{
  "isAllowed": true,
  "topicTags": ["tag1", "tag2", "tag3"],
  "importanceScore": 0-100,
  "oneLineSummary": "Brief summary",
  "reason": "Why accepted"
}

TOPIC TAGS:
Generate relevant topic tags based on content (e.g., technology, education, business, science, health, sports, entertainment, politics, etc.)

IMPORTANCE SCORE:
- 90-100: Breaking news, major announcements
- 70-89: Significant developments, partnerships
- 50-69: Regular updates, informative content
- 30-49: Minor news, opinion pieces
- 0-29: Low priority, tangential content

Respond with JSON only, no other text.`;
}

/**
 * Heuristic-based filtering when AI is disabled
 * Simple rule-based approach to categorize content
 */
function applyHeuristicFilter(item: {
    title: string;
    snippet?: string;
    sourceName: string;
}): StageAOutput {
    const text = `${item.title} ${item.snippet || ''}`.toLowerCase();

    // Spam/irrelevant keywords
    const spamKeywords = ['adult', 'casino', 'gambling', 'xxx', 'porn'];
    const isSpam = spamKeywords.some(keyword => text.includes(keyword));

    if (isSpam) {
        return {
            isAllowed: false,
            topicTags: ['spam'],
            importanceScore: 0,
            oneLineSummary: 'Filtered as spam content',
            reason: 'Contains spam keywords',
        };
    }

    // Basic topic detection
    const topicKeywords = {
        technology: ['tech', 'ai', 'software', 'hardware', 'computer', 'digital', 'startup', 'app', 'mobile', 'cloud'],
        business: ['business', 'market', 'economy', 'trade', 'company', 'finance', 'investment', 'stock'],
        science: ['science', 'research', 'study', 'discovery', 'scientist', 'experiment'],
        health: ['health', 'medical', 'disease', 'vaccine', 'hospital', 'doctor', 'treatment'],
        education: ['education', 'school', 'university', 'student', 'teacher', 'learning', 'course'],
        entertainment: ['movie', 'music', 'game', 'celebrity', 'entertainment', 'film', 'actor'],
        sports: ['sport', 'football', 'basketball', 'soccer', 'tennis', 'olympic', 'athlete'],
        politics: ['politics', 'government', 'election', 'president', 'minister', 'policy', 'law'],
    };

    const detectedTags: string[] = [];
    for (const [topic, keywords] of Object.entries(topicKeywords)) {
        if (keywords.some(keyword => text.includes(keyword))) {
            detectedTags.push(topic);
        }
    }

    if (detectedTags.length === 0) {
        detectedTags.push('general');
    }

    // Simple importance scoring based on keywords
    let importanceScore = 50; // Base score

    // Breaking news indicators
    const urgentKeywords = ['breaking', 'urgent', 'announce', 'launch', 'release', 'unveil'];
    if (urgentKeywords.some(keyword => text.includes(keyword))) {
        importanceScore += 20;
    }

    // High profile indicators
    const highProfileKeywords = ['ceo', 'founder', 'president', 'major', 'billion', 'partnership'];
    if (highProfileKeywords.some(keyword => text.includes(keyword))) {
        importanceScore += 15;
    }

    // Cap at 100
    importanceScore = Math.min(importanceScore, 100);

    return {
        isAllowed: true,
        topicTags: detectedTags.slice(0, 3),
        importanceScore,
        oneLineSummary: item.title,
        reason: 'Auto-categorized (AI disabled)',
    };
}

/**
 * Call AI for Stage A analysis
 */
async function callStageA(prompt: string): Promise<{ result: StageAOutput; actualModel: string }> {
    const model = await settingService.getModel('ai.models.stageA');
    const { data: response, actualModel } = await aiClient.chat({
        model,
        messages: [
            {
                role: 'system',
                content: 'You are a content filtering AI. Respond only with valid JSON.',
            },
            {
                role: 'user',
                content: prompt,
            },
        ],
        temperature: 0.3,
        max_tokens: 500,
        response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
        throw new Error('No response from OpenAI');
    }

    const parsed = JSON.parse(content) as StageAOutput;

    // Validate response structure
    if (typeof parsed.isAllowed !== 'boolean') {
        throw new Error('Invalid response: missing isAllowed');
    }

    // Force allow all items for testing RSS sources
    return {
        result: {
            isAllowed: true, // Always allow during testing phase
            topicTags: Array.isArray(parsed.topicTags) ? parsed.topicTags : [],
            importanceScore: typeof parsed.importanceScore === 'number' ? parsed.importanceScore : 50,
            oneLineSummary: parsed.oneLineSummary || '',
            reason: parsed.reason || 'Auto-accepted for testing',
        },
        actualModel,
    };
}

/**
 * Process an item through AI Stage A
 */
export async function processStageA(itemId: number): Promise<{
    success: boolean;
    isAllowed: boolean;
    error?: string;
}> {
    try {
        // Fetch item with source
        const item = await prisma.item.findUnique({
            where: { id: itemId },
            include: {
                source: {
                    select: { name: true },
                },
            },
        });

        if (!item) {
            return { success: false, isAllowed: false, error: 'Item not found' };
        }

        // Skip if not in READY_FOR_AI status
        if (item.status !== ItemStatus.READY_FOR_AI) {
            console.log(`[AI Stage A] Item ${itemId} not ready (status: ${item.status})`);
            return { success: false, isAllowed: false, error: 'Item not ready for AI' };
        }

        console.log(`[AI Stage A] Processing: ${item.title.substring(0, 60)}...`);

        let result: StageAOutput;
        let actualModel: string;

        if (AI_CONFIG.STAGE_A_ENABLED) {
            // Use AI analysis
            const prompt = buildStageAPrompt({
                title: item.title,
                snippet: item.snippet || undefined,
                sourceName: item.source.name,
                publishedAt: item.publishedAt,
            });

            const callResult = await callStageA(prompt);
            result = callResult.result;
            actualModel = callResult.actualModel;
            console.log(`[AI Stage A] AI Result: ${result.isAllowed ? 'ALLOWED' : 'REJECTED'} (importance: ${result.importanceScore})`);
        } else {
            // Use heuristic filtering
            result = applyHeuristicFilter({
                title: item.title,
                snippet: item.snippet || undefined,
                sourceName: item.source.name,
            });
            actualModel = 'heuristic-fallback';
            console.log(`[AI Stage A] Heuristic Result: ${result.isAllowed ? 'ALLOWED' : 'REJECTED'} (importance: ${result.importanceScore})`);
        }

        // Save AI result
        await prisma.aiResult.create({
            data: {
                itemId: item.id,
                stage: 'A',
                isAllowed: result.isAllowed,
                topicTags: result.topicTags,
                importanceScore: result.importanceScore,
                oneLineSummary: result.oneLineSummary,
                model: actualModel,
            },
        });

        // Update item status
        await prisma.item.update({
            where: { id: itemId },
            data: {
                status: ItemStatus.AI_STAGE_A_DONE,
                filterReason: result.isAllowed ? null : `AI rejected: ${result.reason}`,
            },
        });

        return {
            success: true,
            isAllowed: result.isAllowed,
        };
    } catch (error: any) {
        console.error(`[AI Stage A] Error processing item ${itemId}:`, error);
        return { success: false, isAllowed: false, error: error.message };
    }
}

/**
 * Process all READY_FOR_AI items through Stage A (batch)
 */
export async function processStageABatch(limitPerBatch = 5): Promise<{
    processed: number;
    allowed: number;
    rejected: number;
    errors: number;
}> {
    const items = await prisma.item.findMany({
        where: { status: ItemStatus.READY_FOR_AI },
        take: limitPerBatch,
        select: { id: true },
    });

    console.log(`[AI Stage A] Processing ${items.length} items`);

    let processed = 0;
    let allowed = 0;
    let rejected = 0;
    let errors = 0;

    for (const item of items) {
        try {
            const result = await retryWithBackoff(() => processStageA(item.id));
            if (result.success) {
                processed++;
                if (result.isAllowed) {
                    allowed++;
                } else {
                    rejected++;
                }
            } else {
                errors++;
            }
        } catch (error) {
            if (error instanceof OpenRouterCreditError) {
                logger.error('[AI Stage A] OpenRouter credit exhausted, stopping batch immediately');
                break;
            }
            if (error instanceof OpenRouterOverloadedError) {
                logger.warn({ itemId: item.id }, '[AI Stage A] OpenRouter overloaded after 3 retries, skipping item');
                errors++;
                continue;
            }
            logger.error({ error, itemId: item.id }, '[AI Stage A] Error processing item');
            errors++;
        }

        // Rate limiting: small delay between requests
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`[AI Stage A] Batch complete: ${processed} processed, ${allowed} allowed, ${rejected} rejected, ${errors} errors`);

    return { processed, allowed, rejected, errors };
}

