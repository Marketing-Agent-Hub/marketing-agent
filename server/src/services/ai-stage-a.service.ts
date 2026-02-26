import { openai, AI_CONFIG } from '../config/ai.config.js';
import { prisma } from '../db/index.js';
import { ItemStatus } from '@prisma/client';

interface StageAOutput {
    isAllowed: boolean;
    topicTags: string[];
    importanceScore: number;
    oneLineSummary: string;
    reason?: string;
}

/**
 * Build AI Stage A prompt
 * Cheap filter using GPT-4o-mini to determine if content is allowed
 */
function buildStageAPrompt(item: {
    title: string;
    snippet?: string;
    sourceName: string;
    publishedAt?: Date | null;
}): string {
    return `You are a content filter for Open Campus Vietnam, an educational blockchain community.

TASK: Analyze this RSS item and determine if it's suitable for our audience.

STRICT RULES:
1. REJECT any content about:
   - Trading signals, price predictions, market analysis
   - "Buy/sell" recommendations
   - Technical analysis, chart patterns
   - Investment advice, portfolio management
   - Futures, leverage, margin trading
   - Pump/dump schemes, "moon" or "lambo" talk

2. ACCEPT content about:
   - Education technology (EdTech)
   - Blockchain technology (infrastructure, protocols, development)
   - Web3 education platforms
   - Open Campus ecosystem news
   - Educational research and innovation
   - Policy and regulation (educational context)

RSS ITEM:
Source: ${item.sourceName}
Published: ${item.publishedAt ? item.publishedAt.toISOString() : 'Unknown'}
Title: ${item.title}
Snippet: ${item.snippet || 'N/A'}

OUTPUT FORMAT (valid JSON only):
{
  "isAllowed": true/false,
  "topicTags": ["tag1", "tag2", "tag3"],
  "importanceScore": 0-100,
  "oneLineSummary": "Brief summary in English",
  "reason": "Why allowed/rejected"
}

TOPIC TAGS (use relevant ones):
- education, edtech, online-learning
- blockchain-tech, web3, smart-contracts
- open-campus, partnerships, announcements
- research, innovation, case-study
- policy, regulation, government
- events, conferences, community

IMPORTANCE SCORE:
- 90-100: Breaking news, major announcements
- 70-89: Significant developments, partnerships
- 50-69: Regular updates, educational content
- 30-49: Minor news, opinion pieces
- 0-29: Low priority, tangential content

Respond with JSON only, no other text.`;
}

/**
 * Call OpenAI API for Stage A analysis
 */
async function callStageA(prompt: string): Promise<StageAOutput> {
    const response = await openai.chat.completions.create({
        model: AI_CONFIG.STAGE_A_MODEL,
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

    return {
        isAllowed: parsed.isAllowed,
        topicTags: Array.isArray(parsed.topicTags) ? parsed.topicTags : [],
        importanceScore: typeof parsed.importanceScore === 'number' ? parsed.importanceScore : 50,
        oneLineSummary: parsed.oneLineSummary || '',
        reason: parsed.reason,
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

        // Build prompt
        const prompt = buildStageAPrompt({
            title: item.title,
            snippet: item.snippet || undefined,
            sourceName: item.source.name,
            publishedAt: item.publishedAt,
        });

        // Call OpenAI
        const result = await callStageA(prompt);

        console.log(`[AI Stage A] Result: ${result.isAllowed ? 'ALLOWED' : 'REJECTED'} (importance: ${result.importanceScore})`);

        // Save AI result
        await prisma.aiResult.create({
            data: {
                itemId: item.id,
                stage: 'A',
                isAllowed: result.isAllowed,
                topicTags: result.topicTags,
                importanceScore: result.importanceScore,
                oneLineSummary: result.oneLineSummary,
                model: AI_CONFIG.STAGE_A_MODEL,
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
        const result = await processStageA(item.id);
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

        // Rate limiting: small delay between requests
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`[AI Stage A] Batch complete: ${processed} processed, ${allowed} allowed, ${rejected} rejected, ${errors} errors`);

    return { processed, allowed, rejected, errors };
}
