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
 * Select top items for digest (15-20 items for individual posts)
 */
function selectTopItems(items: ItemWithScore[], minItems = 15, maxItems = 20): ItemWithScore[] {
    const scored = calculateScoresWithDiversity(items);

    // Take between minItems and maxItems
    const count = Math.min(Math.max(scored.length, minItems), maxItems);
    return scored.slice(0, count);
}

/**
 * Generate hook text for single item (Vietnamese)
 */
function generateHookForItem(item: ItemWithScore): string {
    const tags = item.stageAResult.topicTags;

    // Pick emoji based on topic
    let emoji = '📰';
    if (tags.includes('education') || tags.includes('edtech')) emoji = '🎓';
    else if (tags.includes('blockchain-tech')) emoji = '⛓️';
    else if (tags.includes('web3')) emoji = '🌐';
    else if (tags.includes('open-campus')) emoji = '🏛️';
    else if (tags.includes('policy')) emoji = '📜';
    else if (tags.includes('research')) emoji = '🔬';

    // Generate short hook based on title/summary
    const hooks = [
        `${emoji} ${item.title}`,
        `${emoji} **${item.sourceName}**: ${item.title}`,
    ];

    return hooks[0];
}

/**
 * Generate article body for single item (Vietnamese)
 */
function generateArticleBody(item: ItemWithScore): string {
    const summary = item.stageBResult.summary;
    const bullets = item.stageBResult.bullets;

    // Main content: summary as paragraph(s)
    let body = `${summary}\n\n`;

    // Add bullets as highlights
    if (bullets && bullets.length > 0) {
        body += `📌 **Điểm nổi bật:**\n`;
        bullets.forEach(bullet => {
            body += `• ${bullet}\n`;
        });
        body += '\n';
    }

    return body;
}

/**
 * Generate OCVN Take for single item (Vietnamese)
 */
function generateOcvnTakeForItem(item: ItemWithScore): string {
    // Use AI's whyItMatters if available
    if (item.stageBResult.whyItMatters && item.stageBResult.whyItMatters.trim().length > 0) {
        return `💡 **OCVN góc nhìn**: ${item.stageBResult.whyItMatters}`;
    }

    // Fallback based on topic tags
    const tags = item.stageAResult.topicTags;

    if (tags.includes('education') || tags.includes('edtech')) {
        return '💡 **OCVN góc nhìn**: Xu hướng này cho thấy giáo dục đang chuyển đổi mạnh mẽ với công nghệ. Cơ hội lớn cho builder trong cộng đồng!';
    }
    if (tags.includes('blockchain-tech')) {
        return '💡 **OCVN góc nhìn**: Phát triển hạ tầng blockchain mở ra nhiều khả năng mới. Đây là lúc để chúng ta thử nghiệm và đổi mới!';
    }
    if (tags.includes('web3')) {
        return '💡 **OCVN góc nhìn**: Web3 đang định hình lại cách chúng ta tương tác với internet. OCVN đồng hành cùng các builder!';
    }
    if (tags.includes('policy')) {
        return '💡 **OCVN góc nhìn**: Chính sách rõ ràng hơn là tín hiệu tốt cho sự phát triển bền vững. Cộng đồng cần theo sát!';
    }

    return '💡 **OCVN góc nhìn**: Thông tin hữu ích cho cộng đồng builder. Cùng học hỏi và phát triển!';
}

/**
 * Generate source attribution (Vietnamese)
 */
function generateSourceAttribution(item: ItemWithScore): string {
    return `🔗 **Nguồn**: ${item.sourceName}\n📎 ${item.link}`;
}

/**
 * Get hashtags for single item
 */
function getHashtagsForItem(item: ItemWithScore): string[] {
    const ocvnTags = ['ocvn', 'opencampus', 'educampus'];
    const itemTags = item.stageBResult.suggestedHashtags
        .map(tag => tag.toLowerCase().replace(/^#/, ''))
        .filter(tag => !ocvnTags.includes(tag))
        .slice(0, 5); // Top 5 from AI

    return [...ocvnTags, ...itemTags];
}

/**
 * Format post content for single item
 */
function formatSingleItemPost(item: ItemWithScore): {
    content: string;
    hookText: string;
    bulletsText: string;
    ocvnTakeText: string;
    ctaText: string;
    hashtags: string[];
} {
    const hook = generateHookForItem(item);
    const body = generateArticleBody(item);
    const ocvnTake = generateOcvnTakeForItem(item);
    const source = generateSourceAttribution(item);
    const hashtags = getHashtagsForItem(item);
    const hashtagsStr = hashtags.map(tag => `#${tag}`).join(' ');

    const content = `${hook}

${body}${ocvnTake}

${source}

${hashtagsStr}`;

    return {
        content,
        hookText: hook,
        bulletsText: body, // Article body in bullets field
        ocvnTakeText: ocvnTake,
        ctaText: source, // Source attribution in CTA field
        hashtags,
    };
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

    if (readyItems.length < 15) {
        console.warn(`[Digest] Not enough items (need 15, have ${readyItems.length}). Skipping generation.`);
        return;
    }

    // Select top items (15-20 items for individual posts)
    const selectedItems = selectTopItems(readyItems);
    console.log(`[Digest] Selected ${selectedItems.length} items for individual posts`);

    // Distribute items across time slots evenly
    const postsCount = selectedItems.length;
    const postsPerSlot = Math.ceil(postsCount / TIME_SLOTS_ORDER.length);

    let itemIndex = 0;
    let totalPostsCreated = 0;

    // Create individual post for EACH item
    for (let slotIndex = 0; slotIndex < TIME_SLOTS_ORDER.length; slotIndex++) {
        const timeSlot = TIME_SLOTS_ORDER[slotIndex];
        const itemsForSlot = selectedItems.slice(itemIndex, itemIndex + postsPerSlot);

        if (itemsForSlot.length === 0) {
            break;
        }

        // Create one post per item in this slot
        for (const item of itemsForSlot) {
            const postContent = formatSingleItemPost(item);

            // Create post
            const post = await prisma.dailyPost.create({
                data: {
                    targetDate,
                    timeSlot,
                    content: postContent.content,
                    hookText: postContent.hookText,
                    bulletsText: postContent.bulletsText,
                    ocvnTakeText: postContent.ocvnTakeText,
                    ctaText: postContent.ctaText,
                    hashtags: postContent.hashtags,
                    status: 'DRAFT',
                },
            });

            // Create post-item relation (1 item per post)
            await prisma.postItem.create({
                data: {
                    postId: post.id,
                    itemId: item.id,
                },
            });

            // Update item status
            await prisma.item.update({
                where: { id: item.id },
                data: { status: 'USED_IN_POST' },
            });

            totalPostsCreated++;
            console.log(`[Digest] Created post ${totalPostsCreated}/${postsCount} (${timeSlot}): ${item.title.substring(0, 60)}...`);
        }

        itemIndex += itemsForSlot.length;
    }

    console.log(`[Digest] Successfully generated ${totalPostsCreated} individual posts for ${targetDate.toISOString().split('T')[0]}`);
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

