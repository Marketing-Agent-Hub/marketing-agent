import { z } from 'zod';
import { SocialPlatform } from '@prisma/client';
import { prisma } from '../../db/index.js';
import { aiClient } from '../../lib/ai-client.js';
import { callAIWorkflow } from '../../shared/marketing/ai-workflow.js';
import { getAIModel, getDefaultPostingCadence } from '../../shared/marketing/settings.js';
import { PROMPT_VERSIONS } from '../../shared/marketing/prompt-versions.js';
import { GenerateStrategyInput } from '../../shared/marketing/schemas/strategy.schema.js';
import { normalizeTrendSnippets } from '../../shared/marketing/trend-snippets.js';
import { trendMatchingService } from '../content-intelligence/trend-matching.service.js';

const strategyOutputSchema = z.object({
    title: z.string().min(1),
    objective: z.string().min(1),
    weeklyThemes: z.array(z.object({
        week: z.number().int(),
        theme: z.string(),
        funnelStage: z.string(),
    })),
    cadenceConfig: z.object({
        postsPerWeek: z.number().int(),
        channels: z.array(z.string()),
    }),
    slots: z.array(z.object({
        channel: z.string(),
        scheduledFor: z.string(),
        pillarName: z.string(),
        funnelStage: z.string(),
    })),
});

type StrategyOutput = z.infer<typeof strategyOutputSchema>;

export class StrategyService {
    private async getTrendSnippetsForBrand(brandId: number) {
        const recentMatches = await trendMatchingService.getRecentMatchesForBrand(brandId, 3);
        return normalizeTrendSnippets(recentMatches);
    }

    private async attachTrendSnippets<T extends { brandId: number }>(entity: T) {
        const trendSnippets = await this.getTrendSnippetsForBrand(entity.brandId);
        return { ...entity, trendSnippets };
    }

    private async attachTrendSnippetsToSlots<T extends { brandId: number }>(slots: T[]) {
        if (slots.length === 0) return [];
        const trendSnippets = await this.getTrendSnippetsForBrand(slots[0].brandId);
        return slots.map(slot => ({ ...slot, trendSnippets }));
    }

