import { BrandProfile } from '@prisma/client';
import { prisma } from '../../db/index.js';
import { aiClient, OpenRouterCreditError, OpenRouterOverloadedError } from '../../lib/ai-client.js';
import { logger } from '../../lib/logger.js';
import { callAIWorkflow } from '../../shared/marketing/ai-workflow.js';
import { getAIModel } from '../../shared/marketing/settings.js';
import { PROMPT_VERSIONS } from '../../shared/marketing/prompt-versions.js';
import {
    generatedBrandProfileSchema,
    OnboardingFormDataInput,
    GeneratedBrandProfileInput,
    GeneratedContentPillarInput,
} from '../../shared/marketing/schemas/onboarding.schema.js';

// ─── Helper: create a typed error ────────────────────────────────────────────

function makeError(message: string, statusCode: number, code: string): Error {
    const err = new Error(message) as Error & { statusCode: number; code: string };
    err.statusCode = statusCode;
    err.code = code;
    return err;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class OnboardingFormService {
    /**
     * Generate a BrandProfile from structured form data using AI.
     * Does NOT write to the database — returns { profile, pillars } only.
     */
    async generateProfile(
        brandId: number,
        formData: OnboardingFormDataInput,
        prompt?: string,
    ): Promise<{ profile: Omit<GeneratedBrandProfileInput, 'contentPillarCandidates'>; pillars: GeneratedContentPillarInput[] }> {
        // Verify brand exists and get workspaceId
        const brand = await prisma.brand.findUnique({ where: { id: brandId } });
        if (!brand) {
            throw makeError('Brand not found', 404, 'NOT_FOUND');
        }

        // Use workspaceId from brand record — don't rely on caller passing it correctly
        const resolvedWorkspaceId = brand.workspaceId;

        const model = await getAIModel('businessAnalysis');

        const systemPrompt =
            'You are a marketing strategist. Given structured brand information, generate a comprehensive brand profile. Return ONLY valid JSON.';

        const socialChannelsText =
            formData.socialChannels && formData.socialChannels.length > 0
                ? formData.socialChannels.join(', ')
                : '';

        const userPrompt = `## Brand Information
Brand Name: ${formData.brandName}
Website: ${formData.websiteUrl ?? ''}
Industry: ${formData.industry ?? ''}
Description: ${formData.description ?? ''}
Target Audience: ${formData.targetAudience ?? ''}
Tone of Voice: ${formData.toneOfVoice ?? ''}
Business Goals: ${formData.businessGoals ?? ''}

## Advanced Information (if provided)
USP: ${formData.usp ?? ''}
Competitors: ${formData.competitors ?? ''}
Key Messages: ${formData.keyMessages ?? ''}
Content Pillars: ${formData.contentPillars ?? ''}
Social Channels: ${socialChannelsText}
${prompt ? `\n## Additional Context\n${prompt}` : ''}

## Required Output (JSON only)
{ "summary": "...", "targetAudience": [...], "valueProps": [...], "toneGuidelines": {...}, "businessGoals": [...], "messagingAngles": [...], "contentPillarCandidates": [...] }`;

        let output: GeneratedBrandProfileInput;
        try {
            output = await callAIWorkflow<GeneratedBrandProfileInput>({
                workspaceId: resolvedWorkspaceId,
                brandId,
                workflow: 'business-analysis',
                model,
                promptVersion: PROMPT_VERSIONS.BUSINESS_ANALYSIS,
                inputSnapshot: {
                    brandId,
                    formDataKeys: Object.keys(formData),
                    hasPrompt: !!prompt,
                },
                callFn: async () => {
                    const { data: response, actualModel } = await aiClient.chat({
                        model,
                        messages: [
                            { role: 'system', content: systemPrompt },
                            { role: 'user', content: userPrompt },
                        ],
                        response_format: { type: 'json_object' },
                    });

                    const rawContent = response.choices[0].message.content ?? '{}';

                    let parsed: unknown;
                    try {
                        parsed = JSON.parse(rawContent);
                    } catch {
                        throw makeError('AI returned invalid data', 502, 'AI_INVALID_RESPONSE');
                    }

                    let validated: GeneratedBrandProfileInput;
                    try {
                        validated = generatedBrandProfileSchema.parse(parsed);
                    } catch {
                        throw makeError('AI returned invalid data', 502, 'AI_INVALID_RESPONSE');
                    }

                    return {
                        output: validated,
                        promptTokens: response.usage?.prompt_tokens ?? 0,
                        completionTokens: response.usage?.completion_tokens ?? 0,
                        rawResponse: rawContent,
                        actualModel,
                    };
                },
            });
        } catch (err: unknown) {
            // Re-throw errors that already have our custom codes
            const e = err as { code?: string; statusCode?: number };
            if (e.code === 'AI_INVALID_RESPONSE') throw err;

            // Surface provider-specific errors with proper status codes
            if (err instanceof OpenRouterCreditError) throw err;
            if (err instanceof OpenRouterOverloadedError) throw err;

            // Log original cause so it appears in server logs before wrapping
            logger.error({
                brandId,
                cause: err instanceof Error ? err.message : String(err),
                causeStack: err instanceof Error ? err.stack : undefined,
            }, '[Onboarding] AI upstream error in generateProfile');

            throw makeError('AI service is unresponsive', 502, 'AI_UPSTREAM_ERROR');
        }

        const { contentPillarCandidates, ...profile } = output;

        return { profile, pillars: contentPillarCandidates };
    }

    /**
     * Generate a suggestion for a single form field using AI.
     * Does NOT write to the database.
     */
    async generateFieldSuggestion(
        brandId: number,
        formData: OnboardingFormDataInput,
        fieldKey: string,
    ): Promise<{ fieldKey: string; suggestion: string }> {
        const model = await getAIModel('businessAnalysis');

        const systemPrompt =
            'You are a marketing strategist. Given brand information, suggest content for a specific field. Return ONLY valid JSON with { "fieldKey": "...", "suggestion": "..." }.';

        const userPrompt = `## Brand Context
${JSON.stringify(formData, null, 2)}

## Target Field
Generate a suggestion for the field: ${fieldKey}`;

        let suggestion: string;
        try {
            const { data: response } = await aiClient.chat({
                model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt },
                ],
                response_format: { type: 'json_object' },
            });

            const rawContent = response.choices[0].message.content ?? '{}';

            let parsed: unknown;
            try {
                parsed = JSON.parse(rawContent);
            } catch {
                throw makeError('AI returned invalid data', 502, 'AI_INVALID_RESPONSE');
            }

            const result = parsed as Record<string, unknown>;
            if (
                typeof result.fieldKey !== 'string' ||
                typeof result.suggestion !== 'string'
            ) {
                throw makeError('AI returned invalid data', 502, 'AI_INVALID_RESPONSE');
            }

            suggestion = result.suggestion;
        } catch (err: unknown) {
            const e = err as { code?: string };
            if (e.code === 'AI_INVALID_RESPONSE') throw err;
            if (err instanceof OpenRouterCreditError) throw err;
            if (err instanceof OpenRouterOverloadedError) throw err;

            logger.error({
                brandId,
                fieldKey,
                cause: err instanceof Error ? err.message : String(err),
            }, '[Onboarding] AI upstream error in generateFieldSuggestion');

            throw makeError('AI service is unresponsive', 502, 'AI_UPSTREAM_ERROR');
        }

        return { fieldKey, suggestion };
    }

    /**
     * Persist a generated BrandProfile and its ContentPillars to the database.
     * Runs as a single transaction: upsert BrandProfile + replace ContentPillars.
     */
    async saveProfile(
        brandId: number,
        profile: Omit<GeneratedBrandProfileInput, 'contentPillarCandidates'>,
        pillars: GeneratedContentPillarInput[],
    ): Promise<BrandProfile> {
        try {
            await prisma.$transaction(async tx => {
                await tx.brandProfile.upsert({
                    where: { brandId },
                    create: {
                        brandId,
                        summary: profile.summary,
                        targetAudience: profile.targetAudience as any,
                        valueProps: profile.valueProps as any,
                        toneGuidelines: profile.toneGuidelines as any,
                        businessGoals: profile.businessGoals as any,
                        messagingAngles: profile.messagingAngles as any,
                    },
                    update: {
                        summary: profile.summary,
                        targetAudience: profile.targetAudience as any,
                        valueProps: profile.valueProps as any,
                        toneGuidelines: profile.toneGuidelines as any,
                        businessGoals: profile.businessGoals as any,
                        messagingAngles: profile.messagingAngles as any,
                    },
                });

                await tx.contentPillar.deleteMany({ where: { brandId } });

                await tx.contentPillar.createMany({
                    data: pillars.map(p => ({
                        brandId,
                        name: p.name,
                        description: p.description,
                    })),
                });
            });
        } catch (err: unknown) {
            const e = err as { code?: string };
            if (e.code === 'INTERNAL_ERROR') throw err;
            throw makeError('Error saving data', 500, 'INTERNAL_ERROR');
        }

        const saved = await prisma.brandProfile.findUnique({ where: { brandId } });
        if (!saved) {
            throw makeError('Error saving data', 500, 'INTERNAL_ERROR');
        }
        return saved;
    }
}

export const onboardingFormService = new OnboardingFormService();
