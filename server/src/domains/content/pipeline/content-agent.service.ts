import { AgentDraft, AgentType, AgentFormat, ContentScript, BrandProfile, ContentAgentConfig } from '@prisma/client';
import { prisma } from '../../../db/index.js';
import { logger } from '../../../lib/logger.js';
import { AgentDisabledError } from './pipeline.errors.js';

export interface GeneratedContent {
    text: string;
    promptTokens: number;
    completionTokens: number;
    actualModel: string;
    imageUrl?: string | null;
}

export abstract class ContentAgentService {
    abstract readonly agentType: AgentType;

    protected abstract generateContent(
        script: ContentScript,
        brandProfile: BrandProfile,
        config: ContentAgentConfig
    ): Promise<GeneratedContent>;

    protected abstract isAgentEnabled(config: ContentAgentConfig): boolean;
    protected abstract getFormatType(): AgentFormat;
    protected abstract getDefaultModel(): string;

    async generateDraft(
        script: ContentScript,
        brandProfile: BrandProfile,
        config: ContentAgentConfig
    ): Promise<AgentDraft> {
        // 1. Check if agent is enabled
        if (!this.isAgentEnabled(config)) {
            throw new AgentDisabledError(this.agentType);
        }

        // 2. Check for duplicate (scriptId, agent) — return existing if found
        const existing = await prisma.agentDraft.findUnique({
            where: { scriptId_agent: { scriptId: script.id, agent: this.agentType } },
        });
        if (existing) {
            logger.info({ scriptId: script.id, agent: this.agentType, draftId: existing.id }, '[Agent] Duplicate draft detected, returning existing');
            return existing;
        }

        // 3. Generate content
        const generated = await this.generateContent(script, brandProfile, config);

        // 4. Save AgentDraft with status PENDING
        const draft = await prisma.agentDraft.create({
            data: {
                brandId: script.brandId,
                scriptId: script.id,
                agent: this.agentType,
                format: this.getFormatType(),
                content: generated.text,
                imageUrl: generated.imageUrl ?? null,
                status: 'PENDING',
                aiModel: generated.actualModel,
                tokenUsage: generated.promptTokens + generated.completionTokens,
            },
        });

        logger.info({ draftId: draft.id, scriptId: script.id, agent: this.agentType, aiModel: generated.actualModel }, '[Agent] Draft created');
        return draft;
    }
}
