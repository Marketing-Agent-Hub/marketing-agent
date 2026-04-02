import { ContentDraft, PublishJob, SocialPlatform } from '@prisma/client';
import { logger } from '../../../lib/logger.js';

export interface SocialConnector {
    platform: SocialPlatform;
    publish(job: PublishJob, draft: ContentDraft): Promise<{ externalPostId?: string; rawResponse: unknown }>;
}

export class StubConnector implements SocialConnector {
    platform: SocialPlatform;

    constructor(platform: SocialPlatform = SocialPlatform.FACEBOOK) {
        this.platform = platform;
    }

    async publish(job: PublishJob, draft: ContentDraft): Promise<{ externalPostId?: string; rawResponse: unknown }> {
        logger.info(
            { jobId: job.id, platform: job.platform, draftId: draft.id },
            '[StubConnector] Simulated publish'
        );
        return {
            externalPostId: `stub_${Date.now()}`,
            rawResponse: { simulated: true, platform: job.platform, draftId: draft.id },
        };
    }
}

const connectorRegistry = new Map<SocialPlatform, SocialConnector>();

for (const platform of Object.values(SocialPlatform)) {
    connectorRegistry.set(platform as SocialPlatform, new StubConnector(platform as SocialPlatform));
}

export function getConnector(platform: SocialPlatform): SocialConnector {
    return connectorRegistry.get(platform) ?? new StubConnector(platform);
}
