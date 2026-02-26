import { PrismaClient, TimeSlot } from '@prisma/client';

const prisma = new PrismaClient();

interface ItemWithScore {
    id: number;
    sourceId: number;
    sourceName: string;
    trustScore: number;
    title: string;
    link: string;
    publishedAt: Date | null;
    stageAResult: {
        importanceScore: number;
        topicTags: string[];
    };
    stageBResult: {
        summary: string;
        bullets: string[];
        whyItMatters: string;
        suggestedHashtags: string[];
    };
    finalScore: number;
}

const TIME_SLOTS_ORDER: TimeSlot[] = ['MORNING_1', 'MORNING_2', 'NOON', 'EVENING_1', 'EVENING_2'];

/**
 * Fetch items ready for digest (AI_STAGE_B_DONE)
 */
async function fetchReadyItems(): Promise<ItemWithScore[]> {
    const items = await prisma.item.findMany({
        where: {
            status: 'AI_STAGE_B_DONE',
        },
        include: {
            source: {
                select: {
                    id: true,
                    name: true,
                    trustScore: true,
                },
            },
            aiResults: {
                where: {
                    stage: { in: ['A', 'B'] },
                },
                orderBy: {
                    createdAt: 'desc',
                },
            },
        },
        orderBy: {
            publishedAt: 'desc',
        },
    });

    // Transform and filter items
    const itemsWithScores: ItemWithScore[] = [];

    for (const item of items) {
        const stageA = item.aiResults.find(r => r.stage === 'A');
        const stageB = item.aiResults.find(r => r.stage === 'B');

        // Skip if missing AI results
        if (!stageA || !stageB || !stageA.importanceScore) {
            continue;
        }

        // Skip if not allowed by Stage A
        if (stageA.isAllowed !== true) {
            continue;
        }

        // Skip if Stage B summary/bullets are missing
        if (!stageB.summary || !stageB.bullets || stageB.bullets.length === 0) {
            continue;
        }

        itemsWithScores.push({
            id: item.id,
            sourceId: item.source.id,
            sourceName: item.source.name,
            trustScore: item.source.trustScore,
            title: item.title,
            link: item.link,
            publishedAt: item.publishedAt,
            stageAResult: {
                importanceScore: stageA.importanceScore,
                topicTags: stageA.topicTags,
            },
            stageBResult: {
                summary: stageB.summary,
                bullets: stageB.bullets,
                whyItMatters: stageB.whyItMatters || '',
                suggestedHashtags: stageB.suggestedHashtags,
            },
            finalScore: 0, // Will be calculated
        });
    }

    return itemsWithScores;
}

/**
 * Calculate final score with diversity penalty
 */
function calculateScoresWithDiversity(items: ItemWithScore[]): ItemWithScore[] {
    const topicCount = new Map<string, number>();
    const sourceCount = new Map<number, number>();

    // Sort by importance score first
    items.sort((a, b) => b.stageAResult.importanceScore - a.stageAResult.importanceScore);

    // Calculate final scores with diversity penalty
    for (const item of items) {
        let score = item.stageAResult.importanceScore;

        // Apply trust score multiplier (70-100 range => 0.7x - 1.0x)
        const trustMultiplier = item.trustScore / 100;
        score = score * trustMultiplier;

        // Apply diversity penalty for repeated topics (10% penalty per repeat)
        for (const tag of item.stageAResult.topicTags) {
            const count = topicCount.get(tag) || 0;
            if (count > 0) {
                score = score * (1 - 0.1 * count);
            }
        }

        // Apply diversity penalty for same source (15% penalty per repeat)
        const sourceUseCount = sourceCount.get(item.sourceId) || 0;
        if (sourceUseCount > 0) {
            score = score * (1 - 0.15 * sourceUseCount);
        }

        item.finalScore = Math.round(score * 100) / 100;

        // Update counts
        for (const tag of item.stageAResult.topicTags) {
            topicCount.set(tag, (topicCount.get(tag) || 0) + 1);
        }
        sourceCount.set(item.sourceId, (sourceCount.get(item.sourceId) || 0) + 1);
    }

    // Sort by final score
    items.sort((a, b) => b.finalScore - a.finalScore);

    return items;
}

/**
 * Select top items for digest (6-10 items)
 */
function selectTopItems(items: ItemWithScore[], minItems = 6, maxItems = 10): ItemWithScore[] {
    const scored = calculateScoresWithDiversity(items);

    // Take between minItems and maxItems
    const count = Math.min(Math.max(scored.length, minItems), maxItems);
    return scored.slice(0, count);
}

