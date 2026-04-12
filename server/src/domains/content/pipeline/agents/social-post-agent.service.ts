import { AgentType, AgentFormat, ContentScript, BrandProfile, ContentAgentConfig } from '@prisma/client';
import { aiClient } from '../../../../lib/ai-client.js';
import { logger } from '../../../../lib/logger.js';
import { ContentAgentService, GeneratedContent } from '../content-agent.service.js';

export class SocialPostAgentService extends ContentAgentService {
    readonly agentType = AgentType.SOCIAL_POST;

    protected isAgentEnabled(config: ContentAgentConfig): boolean {
        return config.enableSocialPostAgent;
    }

    protected getFormatType(): AgentFormat {
        return AgentFormat.FACEBOOK_POST;
    }

    protected getDefaultModel(): string {
        return 'openai/gpt-4o-mini';
    }

    protected async generateContent(
        script: ContentScript,
        brandProfile: BrandProfile,
        config: ContentAgentConfig
    ): Promise<GeneratedContent> {
        const model = config.socialPostModel ?? this.getDefaultModel();
        const maxChars = config.socialPostMaxChars;
        const includeHashtags = config.socialPostIncludeHashtags;
        const includeEmoji = config.socialPostIncludeEmoji;

        const prompt = `You are a social media expert. Create a Facebook post from this script:

Headline: ${script.headline}
Story: ${script.storyArc}
Key Points: ${(script.keyPoints as string[]).join(', ')}
Tone: ${script.tone}
CTA: ${script.callToAction ?? 'No specific CTA'}

Write a post with maximum ${maxChars} characters.
${includeHashtags ? 'Include 5-8 relevant hashtags.' : 'Do NOT include hashtags.'}
${includeEmoji ? 'Add 2-3 emojis for engagement.' : 'Do NOT use emojis.'}

Output: Just the post text, no JSON.`;

        const { data: response, actualModel } = await aiClient.chat({
            model,
            messages: [{ role: 'user', content: prompt }],
        });

        const text = response.choices[0].message.content ?? '';

        // Image generation
        let imageUrl: string | null = null;
        if (config.enableImageForSocialPost) {
            try {
                const imagePrompt = `${script.headline} - ${script.tone} style`;
                const imageResponse = await aiClient.chat({
                    model: config.imageModel,
                    messages: [{ role: 'user', content: `Generate an image for: ${imagePrompt}` }],
                });
                // OpenRouter image models return URL in content
                imageUrl = imageResponse.data.choices[0].message.content ?? null;
            } catch (err) {
                logger.warn({ err, scriptId: script.id }, '[SocialPostAgent] Image generation failed, continuing without image');
                imageUrl = null;
            }
        }

        return {
            text,
            promptTokens: response.usage?.prompt_tokens ?? 0,
            completionTokens: response.usage?.completion_tokens ?? 0,
            actualModel,
            imageUrl,
        };
    }
}

export const socialPostAgentService = new SocialPostAgentService();
