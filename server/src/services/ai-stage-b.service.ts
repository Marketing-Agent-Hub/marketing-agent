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
        writingStyle: `
Viết như một Facebook post tiếng Việt tự nhiên, rõ ràng, dễ đọc và giống người thật biên tập lại tin tức.

Yêu cầu giọng văn:
- Tự nhiên, mạch lạc, sáng sủa
- Đủ ý nhưng không rườm rà
- Linh hoạt theo từng loại tin: tin ngắn viết gọn, tin nhiều dữ kiện viết đầy đủ hơn
- Nghe như admin/editor social đang tóm tắt và giải thích tin cho người đọc
- Không viết như báo cáo, giáo trình, bản tin truyền hình hay bài blog SEO

Tránh:
- Giọng văn khuôn mẫu, sáo, quá “AI”
- Dùng các nhãn mục cứng như “KẾT LUẬN”, “NGUYÊN NHÂN CHÍNH”, “TÁC ĐỘNG DỰ KIẾN”, “GIẢI PHÁP”
- Mở bài chung chung, ít thông tin
- Lặp ý để kéo dài bài
- Chia section máy móc cho mọi loại tin
- Hype, giật tít, FOMO hoặc thêm cảm xúc quá đà
`,
        articleStructure: `
FORMAT BẮT BUỘC:

1. Dòng đầu tiên:
- Là 1 câu mở đầu/tiêu đề ngắn
- Có thể dùng 1-2 emoji phù hợp
- Viết nổi bật, dễ hiểu
- Không bắt buộc IN HOA toàn bộ
- Không giật tít

2. Separator:
______________

3. Phần thân bài:
- Viết theo flow tự nhiên
- Linh hoạt số đoạn tùy lượng thông tin của bài gốc
- Mỗi đoạn nên ngắn, dễ đọc trên Facebook
- Có thể dùng bullet nếu thật sự giúp rõ ý hơn
- Nếu bài gốc ngắn, thân bài có thể chỉ cần 1-2 đoạn
- Nếu bài gốc dài hoặc nhiều ý, thân bài có thể triển khai dài hơn
- Ưu tiên giải thích rõ điều gì đang xảy ra, chi tiết đáng chú ý, nguyên nhân, tác động hoặc ý nghĩa nếu bài gốc có

4. Separator:
______________

5. Phần chốt:
- 1-3 câu chốt tự nhiên
- Tóm lại điểm đáng chú ý nhất hoặc điều người đọc nên lưu ý
- Có thể thêm câu hỏi mở nếu phù hợp với chủ đề
- Không bắt buộc lúc nào cũng phải có câu hỏi mở

6. Hashtag:
- 3-5 hashtag tiếng Anh ở cuối bài nếu phù hợp

FORMAT RULES:
- PLAIN TEXT thuần túy
- Không dùng markdown: ** __ #
- Có emoji nhưng dùng vừa phải
- Có xuống dòng hợp lý để dễ đọc
- Dùng separator: ______________
- Không chèn link giữa bài
- Hashtag chỉ ở cuối bài

MỤC TIÊU:
Giữ đúng nội dung cốt lõi của bài gốc, nhưng trình bày lại theo cách dễ đọc, tự nhiên và linh hoạt theo độ dài/thể loại tin.`,
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

    return `Bạn là AI chuyên biên tập tin tức thành bài đăng Facebook tiếng Việt tự nhiên, rõ ràng và linh hoạt theo từng loại nội dung.

NHIỆM VỤ:
Chuyển bài báo gốc thành một Facebook post hoàn chỉnh bằng tiếng Việt.

MỤC TIÊU CỐT LÕI:
- Giữ đúng ý nghĩa của bài gốc
- Cover đủ các thông tin quan trọng có trong input
- Không thêm dữ kiện, số liệu, suy diễn hoặc nhận định không có trong input
- Viết lại theo văn phong social tự nhiên, mạch lạc, dễ đọc
- Linh hoạt theo độ dài và độ phức tạp của bài gốc
- Tin ngắn thì viết ngắn gọn
- Tin nhiều ý thì viết đầy đủ hơn
- Không kéo dài chỉ để đủ số từ

${instructions.writingStyle}

THÔNG TIN ĐẦU VÀO:
Nguồn: ${item.sourceName}
Tiêu đề: ${item.title}

Nội dung gốc:
${item.content}

${instructions.articleStructure}

HƯỚNG DẪN TRIỂN KHAI:
- Mở vào vấn đề nhanh, tránh vòng vo
- Ưu tiên flow tự nhiên như người thật viết
- Không bắt buộc chia section nội dung cứng
- Chỉ dùng bullet khi thông tin dạng liệt kê sẽ rõ hơn
- Nếu bài gốc thiên về diễn biến, hãy kể theo diễn biến
- Nếu bài gốc thiên về phân tích, hãy làm rõ nguyên nhân, tác động, ý nghĩa
- Nếu bài gốc rất ngắn, bài post cũng nên ngắn gọn tương ứng
- Nếu bài gốc dài và nhiều lớp thông tin, bài post có thể dài hơn nhưng vẫn phải gọn và dễ đọc

QUY TẮC CHỐNG VĂN AI:
- Không dùng các nhãn mục cứng như “KẾT LUẬN”, “NGUYÊN NHÂN CHÍNH”, “TÁC ĐỘNG DỰ KIẾN”, “GIẢI PHÁP VÀ TRIỂN VỌNG”
- Không lặp lại cùng một ý theo nhiều cách
- Không viết các câu chung chung chỉ để làm đầy bài
- Không biến mọi tin thành cùng một template
- Không dùng giọng văn quá trang trọng hoặc quá công thức
- Không mở bài kiểu sáo rỗng như “đang thu hút sự chú ý”, “đang đối mặt với biến động lớn”, “đây là vấn đề đáng quan tâm”

ĐỘ DÀI LINH HOẠT:
- Tin rất ngắn: khoảng 120-220 từ
- Tin mức trung bình: khoảng 220-400 từ
- Tin nhiều dữ kiện / nhiều ý: khoảng 400-650 từ
- Chọn độ dài phù hợp với lượng thông tin thực tế trong input

OUTPUT FORMAT (valid JSON only):
{
  "fullArticle": "Facebook post hoàn chỉnh bằng tiếng Việt, plain text, có emoji, có line break hợp lý, có separator, tự nhiên, mạch lạc, sẵn sàng copy-paste."
}

Chỉ trả về JSON hợp lệ, không kèm giải thích.`;
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
                content: `Bạn là AI chuyên viết lại tin tức thành bài đăng Facebook tiếng Việt tự nhiên, dễ đọc và linh hoạt theo độ dài/thể loại của nội dung gốc. Ưu tiên sự mạch lạc và cảm giác người thật viết. Giữ đúng nội dung input, không thêm thông tin ngoài dữ liệu đã cho. Chỉ trả về valid JSON.`,
            },
            {
                role: 'user',
                content: prompt,
            },
        ],
        temperature: 0.75,
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

