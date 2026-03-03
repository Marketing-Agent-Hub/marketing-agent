import { openai, AI_CONFIG } from '../config/ai.config.js';
import { prisma } from '../db/index.js';
import { ItemStatus } from '@prisma/client';
import { env } from '../config/env.js';

interface StageBOutput {
    fullArticle: string; // Complete Facebook post with all content
}

/**
 * Get language-specific instructions
 */
function getLanguageInstructions(lang: string): {
    languageName: string;
    writingStyle: string;
    articleStructure: string;
} {
    const instructions: Record<string, any> = {
        vi: {
            languageName: 'Vietnamese',
            writingStyle: 'Viết như Facebook post tự nhiên, dễ đọc. Giọng văn rõ ràng, có cấu trúc, phân tích ngắn gọn. KHÔNG hype, giật tít, FOMO, quá casual hoặc quá academic. KHÔNG kể chuyện lan man.',
            articleStructure: `
📋 CẤU TRÚC BÀI ĐĂNG FACEBOOK (BẮT BUỘC):

1️⃣ TITLE (dòng đầu tiên)
   **In đậm**
   Có 1-2 emoji phù hợp
   Tóm tắt insight chính
   KHÔNG giật tít

______________

2️⃣ MỞ BÀI (2-4 câu)
   Giới thiệu vấn đề ngắn gọn
   Tạo context cho nội dung

______________

3️⃣ NỘI DUNG CHÍNH
   Emoji + Subheading
   • Bullet point
   • Bullet point  
   • Bullet point
   
   Emoji + Subheading
   Phân tích ngắn (2-4 câu)

______________

4️⃣ INSIGHT CHÍNH
   Emoji + Insight quan trọng
   1-2 câu nêu ý nghĩa/tác động

______________

5️⃣ CÂU HỎI MỞ
   Khuyến khích thảo luận
   
6️⃣ HASHTAG (cuối bài)

⚠️ FORMAT RULES:
✓ Mỗi section chính ngăn cách bằng ______________
✓ KHÔNG dùng dấu gạch ngang dài (—)
✓ Paragraph không quá 4 dòng
✓ Line break rõ ràng
✓ Mỗi section lớn bắt đầu bằng emoji
✓ Bullet dùng: • ✔️ 1️⃣ 2️⃣ 3️⃣
✓ Hashtag CHỈ ở cuối bài
✓ KHÔNG chèn link giữa đoạn
✓ KHÔNG viết phong cách báo chí

🎯 TONE: Rõ ràng, có cấu trúc, dễ đọc, phân tích ngắn gọn. Giữ nguyên nội dung cốt lõi, KHÔNG thêm thông tin ngoài input.`,
        },
        en: {
            languageName: 'English',
            writingStyle: 'Write like natural Facebook post, easy to read. Clear voice, structured, concise analysis. NO hype, clickbait, FOMO, too casual or too academic. NO rambling storytelling.',
            articleStructure: `
📋 FACEBOOK POST STRUCTURE (MANDATORY):

1️⃣ TITLE (first line)
   **Bold text**
   1-2 relevant emojis
   Summarize main insight
   NO clickbait

______________

2️⃣ OPENING (2-4 sentences)
   Introduce topic briefly
   Set context

______________

3️⃣ MAIN CONTENT
   Emoji + Subheading
   • Bullet point
   • Bullet point
   • Bullet point
   
   Emoji + Subheading
   Brief analysis (2-4 sentences)

______________

4️⃣ KEY INSIGHT
   Emoji + Main takeaway
   1-2 sentences on impact/meaning

______________

5️⃣ DISCUSSION PROMPT
   Question to encourage engagement
   
6️⃣ HASHTAGS (end of post)

⚠️ FORMAT RULES:
✓ Separate major sections with ______________
✓ NO long dashes (—)
✓ Paragraphs max 4 lines
✓ Clear line breaks
✓ Each major section starts with emoji
✓ Bullets use: • ✔️ 1️⃣ 2️⃣ 3️⃣
✓ Hashtags ONLY at end
✓ NO links mid-paragraph
✓ NO newspaper style

🎯 TONE: Clear, structured, readable, concise analysis. Keep core content integrity, DO NOT add info not in input.`,
        },
        es: {
            languageName: 'Spanish',
            writingStyle: 'Escribe como publicación natural de Facebook, fácil de leer. Voz clara, estructurada, análisis conciso. SIN exageración, clickbait, FOMO, demasiado casual o académico. SIN narrativa divagante.',
            articleStructure: `
📋 ESTRUCTURA POST FACEBOOK (OBLIGATORIO):

1️⃣ TÍTULO (primera línea)
   **Negrita**
   1-2 emojis relevantes
   Resume insight principal
   SIN clickbait

______________

2️⃣ APERTURA (2-4 oraciones)
   Introduce tema brevemente
   Establece contexto

______________

3️⃣ CONTENIDO PRINCIPAL
   Emoji + Subtítulo
   • Punto clave
   • Punto clave
   • Punto clave
   
   Emoji + Subtítulo
   Análisis breve (2-4 oraciones)

______________

4️⃣ INSIGHT CLAVE
   Emoji + Conclusión principal
   1-2 oraciones sobre impacto/significado

______________

5️⃣ PREGUNTA ABIERTA
   Pregunta para fomentar discusión
   
6️⃣ HASHTAGS (final del post)

⚠️ REGLAS DE FORMATO:
✓ Separar secciones mayores con ______________
✓ SIN guiones largos (—)
✓ Párrafos máx 4 líneas
✓ Saltos de línea claros
✓ Cada sección mayor inicia con emoji
✓ Bullets usan: • ✔️ 1️⃣ 2️⃣ 3️⃣
✓ Hashtags SOLO al final
✓ SIN enlaces en medio de párrafos
✓ SIN estilo periodístico

🎯 TONO: Claro, estructurado, legible, análisis conciso. Mantener integridad del contenido, NO agregar información no presente en input.`,
        },
    };

    return instructions[lang] || instructions.en;
}

