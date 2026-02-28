import { openai, AI_CONFIG } from '../config/ai.config.js';
import { prisma } from '../db/index.js';
import { ItemStatus } from '@prisma/client';

interface StageBOutput {
    summary: string;
    bullets: string[];
    whyItMatters: string;
    riskFlags: string[];
    suggestedHashtags: string[];
}

/**
 * Build AI Stage B prompt
 * Deep analysis using GPT-4o to create Vietnamese content
 */
function buildStageBPrompt(item: {
    title: string;
    content: string;
    sourceName: string;
    topicTags: string[];
    importanceScore: number;
    oneLineSummary: string;
}): string {
    return `You are a content writer for Open Campus Vietnam, creating educational blockchain content in Vietnamese.

CONTEXT:
Source: ${item.sourceName}
Topic Tags: ${item.topicTags.join(', ')}
Importance: ${item.importanceScore}/100
Quick Summary: ${item.oneLineSummary}

ARTICLE:
Title: ${item.title}

Content:
${item.content}

---

YOUR TASK: Create a Vietnamese summary for our Facebook audience (builders, educators, students interested in Web3 education).

TONE & STYLE:
- Builder vibe (enthusiastic but not hyped)
- Educational and informative
- Professional yet accessible
- NO sensationalism or clickbait
- NO investment/trading language

OUTPUT FORMAT (valid JSON only):
{
  "summary": "2-3 câu tóm tắt bằng tiếng Việt, giải thích nội dung chính",
  "bullets": [
    "Điểm nổi bật 1 (tiếng Việt, giữ nguyên thuật ngữ tiếng Anh)",
    "Điểm nổi bật 2",
    "Điểm nổi bật 3",
    "Điểm nổi bật 4 (nếu có)",
    "Điểm nổi bật 5 (nếu có)"
  ],
  "whyItMatters": "1-2 câu giải thích tại sao điều này quan trọng với cộng đồng Open Campus Vietnam (tiếng Việt)",
  "riskFlags": ["Cảnh báo nếu có (tiếng Việt)", "hoặc mảng rỗng nếu không có"],
  "suggestedHashtags": ["education", "edtech", "blockchain", "web3", "opencampus"]
}

RULES:
1. Summary: 2-3 sentences in Vietnamese, clear and concise
2. Bullets: 3-5 key points in Vietnamese (keep English technical terms as-is)
3. WhyItMatters: Why this matters for OCVN community (Vietnamese)
4. RiskFlags: Any concerns or caveats (Vietnamese), empty array if none
5. Hashtags: 3-7 relevant English hashtags (lowercase, no #)

IMPORTANT:
- Write 100% in Vietnamese (except technical terms and hashtags)
- Keep technical terms in English: blockchain, smart contract, NFT, DeFi, Web3, etc.
- NO marketing fluff or hype
- Focus on educational value
- Be specific and actionable

Respond with JSON only, no other text.`;
}

/**
 * Call OpenAI API for Stage B analysis
 */
