import { AgentType, AgentFormat, ContentScript, BrandProfile, ContentAgentConfig } from '@prisma/client';
import { aiClient } from '../../../../lib/ai-client.js';
import { ContentAgentService, GeneratedContent } from '../content-agent.service.js';
import { VideoScriptSchema } from '../../schemas/pipeline.schemas.js';

export class VideoAgentService extends ContentAgentService {
    readonly agentType = AgentType.VIDEO;

    protected isAgentEnabled(config: ContentAgentConfig): boolean {
        return config.enableVideoAgent;
    }

    protected getFormatType(): AgentFormat {
        return AgentFormat.TIKTOK_SCRIPT;
    }

    protected getDefaultModel(): string {
        return 'openai/gpt-4o-mini';
    }

    protected async generateContent(
        script: ContentScript,
        brandProfile: BrandProfile,
        config: ContentAgentConfig
    ): Promise<GeneratedContent> {
        const model = config.videoModel ?? this.getDefaultModel();
        const minSec = config.videoScriptMinSeconds;
        const maxSec = config.videoScriptMaxSeconds;
        const includeCTA = config.videoScriptIncludeCTA;

        const prompt = `You are a video scriptwriter for short-form content (TikTok, YouTube Shorts).

Create a ${minSec}-${maxSec} second video script:

Story: ${script.storyArc}
Key Points: ${(script.keyPoints as string[]).join(', ')}
Tone: ${script.tone}

Output JSON:
{
  "hook": "First 3 seconds (15-20 words)",
  "story": "Main content (50-100 words)",
  "conclusion": "Wrap up (20-30 words)"${includeCTA ? ',\n  "cta": "Call to action"' : ''}
}`;

        const { data: response, actualModel } = await aiClient.chat({
            model,
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: 'json_object' },
        });

        const raw = response.choices[0].message.content ?? '{}';
        const parsed = VideoScriptSchema.parse(JSON.parse(raw));

        return {
            text: JSON.stringify(parsed, null, 2),
            promptTokens: response.usage?.prompt_tokens ?? 0,
            completionTokens: response.usage?.completion_tokens ?? 0,
            actualModel,
        };
    }
}

export const videoAgentService = new VideoAgentService();
