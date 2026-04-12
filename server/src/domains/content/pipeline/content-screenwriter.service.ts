import crypto from 'node:crypto';
import { Item, Article, BrandProfile, ContentScript } from '@prisma/client';
import { prisma } from '../../../db/index.js';
import { aiClient } from '../../../lib/ai-client.js';
import { logger } from '../../../lib/logger.js';
import { ScreenwriterOutputSchema } from '../schemas/pipeline.schemas.js';
import { DuplicateScriptError } from './pipeline.errors.js';

interface WriteScriptOptions {
    model?: string | null;
}

class ContentScreenwriterService {
    computeContentHash(title: string, extractedContent: string): string {
        return crypto.createHash('sha256').update(title + extractedContent).digest('hex');
    }

    buildPrompt(item: Item & { article: Article | null }, brandProfile: BrandProfile): string {
        const audience = JSON.stringify(brandProfile.targetAudience);
        const goals = JSON.stringify(brandProfile.businessGoals);
        const tone = JSON.stringify(brandProfile.toneGuidelines);
        const content = item.article?.extractedContent ?? item.snippet ?? '';

        return `You are a screenwriter for a brand.

Brand voice: ${tone}
Target audience: ${audience}
Business goals: ${goals}

Article title: "${item.title}"
Article content: ${content}

Write a RAW SCRIPT for this content. Output JSON:
{
  "headline": "Short headline (max 150 chars)",
  "storyArc": "How to tell this story (max 300 chars)",
  "keyPoints": ["point1", "point2", "point3"],
  "tone": "professional|casual|humorous|urgent",
  "callToAction": "Optional CTA or omit"
}`;
    }

    async writeScript(
        item: Item & { article: Article | null },
        brandProfile: BrandProfile,
        options?: WriteScriptOptions
    ): Promise<ContentScript> {
        const extractedContent = item.article?.extractedContent ?? item.snippet ?? '';
        const contentHash = this.computeContentHash(item.title, extractedContent);

        // Check for duplicate BEFORE calling AI
        const existing = await prisma.contentScript.findUnique({ where: { contentHash } });
        if (existing) {
            logger.info({ contentHash, itemId: item.id, brandId: item.brandId }, '[Screenwriter] Duplicate script detected, skipping');
            throw new DuplicateScriptError(contentHash);
        }

        const model = options?.model ?? 'openai/gpt-4o';
        const prompt = this.buildPrompt(item, brandProfile);

        const { data: response, actualModel } = await aiClient.chat({
            model,
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: 'json_object' },
        });

        const raw = response.choices[0].message.content ?? '{}';
        const output = ScreenwriterOutputSchema.parse(JSON.parse(raw));

        const script = await prisma.contentScript.create({
            data: {
                brandId: item.brandId,
                itemId: item.id,
                headline: output.headline,
                storyArc: output.storyArc,
                keyPoints: output.keyPoints,
                tone: output.tone,
                callToAction: output.callToAction ?? null,
                contentHash,
                aiModel: actualModel,
                tokenUsage: (response.usage?.prompt_tokens ?? 0) + (response.usage?.completion_tokens ?? 0),
            },
        });

        logger.info({ scriptId: script.id, itemId: item.id, brandId: item.brandId, aiModel: actualModel }, '[Screenwriter] Script created');
        return script;
    }
}

export const contentScreenwriterService = new ContentScreenwriterService();
export { ContentScreenwriterService };
