import { z } from 'zod';
import { SocialPlatform } from '@prisma/client';
import { prisma } from '../../db/index.js';
import { openai } from '../../config/ai.config.js';
import { callAIWorkflow } from '../../shared/marketing/ai-workflow.js';
import { getAIModel } from '../../shared/marketing/settings.js';
import { PROMPT_VERSIONS } from '../../shared/marketing/prompt-versions.js';
import { EditDraftInput } from '../../shared/marketing/schemas/content.schema.js';
import { extractTrendSnippets, normalizeTrendSnippets } from '../../shared/marketing/trend-snippets.js';
import { logger } from '../../lib/logger.js';
import { trendSignalService } from '../content-intelligence/trend-signal.service.js';
import { trendMatchingService } from '../content-intelligence/trend-matching.service.js';

const briefOutputSchema = z.object({
    title: z.string().min(1),
    objective: z.string(),
    keyAngle: z.string(),
    callToAction: z.string(),
    assetDirection: z.string().optional(),
});

const draftOutputSchema = z.object({
    hook: z.string(),
    body: z.string().min(1),
    cta: z.string(),
    hashtags: z.array(z.string()),
});

export class ContentService {
    async generateDailyContent(brandId: number, daysAhead: number): Promise<void> {
        const brand = await prisma.brand.findUnique({
            where: { id: brandId },
            include: { profile: true, pillars: true },
        });
        if (!brand?.profile) return;

        await trendSignalService.refreshRecentTrendSignals(50);
        await trendMatchingService.matchBrandToRecentSignals(brandId);
        const recentTrendMatches = await trendMatchingService.getRecentMatchesForBrand(brandId, 3);

        const cutoff = new Date(Date.now() + daysAhead * 86400000);
        const slots = await prisma.strategySlot.findMany({
            where: { brandId, status: 'PLANNED', scheduledFor: { lte: cutoff } },
            orderBy: { scheduledFor: 'asc' },
        });

        const model = await getAIModel('postGeneration');

        for (const slot of slots) {
            try {
                const pillar = slot.pillarId
                    ? brand.pillars.find(p => p.id === slot.pillarId)
                    : brand.pillars[0];
                const trendContext = normalizeTrendSnippets(recentTrendMatches);
                const selectedTrend = trendContext[0];

                const briefOutput = await callAIWorkflow({
                    workspaceId: brand.workspaceId,
                    brandId,
                    workflow: 'brief-generation',
                    model,
                    promptVersion: PROMPT_VERSIONS.BRIEF_GENERATION,
                    inputSnapshot: {
                        slotId: slot.id,
                        channel: slot.channel,
                        pillarName: pillar?.name,
                        trendContext,
                    },
                    callFn: async () => {
                        const response = await openai.chat.completions.create({
                            model,
                            messages: [{
                                role: 'user',
                                content: `Create a content brief for ${slot.channel} post.
Brand: ${brand.name}
Summary: ${brand.profile!.summary}
Pillar: ${pillar?.name ?? 'General'}
Funnel stage: ${slot.funnelStage ?? 'Awareness'}
${selectedTrend ? `Use this recent trend if relevant:
Headline: ${selectedTrend.headline}
Summary: ${selectedTrend.summary}
Tags: ${selectedTrend.topicTags.join(', ')}
Source: ${selectedTrend.sourceName ?? 'Unknown'}
` : 'No relevant recent trend was found. Prefer evergreen content.'}
Return JSON: { title, objective, keyAngle, callToAction, assetDirection }`,
                            }],
                            response_format: { type: 'json_object' },
                        });
                        const raw = response.choices[0].message.content ?? '{}';
                        return {
                            output: briefOutputSchema.parse(JSON.parse(raw)),
                            promptTokens: response.usage?.prompt_tokens ?? 0,
                            completionTokens: response.usage?.completion_tokens ?? 0,
                            rawResponse: raw,
                        };
                    },
                });

                const brief = await (prisma as any).contentBrief.create({
                    data: {
                        brandId,
                        strategySlotId: slot.id,
                        title: briefOutput.title,
                        objective: briefOutput.objective,
                        keyAngle: briefOutput.keyAngle,
                        callToAction: briefOutput.callToAction,
                        assetDirection: briefOutput.assetDirection,
                        contentMode: selectedTrend ? 'trend-driven' : 'evergreen',
                        sourceMetadata: {
                            trendSignals: trendContext,
                        },
                        status: 'READY_FOR_REVIEW',
                    },
                });

                await prisma.strategySlot.update({ where: { id: slot.id }, data: { status: 'BRIEF_READY' } });

                const draftOutput = await callAIWorkflow({
                    workspaceId: brand.workspaceId,
                    brandId,
                    workflow: 'post-generation',
                    model,
                    promptVersion: PROMPT_VERSIONS.POST_GENERATION,
                    inputSnapshot: { briefId: brief.id, platform: slot.channel, trendContext },
                    callFn: async () => {
                        const response = await openai.chat.completions.create({
                            model,
                            messages: [{
                                role: 'user',
                                content: `Write a ${slot.channel} post based on this brief.
Title: ${brief.title}
Angle: ${brief.keyAngle}
CTA: ${brief.callToAction}
Brand voice: ${JSON.stringify((brand.profile as any)?.toneGuidelines ?? {})}
${selectedTrend ? `Ground the post in this recent trend when natural:
Headline: ${selectedTrend.headline}
Summary: ${selectedTrend.summary}
` : 'No recent trend context is required.'}
Return JSON: { hook, body, cta, hashtags }`,
                            }],
                            response_format: { type: 'json_object' },
                        });
                        const raw = response.choices[0].message.content ?? '{}';
                        return {
                            output: draftOutputSchema.parse(JSON.parse(raw)),
                            promptTokens: response.usage?.prompt_tokens ?? 0,
                            completionTokens: response.usage?.completion_tokens ?? 0,
                            rawResponse: raw,
                        };
                    },
                });

                await (prisma as any).contentDraft.create({
                    data: {
                        contentBriefId: brief.id,
                        platform: slot.channel as SocialPlatform,
                        hook: draftOutput.hook,
                        body: draftOutput.body,
                        cta: draftOutput.cta,
                        hashtags: draftOutput.hashtags,
                        sourceMetadata: {
                            trendSignals: trendContext,
                        },
                        status: 'IN_REVIEW',
                        version: 1,
                    },
                });

                await prisma.strategySlot.update({ where: { id: slot.id }, data: { status: 'DRAFT_READY' } });
            } catch (err) {
                logger.error({ err, slotId: slot.id, brandId }, '[content] Failed to generate content for slot');
            }
        }
    }