/**
 * Generate hook text (Vietnamese)
 */
function generateHook(items: ItemWithScore[]): string {
    const date = new Date();
    const dateStr = date.toLocaleDateString('vi-VN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const hooks = [
        `📚 Tin tức nóng hổi từ thế giới Blockchain & EdTech - ${dateStr}`,
        `🔥 Cập nhật quan trọng dành cho Builder - ${dateStr}`,
        `💡 Những gì bạn cần biết hôm nay trong Web3 Education - ${dateStr}`,
        `🚀 Tóm tắt tin tức hàng đầu cho cộng đồng OCVN - ${dateStr}`,
        `⚡ Điểm tin nhanh: Blockchain, EdTech & Web3 - ${dateStr}`,
    ];

    // Random hook
    return hooks[Math.floor(Math.random() * hooks.length)];
}

/**
 * Generate bullets text (Vietnamese summaries with links)
 */
function generateBullets(items: ItemWithScore[]): string {
    const bullets = items.map((item, index) => {
        const number = index + 1;
        const emoji = ['🎯', '💎', '🔔', '📌', '✨', '🌟', '🎓', '🔗', '📖', '🎪'][index] || '▪️';

        return `${emoji} **${item.sourceName}**: ${item.stageBResult.summary}\n👉 Đọc thêm: ${item.link}`;
    });

    return bullets.join('\n\n');
}

/**
 * Generate OCVN Take text (Vietnamese community perspective)
 */
function generateOcvnTake(items: ItemWithScore[]): string {
    const hasEducation = items.some(i => i.stageAResult.topicTags.includes('education') || i.stageAResult.topicTags.includes('edtech'));
    const hasBlockchain = items.some(i => i.stageAResult.topicTags.includes('blockchain-tech'));
    const hasWeb3 = items.some(i => i.stageAResult.topicTags.includes('web3'));
    const hasPolicy = items.some(i => i.stageAResult.topicTags.includes('policy'));

    const takes = [];

    if (hasEducation) {
        takes.push('💼 **OCVN Take**: Giáo dục đang chuyển mình với công nghệ blockchain - cơ hội lớn cho những builder trong cộng đồng chúng ta. Hãy cùng nhau học hỏi và xây dựng!');
    }
    if (hasBlockchain && hasWeb3) {
        takes.push('🔧 **OCVN Take**: Những phát triển mới trong hạ tầng blockchain và Web3 mở ra nhiều khả năng cho ecosystem giáo dục. Đây là thời điểm tốt để builder như chúng ta thử nghiệm và đổi mới!');
    }
    if (hasPolicy) {
        takes.push('📜 **OCVN Take**: Chính sách và quy định đang dần rõ ràng hơn - tín hiệu tích cực cho sự phát triển bền vững của không gian Web3 Education. Cộng đồng chúng ta cần theo sát để nắm bắt cơ hội!');
    }

    if (takes.length === 0) {
        takes.push('🌐 **OCVN Take**: Thế giới Web3 & EdTech không ngừng phát triển. Cộng đồng OCVN luôn đồng hành cùng các builder để cập nhật kiến thức và tạo ra giá trị thực!');
    }

    return takes[0];
}

/**
 * Generate CTA text (Vietnamese call to action)
 */
function generateCta(): string {
    const ctas = [
        '💬 Bạn nghĩ gì về những tin tức này? Chia sẻ ý kiến của bạn trong nhóm OCVN nhé!\n🔗 Tham gia: [Link to OCVN Community]',
        '🤝 Cùng thảo luận thêm về những chủ đề này tại cộng đồng Open Campus Vietnam!\n🔗 Join ngay: [Link to OCVN Community]',
        '📢 Đừng quên theo dõi OCVN để không bỏ lỡ tin tức mới nhất về Blockchain & EdTech!\n🔗 Community: [Link to OCVN Community]',
        '🎯 Muốn tìm hiểu sâu hơn? Tham gia thảo luận cùng cộng đồng builder OCVN!\n🔗 Tham gia: [Link to OCVN Community]',
    ];

    return ctas[Math.floor(Math.random() * ctas.length)];
}

/**
 * Aggregate hashtags from items
 */