async function callStageB(prompt: string): Promise<StageBOutput> {
    const response = await openai.chat.completions.create({
        model: AI_CONFIG.STAGE_B_MODEL,
        messages: [
            {
                role: 'system',
                content: 'You are a Vietnamese content writer for educational blockchain content. Respond only with valid JSON.',
            },
            {
                role: 'user',
                content: prompt,
            },
        ],
        temperature: 0.7,
        max_tokens: 1500,
        response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
        throw new Error('No response from OpenAI');
    }

    const parsed = JSON.parse(content) as StageBOutput;

    // Validate response structure
    if (!parsed.summary || !Array.isArray(parsed.bullets)) {
        throw new Error('Invalid response: missing required fields');
    }

    return {
        summary: parsed.summary,
        bullets: parsed.bullets.filter(b => b && b.length > 0),
        whyItMatters: parsed.whyItMatters || '',
        riskFlags: Array.isArray(parsed.riskFlags) ? parsed.riskFlags : [],
        suggestedHashtags: Array.isArray(parsed.suggestedHashtags) ? parsed.suggestedHashtags : [],
    };
}

/**
 * Check if we already have Stage B result for this content hash (caching)
 */
async function checkStageBCache(contentHash: string): Promise<StageBOutput | null> {
    // Find any item with same content hash that has Stage B result
    const existingResult = await prisma.aiResult.findFirst({
        where: {
            stage: 'B',
            item: {
                contentHash: contentHash,
            },
        },
        select: {
            summary: true,
            bullets: true,
            whyItMatters: true,
            riskFlags: true,
            suggestedHashtags: true,
        },
    });

    if (!existingResult) {
        return null;
    }

    return {
        summary: existingResult.summary || '',
        bullets: existingResult.bullets,
        whyItMatters: existingResult.whyItMatters || '',
        riskFlags: existingResult.riskFlags,
        suggestedHashtags: existingResult.suggestedHashtags,
    };
}

/**
 * Process an item through AI Stage B
 */
export async function processStageB(itemId: number): Promise<{
    success: boolean;
    error?: string;
}> {
    try {
        // Fetch item with source, article, and Stage A result
        const item = await prisma.item.findUnique({
            where: { id: itemId },
            include: {
                source: {
                    select: { name: true },
                },
                article: {
                    select: { truncatedContent: true },
                },
                aiResults: {
                    where: { stage: 'A' },
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                },
            },
        });

        if (!item) {
            return { success: false, error: 'Item not found' };
        }

        // Skip if not in AI_STAGE_A_DONE status
        if (item.status !== ItemStatus.AI_STAGE_A_DONE) {
            console.log(`[AI Stage B] Item ${itemId} not ready (status: ${item.status})`);
            return { success: false, error: 'Item not ready for Stage B' };
        }

        // Get Stage A result
        const stageAResult = item.aiResults[0];
        if (!stageAResult) {
            return { success: false, error: 'No Stage A result found' };
        }

        // Skip if Stage A rejected
        if (!stageAResult.isAllowed) {
            console.log(`[AI Stage B] Item ${itemId} rejected by Stage A, skipping Stage B`);
            await prisma.item.update({
                where: { id: itemId },
                data: { status: ItemStatus.FILTERED_OUT },
            });
            return { success: false, error: 'Stage A rejected' };
        }

        // Check article content
        if (!item.article?.truncatedContent) {
            return { success: false, error: 'No article content found' };
        }

        console.log(`[AI Stage B] Processing: ${item.title.substring(0, 60)}...`);

        // Check cache first
        const cachedResult = await checkStageBCache(item.contentHash);
        let result: StageBOutput;

        if (cachedResult) {
            console.log(`[AI Stage B] Using cached result for content hash: ${item.contentHash.substring(0, 16)}`);
            result = cachedResult;
        } else {
            // Build prompt
            const prompt = buildStageBPrompt({
                title: item.title,
                content: item.article.truncatedContent,
                sourceName: item.source.name,
                topicTags: stageAResult.topicTags,
                importanceScore: stageAResult.importanceScore || 50,
                oneLineSummary: stageAResult.oneLineSummary || '',
            });

            // Call OpenAI
            result = await callStageB(prompt);
            console.log(`[AI Stage B] Generated Vietnamese summary (${result.bullets.length} bullets)`);
        }

        // Save AI result
        await prisma.aiResult.create({
            data: {
                itemId: item.id,
                stage: 'B',
                summary: result.summary,
                bullets: result.bullets,
                whyItMatters: result.whyItMatters,
                riskFlags: result.riskFlags,
                suggestedHashtags: result.suggestedHashtags,
                model: AI_CONFIG.STAGE_B_MODEL,
            },
        });

        // Update item status
        await prisma.item.update({
            where: { id: itemId },
            data: { status: ItemStatus.AI_STAGE_B_DONE },
        });

        // Auto-trigger digest generation for tomorrow
        console.log(`[AI Stage B] Item ${itemId} completed, triggering digest generation...`);
        try {
            const { generateTomorrowPosts } = await import('./digest.service.js');
            // Run async without waiting
            generateTomorrowPosts().catch(err => {
                console.error('[AI Stage B] Auto-digest trigger error:', err);
            });
        } catch (err) {
            console.error('[AI Stage B] Failed to trigger digest:', err);
        }

        return { success: true };
    } catch (error: any) {
        console.error(`[AI Stage B] Error processing item ${itemId}:`, error);
        return { success: false, error: error.message };
    }
}

/**
 * Process all AI_STAGE_A_DONE items through Stage B (batch)
 */
export async function processStageBBatch(limitPerBatch = 3): Promise<{
    processed: number;
    errors: number;
}> {
    const items = await prisma.item.findMany({
        where: {
            status: ItemStatus.AI_STAGE_A_DONE,
            aiResults: {
                some: {
                    stage: 'A',
                    isAllowed: true,
                },
            },
        },
        take: limitPerBatch,
        select: { id: true },
    });

    console.log(`[AI Stage B] Processing ${items.length} items`);

    let processed = 0;
    let errors = 0;

    for (const item of items) {
        const result = await processStageB(item.id);
        if (result.success) {
            processed++;
        } else {
            errors++;
        }

        // Rate limiting: delay between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`[AI Stage B] Batch complete: ${processed} processed, ${errors} errors`);

    return { processed, errors };
}
