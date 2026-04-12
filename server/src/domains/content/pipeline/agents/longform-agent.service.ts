import { AgentType, AgentFormat, ContentScript, BrandProfile, ContentAgentConfig } from '@prisma/client';
import { aiClient } from '../../../../lib/ai-client.js';
import { logger } from '../../../../lib/logger.js';
import { ContentAgentService, GeneratedContent } from '../content-agent.service.js';

export class LongformAgentService extends ContentAgentService {
    readonly agentType = AgentType.LONGFORM;

    protected isAgentEnabled(config: ContentAgentConfig): boolean {
        return config.enableLongformAgent;
    }

    protected getFormatType(): AgentFormat {
        return AgentFormat.MEDIUM_ARTICLE;
    }

    protected getDefaultModel(): string {
        return 'openai/gpt-4o';
    }

    protected async generateContent(
        script: ContentScript,
        brandProfile: BrandProfile,
        config: ContentAgentConfig
    ): Promise<GeneratedContent> {
        const model = config.longformModel ?? this.getDefaultModel();
        const minWords = config.longformMinWords;
        const includeImages = config.longformIncludeImages;

        const prompt = `You are a professional content writer for Medium/Blog.

Write a ${minWords}+ word article from this script:

Topic: ${script.headline}
Story: ${script.storyArc}
Key Points: ${(script.keyPoints as string[]).join(', ')}

Structure:
- Title (compelling, SEO-friendly)
- Introduction (100-150 words)
- Body (main content, ${minWords - 300}+ words)
- Conclusion (150-200 words)

${includeImages ? 'Include [IMAGE] placeholders where images would enhance the content.' : ''}

Output: Full article text.`;

        const { data: response, actualModel } = await aiClient.chat({
            model,
            messages: [{ role: 'user', content: prompt }],
        });

        const text = response.choices[0].message.content ?? '';

        // Image generation
        let imageUrl: string | null = null;
        if (config.enableImageForLongform) {
            try {
                const imageResponse = await aiClient.chat({
                    model: config.imageModel,
                    messages: [{ role: 'user', content: `Generate a hero image for article: ${script.headline}` }],
                });
                imageUrl = imageResponse.data.choices[0].message.content ?? null;
            } catch (err) {
                logger.warn({ err, scriptId: script.id }, '[LongformAgent] Image generation failed, continuing without image');
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

export const longformAgentService = new LongformAgentService();