/**
 * Build AI Stage B prompt
 * Configurable deep analysis based on environment settings
 */
function buildStageBPrompt(item: {
    title: string;
    content: string;
    sourceName: string;
    topicTags: string[];
    importanceScore: number;
    oneLineSummary: string;
}): string {
    const langInstructions = getLanguageInstructions(env.CONTENT_LANGUAGE);
    const focusTopics = env.FOCUS_TOPICS.split(',').map(t => t.trim().toLowerCase());
    const hashtagSuggestions = focusTopics.map(t => `#${t}`).join(' ');

    return `You are a Facebook Content Writing Agent for ${env.APP_NAME}, converting news articles into clear, concise, readable Facebook posts for ${env.TARGET_AUDIENCE}.

⚡ YOUR ONLY TASK: Transform input content into complete Facebook post following standard format.

🎯 CORE RULES:
✓ Keep original content meaning - only restructure for Facebook
✓ DO NOT add information not in input
✓ DO NOT infer beyond data
✓ DO NOT change content meaning
✓ DO NOT skip required format

${langInstructions.writingStyle}

📊 CONTEXT:
Source: ${item.sourceName}
Topic Tags: ${item.topicTags.join(', ')}
Importance: ${item.importanceScore}/100
Quick Summary: ${item.oneLineSummary}

📰 SOURCE ARTICLE:
Title: ${item.title}

Content:
${item.content}

---

${langInstructions.articleStructure}

📏 LENGTH REQUIREMENTS:
Target: 300-450 words
Minimum: 250 words
Maximum: 500 words

🚫 HARD CONSTRAINTS (NEVER DO):
✗ Add information not in input
✗ Add data or statistics not provided
✗ Add names/organizations not in input
✗ Skip discussion prompt (CTA)
✗ Use newspaper/blog writing style
✗ Write overly academic or casual
✗ Use clickbait or FOMO tactics
✗ Ramble or lose focus

✅ CONTENT INTEGRITY:
- Keep core content unchanged
- Only include facts from input
- If info is missing → summarize only what exists
- No speculation or assumptions

📐 EXECUTION LOGIC:
1. Read input content
2. Identify: main topic, key insight, significance
3. Restructure content
4. Rewrite in Facebook format
5. Add discussion prompt
6. Add relevant hashtags
7. Output ONLY the post (no reasoning/explanation)

OUTPUT FORMAT (valid JSON only):
{
  "fullArticle": "Complete Facebook post with TITLE (bold + emoji), opening, structured content with emoji subheadings and bullets, key insight, discussion question, and hashtags at end. Written in ${langInstructions.languageName}. Must follow format rules strictly. Include relevant hashtags from: ${hashtagSuggestions}"
}

🎨 STYLE CHECKLIST:
✓ Title is bold with 1-2 emojis
✓ Use ______________ separator between major sections (after title, opening, main content, key insight)
✓ Clear line breaks between sections
✓ Each major section starts with emoji
✓ Paragraphs are 2-4 lines max
✓ Bullets use • ✔️ 1️⃣ 2️⃣ 3️⃣ only
✓ NO long dashes (—)
✓ NO links mid-paragraph
✓ Hashtags ONLY at the end
✓ Has discussion question before hashtags
✓ Voice is clear, structured, analytical (not hyped)

⚠️ CRITICAL: fullArticle must be COMPLETE Facebook post (300-450 words), ready to copy-paste. NO explanations, NO reasoning text. Just the post itself.

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
                content: `You are a Facebook Content Writing Agent converting articles to ${getLanguageInstructions(env.CONTENT_LANGUAGE).languageName} Facebook posts. Follow format rules strictly. Respond only with valid JSON.`,
            },
            {
                role: 'user',
                content: prompt,
            },
        ],
        temperature: 0.7,
        max_tokens: 2500, // Increased for full article
        response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
        throw new Error('No response from OpenAI');
    }

    const parsed = JSON.parse(content) as StageBOutput;

    // Validate response structure
    if (!parsed.fullArticle || parsed.fullArticle.length < 100) {
        throw new Error('Invalid response: missing or too short fullArticle');
    }

    return {
        fullArticle: parsed.fullArticle,
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
            fullArticle: true,
        },
    });

    if (!existingResult) {
        return null;
    }

    return {
        fullArticle: existingResult.fullArticle || '',
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
            console.log(`[AI Stage B] Generated Facebook post (${result.fullArticle.length} chars)`);
        }

        // Save AI result
        await prisma.aiResult.create({
            data: {
                itemId: item.id,
                stage: 'B',
                fullArticle: result.fullArticle,
                model: AI_CONFIG.STAGE_B_MODEL,
            },
        });

        // Update item status
        await prisma.item.update({
            where: { id: itemId },
            data: { status: ItemStatus.AI_STAGE_B_DONE },
        });

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

