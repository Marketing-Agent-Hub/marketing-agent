import { openai, AI_CONFIG } from '../config/ai.config.js';
import { prisma } from '../db/index.js';
import { ItemStatus } from '@prisma/client';

interface StageBOutput {
    fullArticle: string; // Complete Facebook post with all content
}

/**
 * Get Vietnamese language instructions for Facebook post
 */
function getVietnameseInstructions(): {
    languageName: string;
    writingStyle: string;
    articleStructure: string;
} {
    return {
        languageName: 'Vietnamese',
        writingStyle: 'Viết như Facebook post tự nhiên, dễ đọc. Giọng văn rõ ràng, có cấu trúc, phân tích ngắn gọn. KHÔNG hype, giật tít, FOMO, quá casual hoặc quá academic. KHÔNG kể chuyện lan man.',
        articleStructure: `
📋 CẤU TRÚC BÀI ĐĂNG FACEBOOK (BẮT BUỘC):

1️⃣ TITLE (dòng đầu tiên)
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
✓ Đây là bài viết facebook không phải markdown, không dùng các format **in đậm** và những thứ tương tự
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
    };
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
    const instructions = getVietnameseInstructions();

    return `Bạn là AI chuyên viết bài đăng Facebook tiếng Việt, chuyển đổi tin tức thành bài đăng rõ ràng, súc tích cho người Việt.

⚡ NHIỆM VỤ: Chuyển tin tức thành bài đăng Facebook hoàn chỉnh theo format chuẩn.

🎯 QUY TẮC CỐT LÕI:
✓ Giữ nguyên ý nghĩa nội dung gốc - chỉ tái cấu trúc cho Facebook
✓ KHÔNG thêm thông tin không có trong input
✓ KHÔNG suy diễn ngoài dữ liệu
✓ KHÔNG thay đổi ý nghĩa nội dung
✓ KHÔNG bỏ format yêu cầu

${instructions.writingStyle}

� BÀI BÁO GỐC:
Nguồn: ${item.sourceName}
Tiêu đề: ${item.title}

Nội dung:
${item.content}

---

${instructions.articleStructure}

📏 YÊU CẦU ĐỘ DÀI:
Mục tiêu: 300-450 từ
Tối thiểu: 250 từ
Tối đa: 500 từ

🚫 CẤM TUYỆT ĐỐI:
✗ Thêm thông tin không có trong input
✗ Thêm số liệu hoặc thống kê không được cung cấp
✗ Thêm tên người/tổ chức không có trong input
✗ Bỏ câu hỏi mở (CTA)
✗ Viết phong cách báo chí/blog
✗ Viết quá academic hoặc quá casual
✗ Dùng clickbait hoặc FOMO
✗ Viết lan man mất focus

✅ TÍNH TOÀN VẸN NỘI DUNG:
- Giữ nguyên nội dung cốt lõi
- Chỉ bao gồm sự kiện từ input
- Nếu thiếu thông tin → chỉ tóm tắt những gì có
- Không suy đoán hay giả định

📐 QUY TRÌNH:
1. Đọc nội dung input
2. Xác định: chủ đề chính, insight quan trọng, ý nghĩa
3. Tái cấu trúc nội dung
4. Viết lại theo format Facebook
5. Thêm câu hỏi mở
6. Thêm hashtag liên quan (tự generate dựa trên nội dung)
7. Output CHỈ bài post (không giải thích/reasoning)

OUTPUT FORMAT (valid JSON only):
{
  "fullArticle": "Bài đăng Facebook hoàn chỉnh với TIÊU ĐỀ (in đậm + emoji), mở bài, nội dung có cấu trúc với emoji subheadings và bullets, insight chính, câu hỏi thảo luận, và hashtags ở cuối. Viết bằng tiếng Việt. Phải tuân thủ format rules nghiêm ngặt. Tự generate hashtags phù hợp với nội dung."
}

🎨 CHECKLIST PHONG CÁCH:
✓ Tiêu đề in đậm với 1-2 emojis
✓ Dùng ______________ ngăn cách giữa các section chính (sau tiêu đề, mở bài, nội dung chính, insight chính)
✓ Line break rõ ràng giữa các phần
✓ Mỗi section lớn bắt đầu bằng emoji
✓ Đoạn văn tối đa 2-4 dòng
✓ Bullets chỉ dùng • ✔️ 1️⃣ 2️⃣ 3️⃣
✓ KHÔNG dùng dấu gạch ngang dài (—)
✓ KHÔNG chèn link giữa đoạn
✓ Hashtags CHỈ ở cuối bài
✓ Có câu hỏi thảo luận trước hashtags
✓ Giọng văn rõ ràng, có cấu trúc, phân tích (không hype)

⚠️ QUAN TRỌNG: fullArticle phải là bài đăng Facebook HOÀN CHỈNH (300-450 từ), sẵn sàng copy-paste. KHÔNG giải thích, KHÔNG reasoning. Chỉ bài post.

Chỉ trả về JSON, không kèm text khác.`;
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
                content: `Bạn là AI chuyên viết bài đăng Facebook tiếng Việt. Tuân thủ format rules nghiêm ngặt. Chỉ trả về valid JSON.`,
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

