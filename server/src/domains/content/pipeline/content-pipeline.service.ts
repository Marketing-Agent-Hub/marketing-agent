import { Item, Article, Brand, BrandProfile, AgentType } from '@prisma/client';
import { prisma } from '../../../db/index.js';
import { logger } from '../../../lib/logger.js';
import { contentScreenwriterService } from './content-screenwriter.service.js';
import { socialPostAgentService } from './agents/social-post-agent.service.js';
import { videoAgentService } from './agents/video-agent.service.js';
import { longformAgentService } from './agents/longform-agent.service.js';
import { agentConfigService } from '../agent-config/agent-config.service.js';
import { DuplicateScriptError } from './pipeline.errors.js';

export interface AgentResult {
    agent: AgentType;
    status: 'fulfilled' | 'rejected';
    draftId?: string;
    error?: string;
}

export interface PipelineResult {
    scriptId: string;
    draftsCreated: number;
    agentResults: AgentResult[];
}

export interface BatchResult {
    processed: number;
    totalDrafts: number;
    errors: string[];
}

class ContentPipelineService {
    async processFilteredItem(
        item: Item & { article: Article | null },
        brand: Brand,
        brandProfile: BrandProfile
    ): Promise<PipelineResult | null> {
        // 1. Get config (with defaults)
        const config = await agentConfigService.getConfigOrDefault(brand.id);

        // 2. Run Screenwriter
        let script;
        try {
            script = await contentScreenwriterService.writeScript(item, brandProfile, {
                model: config.screenwriterModel,
            });
        } catch (err) {
            if (err instanceof DuplicateScriptError) {
                logger.info({ itemId: item.id, brandId: brand.id }, '[Pipeline] Duplicate script, skipping item');
                return null;
            }
            logger.error({ err, itemId: item.id, brandId: brand.id }, '[Pipeline] Screenwriter failed');
            return null; // Do NOT update Item.status
        }

        // 3. Run agents in parallel with Promise.allSettled
        const agentResults = await Promise.allSettled([
            socialPostAgentService.generateDraft(script, brandProfile, config),
            videoAgentService.generateDraft(script, brandProfile, config),
            longformAgentService.generateDraft(script, brandProfile, config),
        ]);

        const agentTypes: AgentType[] = ['SOCIAL_POST', 'VIDEO', 'LONGFORM'];
        const results: AgentResult[] = agentResults.map((result, i) => {
            if (result.status === 'fulfilled') {
                return { agent: agentTypes[i], status: 'fulfilled', draftId: result.value.id };
            } else {
                logger.error({
                    agent: agentTypes[i],
                    itemId: item.id,
                    brandId: brand.id,
                    scriptId: script.id,
                    error: result.reason?.message,
                }, '[Pipeline] Agent failed');
                return { agent: agentTypes[i], status: 'rejected', error: result.reason?.message };
            }
        });

        const draftsCreated = results.filter(r => r.status === 'fulfilled').length;

        // 4. Update Item.status = WRITER_DONE (always, even if some agents failed)
        await prisma.item.update({
            where: { id: item.id },
            data: { status: 'WRITER_DONE' },
        });

        logger.info({ scriptId: script.id, itemId: item.id, brandId: brand.id, draftsCreated }, '[Pipeline] Item processed');

        return { scriptId: script.id, draftsCreated, agentResults: results };
    }

    async processDailyBatch(
        brand: Brand & { profile: BrandProfile | null },
        items: (Item & { article: Article | null })[]
    ): Promise<BatchResult> {
        const errors: string[] = [];
        let totalDrafts = 0;

        if (!brand.profile) {
            logger.warn({ brandId: brand.id }, '[Pipeline] Brand has no profile, skipping batch');
            return { processed: 0, totalDrafts: 0, errors: ['Brand has no profile'] };
        }

        for (const item of items) {
            try {
                const result = await this.processFilteredItem(item, brand, brand.profile);
                if (result) {
                    totalDrafts += result.draftsCreated;
                }
            } catch (err) {
                const msg = `Item ${item.id}: ${(err as Error).message}`;
                errors.push(msg);
                logger.error({ err, itemId: item.id, brandId: brand.id }, '[Pipeline] Item processing failed');
            }
        }

        return { processed: items.length, totalDrafts, errors };
    }
}

export const contentPipelineService = new ContentPipelineService();