    async listBriefs(brandId: number, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const [briefs, total] = await Promise.all([
            (prisma as any).contentBrief.findMany({
                where: { brandId },
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip,
                include: {
                    drafts: { select: { id: true, platform: true, status: true } },
                    strategySlot: { select: { id: true, scheduledFor: true, channel: true, funnelStage: true } },
                },
            }),
            prisma.contentBrief.count({ where: { brandId } }),
        ]);
        return {
            briefs: briefs.map((brief: any) => ({
                ...brief,
                trendSnippets: extractTrendSnippets(brief.sourceMetadata),
            })),
            total,
            page,
            limit,
        };
    }

    async getBrief(briefId: number) {
        const brief = await prisma.contentBrief.findUnique({
            where: { id: briefId },
            include: { drafts: { orderBy: { version: 'desc' } } },
        });
        if (!brief) return null;

        return {
            ...brief,
            trendSignals: extractTrendSnippets((brief as any).sourceMetadata),
            drafts: brief.drafts.map(draft => ({
                ...draft,
                trendSignals: extractTrendSnippets((draft as any).sourceMetadata),
            })),
        };
    }

    async regenerateDrafts(briefId: number) {
        const brief = await prisma.contentBrief.findUnique({
            where: { id: briefId },
            include: { brand: { include: { profile: true } }, drafts: true },
        });
        if (!brief) {
            const err = new Error('Brief không tồn tại') as any;
            err.statusCode = 404; err.code = 'NOT_FOUND'; throw err;
        }

        await prisma.contentDraft.updateMany({
            where: { contentBriefId: briefId, status: { in: ['IN_REVIEW', 'DRAFT', 'REJECTED'] } },
            data: { status: 'ARCHIVED' },
        });

        const maxVersion = Math.max(0, ...brief.drafts.map(d => d.version));
        const model = await getAIModel('postGeneration');

        const newDraft = await callAIWorkflow({
            workspaceId: brief.brand.workspaceId,
            brandId: brief.brandId,
            workflow: 'post-generation',
            model,
            promptVersion: PROMPT_VERSIONS.POST_GENERATION,
            inputSnapshot: { briefId, regenerate: true },
            callFn: async () => {
                const response = await openai.chat.completions.create({
                    model,
                    messages: [{
                        role: 'user',
                        content: `Regenerate a social media post for brief: ${brief.title}. Angle: ${brief.keyAngle}. CTA: ${brief.callToAction}. Return JSON: { hook, body, cta, hashtags }`,
                    }],
                    response_format: { type: 'json_object' },
                });
                const raw = response.choices[0].message.content ?? '{}';
                return {
                    output: draftOutputSchema.parse(JSON.parse(raw)),
                    promptTokens: response.usage?.prompt_tokens ?? 0,
                    completionTokens: response.usage?.completion_tokens ?? 0,
                    rawResponse: raw,
                };
            },
        });

        return [await prisma.contentDraft.create({
            data: {
                contentBriefId: briefId,
                platform: brief.drafts[0]?.platform ?? 'FACEBOOK',
                hook: newDraft.hook,
                body: newDraft.body,
                cta: newDraft.cta,
                hashtags: newDraft.hashtags,
                status: 'IN_REVIEW',
                version: maxVersion + 1,
            },
        })];
    }