function aggregateHashtags(items: ItemWithScore[]): string[] {
    const hashtagCount = new Map<string, number>();

    for (const item of items) {
        for (const tag of item.stageBResult.suggestedHashtags) {
            const normalized = tag.toLowerCase().replace(/^#/, '');
            hashtagCount.set(normalized, (hashtagCount.get(normalized) || 0) + 1);
        }
    }

    // Sort by frequency
    const sorted = Array.from(hashtagCount.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([tag]) => tag);

    // Always include OCVN tags
    const ocvnTags = ['ocvn', 'opencampus', 'educampus'];

    // Combine: OCVN tags + top 4-7 from items
    const uniqueTags = [...ocvnTags];
    for (const tag of sorted) {
        if (!uniqueTags.includes(tag) && uniqueTags.length < 10) {
            uniqueTags.push(tag);
        }
    }

    return uniqueTags;
}

/**
 * Format full post content
 */
function formatPostContent(
    hook: string,
    bullets: string,
    ocvnTake: string,
    cta: string,
    hashtags: string[]
): string {
    const hashtagsStr = hashtags.map(tag => `#${tag}`).join(' ');

    return `${hook}

${bullets}

${ocvnTake}

${cta}

${hashtagsStr}`;
}

/**
 * Create daily posts for target date
 */
export async function generateDailyPosts(targetDate: Date): Promise<void> {
    console.log(`[Digest] Generating posts for ${targetDate.toISOString().split('T')[0]}`);

    // Check if posts already exist for this date
    const existing = await prisma.dailyPost.findMany({
        where: {
            targetDate: {
                gte: new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()),
                lt: new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + 1),
            },
        },
    });

    if (existing.length > 0) {
        console.log(`[Digest] Posts already exist for ${targetDate.toISOString().split('T')[0]} (${existing.length} posts)`);
        return;
    }

    // Fetch ready items
    const readyItems = await fetchReadyItems();
    console.log(`[Digest] Found ${readyItems.length} items ready for digest`);

    if (readyItems.length < 6) {
        console.warn(`[Digest] Not enough items (need 6, have ${readyItems.length}). Skipping generation.`);
        return;
    }

    // Select top items
    const selectedItems = selectTopItems(readyItems);
    console.log(`[Digest] Selected ${selectedItems.length} items for posts`);

    // Calculate items per post (distribute evenly)
    const totalItems = selectedItems.length;
    const postsCount = TIME_SLOTS_ORDER.length;
    const baseItemsPerPost = Math.floor(totalItems / postsCount);
    const extraItems = totalItems % postsCount;

    let itemIndex = 0;

    // Create posts for each time slot
    for (let i = 0; i < TIME_SLOTS_ORDER.length; i++) {
        const timeSlot = TIME_SLOTS_ORDER[i];
        const itemsForPost = baseItemsPerPost + (i < extraItems ? 1 : 0);
        const postItems = selectedItems.slice(itemIndex, itemIndex + itemsForPost);
        itemIndex += itemsForPost;

        if (postItems.length === 0) {
            continue;
        }

        // Generate content
        const hook = generateHook(postItems);
        const bullets = generateBullets(postItems);
        const ocvnTake = generateOcvnTake(postItems);
        const cta = generateCta();
        const hashtags = aggregateHashtags(postItems);
        const content = formatPostContent(hook, bullets, ocvnTake, cta, hashtags);

        // Create post
        const post = await prisma.dailyPost.create({
            data: {
                targetDate,
                timeSlot,
                content,
                hookText: hook,
                bulletsText: bullets,
                ocvnTakeText: ocvnTake,
                ctaText: cta,
                hashtags,
                status: 'DRAFT',
            },
        });

        // Create post-item relations
        await prisma.postItem.createMany({
            data: postItems.map(item => ({
                postId: post.id,
                itemId: item.id,
            })),
        });

        // Update items status
        await prisma.item.updateMany({
            where: {
                id: { in: postItems.map(i => i.id) },
            },
            data: {
                status: 'USED_IN_POST',
            },
        });

        console.log(`[Digest] Created post ${i + 1}/${TIME_SLOTS_ORDER.length} (${timeSlot}) with ${postItems.length} items`);
    }

    console.log(`[Digest] Successfully generated ${TIME_SLOTS_ORDER.length} posts for ${targetDate.toISOString().split('T')[0]}`);
}

/**
 * Generate posts for tomorrow (called by cron job)
 */
export async function generateTomorrowPosts(): Promise<void> {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    await generateDailyPosts(tomorrow);
}

/**
 * Manual trigger for specific date
 */
export async function generatePostsForDate(dateStr: string): Promise<void> {
    const targetDate = new Date(dateStr);
    targetDate.setHours(0, 0, 0, 0);

    await generateDailyPosts(targetDate);
}
