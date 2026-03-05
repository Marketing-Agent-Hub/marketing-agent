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
        writingStyle: 'Viết như Facebook post tự nhiên, dễ đọc nhưng ĐẦY ĐỦ NỘI DUNG. Giọng văn rõ ràng, có cấu trúc, phân tích đầy đủ các điểm quan trọng từ bài báo. KHÔNG bỏ sót thông tin chính. KHÔNG hype, giật tít, FOMO, quá casual hoặc quá academic.',
        articleStructure: `
📋 CẤU TRÚC BÀI ĐĂNG FACEBOOK (BẮT BUỘC):

1️⃣ TITLE (dòng đầu tiên)
   Có 1-2 emoji phù hợp
   Viết TIÊU ĐỀ BẰNG CHỮ HOA để nổi bật
   Tóm tắt insight chính
   KHÔNG giật tít

______________

2️⃣ MỞ BÀI (3-5 câu)
   Giới thiệu vấn đề, tạo context
   Nêu tầm quan trọng/lý do đáng quan tâm

______________

3️⃣ NỘI DUNG CHÍNH (PHẦN DÀI NHẤT - BẮT BUỘC ĐẦY ĐỦ)
   
   ⚠️ QUAN TRỌNG: Phải cover TẤT CẢ điểm chính từ bài báo gốc
   
   🔹 Chia thành 3-5 sections nhỏ, mỗi section:
   
   Emoji + Subheading ngắn gọn
   • Bullet point 1: thông tin cụ thể
   • Bullet point 2: chi tiết quan trọng
   • Bullet point 3: số liệu/ví dụ (nếu có)
   Phân tích ngắn 2-3 câu giải thích ý nghĩa
   
   🔹 Hoặc viết dạng paragraph:
   
   Emoji + Subheading
   Phân tích chi tiết 3-5 câu, giải thích rõ vấn đề, nguyên nhân, tác động, hoặc các khía cạnh quan trọng. Đảm bảo đầy đủ thông tin từ bài gốc.
   
   🎯 MỤC TIÊU: Người đọc hiểu ĐẦY ĐỦ vấn đề mà KHÔNG CẦN đọc bài gốc

______________

4️⃣ INSIGHT/KẾT LUẬN CHÍNH (2-3 câu)
   Emoji + Tổng kết insight quan trọng nhất
   Nêu ý nghĩa, tác động thực tế

______________

5️⃣ CÂU HỎI MỞ
   Khuyến khích thảo luận về chủ đề
   
6️⃣ HASHTAG (cuối bài)
   3-5 hashtags liên quan bằng tiếng Anh

⚠️ FORMAT RULES - BẮT BUỘC:
✓ PLAIN TEXT thuần túy - TUYỆT ĐỐI KHÔNG DÙNG markdown (**__#)
✓ Nhấn mạnh bằng CHỮ HOA hoặc EMOJI, không dùng markdown
✓ Mỗi section chính ngăn cách bằng ______________
✓ KHÔNG dùng dấu gạch ngang dài (—)
✓ Paragraph tối đa 4-5 dòng
✓ Line break rõ ràng giữa các phần
✓ Bullets: • ✔️ 1️⃣ 2️⃣ 3️⃣ (KHÔNG dùng -)
✓ Hashtag CHỈ ở cuối bài
✓ KHÔNG chèn link giữa đoạn

🎯 NỘI DUNG: Đầy đủ, rõ ràng, có cấu trúc. Cover TẤT CẢ thông tin quan trọng từ bài gốc. KHÔNG bỏ sót điểm chính.`,
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

    return `Bạn là AI chuyên viết bài đăng Facebook tiếng Việt, chuyển đổi tin tức thành bài đăng ĐẦY ĐỦ NỘI DUNG, rõ ràng, súc tích cho người Việt.

⚡ NHIỆM VỤ: Chuyển tin tức thành bài đăng Facebook hoàn chỉnh với ĐẦY ĐỦ thông tin quan trọng từ bài gốc.

🎯 QUY TẮC CỐT LÕI:
✓ Cover TẤT CẢ điểm chính, thông tin quan trọng từ bài gốc
✓ Giữ nguyên ý nghĩa - chỉ tái cấu trúc cho Facebook
✓ KHÔNG bỏ sót thông tin quan trọng
✓ KHÔNG thêm thông tin không có trong input
✓ KHÔNG suy diễn ngoài dữ liệu có sẵn
✓ Viết đầy đủ nhưng không lan man

${instructions.writingStyle}

📰 BÀI BÁO GỐC:
Nguồn: ${item.sourceName}
Tiêu đề: ${item.title}

Nội dung:
${item.content}

---

${instructions.articleStructure}

📏 YÊU CẦU ĐỘ DÀI:
Mục tiêu: 400-600 từ (phù hợp Facebook)
Tối thiểu: 350 từ (đảm bảo đầy đủ nội dung)
Tối đa: 700 từ (không quá dài)

⚠️ PHẦN NỘI DUNG CHÍNH phải chiếm 60-70% bài viết, chia làm 3-5 sections nhỏ để cover đầy đủ bài báo.

🚫 CẤM TUYỆT ĐỐI:
✗ Bỏ sót điểm quan trọng từ bài gốc
✗ Viết quá ngắn, thiếu thông tin (chỉ 2-3 dòng thân bài)
✗ Thêm thông tin không có trong input
✗ Thêm số liệu không được cung cấp
✗ Bỏ câu hỏi mở (CTA)
✗ Viết phong cách báo chí hoặc blog
✗ Dùng clickbait/FOMO
✗ Viết lan man, lặp lại, mất focus

✅ CHECKLIST NỘI DUNG:
1. Đọc kỹ toàn bộ bài báo gốc
2. Xác định TẤT CẢ điểm chính (thường 3-5 điểm)
3. Đảm bảo mỗi điểm chính được giải thích rõ ràng
4. Bao gồm: nguyên nhân, tác động, ý nghĩa (nếu bài gốc có)
5. Người đọc hiểu đầy đủ mà KHÔNG cần đọc bài gốc
6. Độ dài phù hợp: 400-600 từ

📐 QUY TRÌNH VIẾT:
1. Đọc và phân tích toàn bộ nội dung input
2. List ra 3-5 điểm chính cần cover
3. Viết tiêu đề hấp dẫn (VIẾT HOA + emoji)
4. Mở bài: context và tầm quan trọng (3-5 câu)
5. Thân bài: 3-5 sections, mỗi section giải thích 1 điểm chính
   - Dùng emoji subheading
   - Bullets hoặc paragraph (3-5 câu)
   - Đảm bảo đầy đủ thông tin
6. Kết luận: insight chính (2-3 câu)
7. Câu hỏi mở để thảo luận
8. Hashtags (3-5 hashtags, tự generate)
9. Kiểm tra: Đã cover hết các điểm chính chưa?

OUTPUT FORMAT (valid JSON only):
{
  "fullArticle": "Bài đăng Facebook HOÀN CHỈNH với TIÊU ĐỀ VIẾT HOA + EMOJI, mở bài, NỘI DUNG CHÍNH ĐẦY ĐỦ (3-5 sections với emoji subheadings, bullets/paragraphs chi tiết), insight chính, câu hỏi thảo luận, và hashtags. Tiếng Việt. PLAIN TEXT thuần. 400-600 từ. Tự generate hashtags."
}

🎨 CHECKLIST PHONG CÁCH:
✓ Tiêu đề: VIẾT HOA + 1-2 emoji (VD: 🚀 CÔNG NGHỆ MỚI THAY ĐỔI GIÁO DỤC)
✓ PLAIN TEXT - TUYỆT ĐỐI KHÔNG ** __ # hay markdown
✓ Nhấn mạnh: CHỮ HOA hoặc emoji (KHÔNG markdown)
✓ Ngăn cách sections: ______________
✓ Thân bài: 3-5 sections, mỗi section chi tiết
✓ Bullets: • ✔️ 1️⃣ 2️⃣ 3️⃣ (KHÔNG dùng -)
✓ Paragraph: 3-5 dòng (không quá ngắn)
✓ Line break rõ ràng
✓ KHÔNG dùng dấu gạch ngang dài (—)
✓ Hashtags ở cuối (3-5 hashtags)
✓ Có câu hỏi thảo luận

📊 VÍ DỤ CẤU TRÚC THÂN BÀI TỐT:

3️⃣ NỘI DUNG CHÍNH

______________

🔹 Vấn đề hiện tại
Giải thích tình hình, bối cảnh, lý do xuất hiện vấn đề. Đưa ra số liệu, dẫn chứng cụ thể từ bài báo. Phân tích tác động đến người dân hoặc xã hội.

🔹 Nguyên nhân chính
• Nguyên nhân 1: giải thích cụ thể
• Nguyên nhân 2: với ví dụ từ bài gốc
• Nguyên nhân 3: nếu có
Phân tích tại sao những nguyên nhân này quan trọng.

🔹 Giải pháp được đề xuất
Trình bày chi tiết các giải pháp, kế hoạch, hoặc hành động được nhắc đến trong bài. Đưa ra timeline, responsible parties nếu bài có.

🔹 Tác động và triển vọng
Phân tích tác động dự kiến đến các bên liên quan. Đánh giá triển vọng, thách thức còn lại cần xem xét.

⚠️ QUAN TRỌNG: fullArticle phải là bài đăng Facebook HOÀN CHỈNH (400-600 từ) với ĐẦY ĐỦ NỘI DUNG từ bài gốc, sẵn sàng copy-paste. KHÔNG giải thích, KHÔNG reasoning. CHỈ bài post.

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
                content: `Bạn là AI chuyên viết bài đăng Facebook tiếng Việt ĐẦY ĐỦ NỘI DUNG. Tuân thủ format rules nghiêm ngặt. Chỉ trả về valid JSON. Đảm bảo cover TẤT CẢ điểm chính từ bài gốc.`,
            },
            {
                role: 'user',
                content: prompt,
            },
        ],
        temperature: 0.7,
        max_tokens: 3500, // Increased to allow 400-600 word articles (Vietnamese uses more tokens)
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