    async generateStrategy(brandId: number, options: GenerateStrategyInput) {
        const brand = await prisma.brand.findUnique({
            where: { id: brandId },
            include: { profile: true, pillars: true },
        });
        if (!brand) {
            const err = new Error('Brand not found') as any;
            err.statusCode = 404; err.code = 'NOT_FOUND'; throw err;
        }
        if (!brand.profile) {
            const err = new Error('Brand does not have a profile. Please complete onboarding first.') as any;
            err.statusCode = 422; err.code = 'PRECONDITION_FAILED'; throw err;
        }

        const model = await getAIModel('strategyGeneration');
        const postsPerWeek = options.postsPerWeek ?? await getDefaultPostingCadence();
        const durationDays = options.durationDays ?? 30;
        const startDate = options.startDate ? new Date(options.startDate) : new Date(Date.now() + 86400000);
        const endDate = new Date(startDate.getTime() + durationDays * 86400000);
        const channels = options.channels ?? ['FACEBOOK'];

        const systemPrompt = `You are a social media strategist. Create a ${durationDays}-day content strategy. Return ONLY valid JSON.`;
        const userPrompt = `
Brand: ${brand.name}
Profile Summary: ${brand.profile.summary}
Business Goals: ${JSON.stringify(brand.profile.businessGoals)}
Content Pillars: ${brand.pillars.map(p => p.name).join(', ')}
Channels: ${channels.join(', ')}
Posts per week: ${postsPerWeek}
Start date: ${startDate.toISOString().split('T')[0]}
Duration: ${durationDays} days

Return JSON with: title, objective, weeklyThemes (array), cadenceConfig, slots (array with channel, scheduledFor ISO date, pillarName, funnelStage).
Generate exactly ${Math.round((durationDays / 7) * postsPerWeek)} slots spread across the duration.`;

        const output = await callAIWorkflow<StrategyOutput>({
            workspaceId: brand.workspaceId,
            brandId,
            workflow: 'strategy-generation',
            model,
            promptVersion: PROMPT_VERSIONS.STRATEGY_GENERATION,
            inputSnapshot: { brandId, durationDays, channels, postsPerWeek },
            callFn: async () => {
                const { data: response, actualModel } = await aiClient.chat({
                    model,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt },
                    ],
                    response_format: { type: 'json_object' },
                });
                const raw = response.choices[0].message.content ?? '{}';
                const validated = strategyOutputSchema.parse(JSON.parse(raw));
                return {
                    output: validated,
                    promptTokens: response.usage?.prompt_tokens ?? 0,
                    completionTokens: response.usage?.completion_tokens ?? 0,
                    rawResponse: raw,
                    actualModel,
                };
            },
        });

        const pillarMap = new Map(brand.pillars.map(p => [p.name.toLowerCase(), p.id]));

        return prisma.$transaction(async (tx) => {
            const plan = await tx.strategyPlan.create({
                data: {
                    brandId,
                    title: output.title,
                    objective: output.objective,
                    status: 'DRAFT',
                    startDate,
                    endDate,
                    cadenceConfig: output.cadenceConfig as any,
                    weeklyThemes: output.weeklyThemes as any,
                },
            });

            await tx.strategySlot.createMany({
                data: output.slots.map(slot => ({
                    strategyPlanId: plan.id,
                    brandId,
                    channel: slot.channel as SocialPlatform,
                    scheduledFor: new Date(slot.scheduledFor),
                    funnelStage: slot.funnelStage,
                    pillarId: pillarMap.get(slot.pillarName.toLowerCase()) ?? null,
                    status: 'PLANNED',
                })),
            });

            return plan;
        });
    }

    async listStrategies(brandId: number) {
        const strategies = await prisma.strategyPlan.findMany({
            where: { brandId },
            orderBy: { createdAt: 'desc' },
        });
        const trendSnippets = await this.getTrendSnippetsForBrand(brandId);
        return strategies.map(strategy => ({ ...strategy, trendSnippets }));
    }

    async getStrategy(strategyId: number) {
        const strategy = await prisma.strategyPlan.findUnique({
            where: { id: strategyId },
            include: { slots: { orderBy: { scheduledFor: 'asc' } } },
        });
        if (!strategy) return null;
        const trendSnippets = await this.getTrendSnippetsForBrand(strategy.brandId);
        return {
            ...strategy,
            trendSnippets,
            slots: strategy.slots.map(slot => ({ ...slot, trendSnippets })),
        };
    }

    async listSlots(strategyId: number) {
        const slots = await prisma.strategySlot.findMany({
            where: { strategyPlanId: strategyId },
            orderBy: { scheduledFor: 'asc' },
        });
        return this.attachTrendSnippetsToSlots(slots);
    }

    async activateStrategy(strategyId: number) {
        const strategy = await prisma.strategyPlan.findUnique({ where: { id: strategyId } });
        if (!strategy) {
            const err = new Error('Strategy not found') as any;
            err.statusCode = 404; err.code = 'NOT_FOUND'; throw err;
        }
        if (strategy.status !== 'DRAFT') {
            const err = new Error(`Can only activate strategy in DRAFT status, current: ${strategy.status}`) as any;
            err.statusCode = 422; err.code = 'INVALID_STATE_TRANSITION'; throw err;
        }

        return prisma.$transaction(async (tx) => {
            await tx.strategyPlan.updateMany({
                where: { brandId: strategy.brandId, status: 'ACTIVE' },
                data: { status: 'SUPERSEDED' },
            });
            return tx.strategyPlan.update({
                where: { id: strategyId },
                data: { status: 'ACTIVE' },
            });
        });
    }
}

export const strategyService = new StrategyService();
