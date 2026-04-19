import { ContentAgentConfig } from '@prisma/client';
import { prisma } from '../../../db/index.js';
import { UpsertAgentConfigInput } from '../schemas/pipeline.schemas.js';

class AgentConfigService {
    async getConfig(brandId: number): Promise<ContentAgentConfig | null> {
        return prisma.contentAgentConfig.findUnique({ where: { brandId } });
    }

    async getConfigOrDefault(brandId: number): Promise<ContentAgentConfig> {
        const config = await this.getConfig(brandId);
        if (config) return config;

        return {
            id: '',
            brandId,
            enableSocialPostAgent: true,
            enableVideoAgent: false,
            enableLongformAgent: false,
            curatorModel: null,
            screenwriterModel: null,
            socialPostModel: null,
            videoModel: null,
            longformModel: null,
            socialPostMaxChars: 500,
            socialPostIncludeHashtags: true,
            socialPostIncludeEmoji: false,
            videoScriptMinSeconds: 15,
            videoScriptMaxSeconds: 60,
            videoScriptIncludeCTA: true,
            longformMinWords: 1500,
            longformIncludeImages: false,
            enableImageForSocialPost: false,
            enableImageForLongform: false,
            imageModel: 'openai/dall-e-3',
            stageAModel: null,
            stageBModel: null,
            embeddingModel: null,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
    }

    async upsertConfig(brandId: number, data: UpsertAgentConfigInput): Promise<ContentAgentConfig> {
        return prisma.contentAgentConfig.upsert({
            where: { brandId },
            update: data,
            create: { brandId, ...data },
        });
    }
}

export const agentConfigService = new AgentConfigService();