    async editDraft(draftId: number, data: EditDraftInput) {
        const draft = await prisma.contentDraft.findUnique({ where: { id: draftId } });
        if (!draft) {
            const err = new Error('Draft không tồn tại') as any;
            err.statusCode = 404; err.code = 'NOT_FOUND'; throw err;
        }
        if (!['IN_REVIEW', 'DRAFT'].includes(draft.status)) {
            const err = new Error('Chỉ có thể chỉnh sửa draft ở trạng thái IN_REVIEW hoặc DRAFT') as any;
            err.statusCode = 422; err.code = 'INVALID_STATE_TRANSITION'; throw err;
        }
        return prisma.contentDraft.update({ where: { id: draftId }, data });
    }

    async getReviewQueue(brandId: number) {
        const drafts = await (prisma as any).contentDraft.findMany({
            where: { status: 'IN_REVIEW', contentBrief: { brandId } },
            include: {
                contentBrief: {
                    select: {
                        title: true,
                        objective: true,
                        keyAngle: true,
                        sourceMetadata: true,
                    },
                },
            },
            orderBy: { createdAt: 'asc' },
        });
        return drafts.map((d: any) => ({
            draftId: d.id,
            platform: d.platform,
            status: d.status,
            brief: {
                title: d.contentBrief.title,
                objective: d.contentBrief.objective,
                keyAngle: d.contentBrief.keyAngle,
                trendSignals: extractTrendSnippets((d.contentBrief as any).sourceMetadata),
            },
            draft: {
                hook: d.hook,
                body: d.body,
                cta: d.cta,
                hashtags: d.hashtags,
                trendSignals: extractTrendSnippets((d as any).sourceMetadata),
            },
            createdAt: d.createdAt,
        }));
    }
}

export const contentService = new ContentService();
