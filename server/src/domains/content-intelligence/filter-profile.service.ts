import { prisma } from '../../db/index.js';
import { buildVectorProfile, ValidationError } from './vector-profile.builder.js';
import { aiClient } from '../../lib/ai-client.js';
import { settingService } from '../../lib/setting.service.js';

export interface FilterProfileData {
    mode: 'PASS_THROUGH' | 'AI_EMBEDDING';
    topicTags?: string[];
    description?: string | null;
    similarityThreshold?: number;
}

export interface FilterProfileResponse {
    brandId: number;
    mode: 'PASS_THROUGH' | 'AI_EMBEDDING';
    topicTags: string[];
    description: string | null;
    similarityThreshold: number;
    vectorProfile: number[] | null;
    isDefault: boolean;
}

const embedFn = async (text: string): Promise<number[]> => {
    const model = await settingService.getModel('ai.models.embedding');
    const { data: result } = await aiClient.embed({ model, input: text });
    return result.data[0].embedding;
};

const DEFAULT_PROFILE: Omit<FilterProfileResponse, 'brandId'> = {
    mode: 'PASS_THROUGH',
    topicTags: [],
    description: null,
    similarityThreshold: 0.7,
    vectorProfile: null,
    isDefault: true,
};

export async function getFilterProfile(brandId: number): Promise<FilterProfileResponse> {
    const record = await prisma.filterProfile.findUnique({ where: { brandId } });

    if (!record) {
        return { brandId, ...DEFAULT_PROFILE };
    }

    return {
        brandId: record.brandId,
        mode: record.mode as 'PASS_THROUGH' | 'AI_EMBEDDING',
        topicTags: record.topicTags,
        description: record.description ?? null,
        similarityThreshold: record.similarityThreshold,
        vectorProfile: record.vectorProfile ? (record.vectorProfile as number[]) : null,
        isDefault: false,
    };
}

export async function upsertFilterProfile(
    brandId: number,
    data: FilterProfileData,
): Promise<FilterProfileResponse> {
    const topicTags = data.topicTags ?? [];
    const description = data.description ?? null;
    const similarityThreshold = data.similarityThreshold ?? 0.7;

    let vectorProfile: number[] | null = null;

    if (data.mode === 'AI_EMBEDDING') {
        if (topicTags.length === 0) {
            throw new ValidationError('topicTags must be a non-empty array when mode is AI_EMBEDDING');
        }
        vectorProfile = await buildVectorProfile(topicTags, description, embedFn);
    }

    const record = await prisma.filterProfile.upsert({
        where: { brandId },
        create: {
            brandId,
            mode: data.mode,
            topicTags,
            description,
            similarityThreshold,
            vectorProfile: vectorProfile ?? undefined,
        },
        update: {
            mode: data.mode,
            topicTags,
            description,
            similarityThreshold,
            vectorProfile: vectorProfile ?? null,
        },
    });

    return {
        brandId: record.brandId,
        mode: record.mode as 'PASS_THROUGH' | 'AI_EMBEDDING',
        topicTags: record.topicTags,
        description: record.description ?? null,
        similarityThreshold: record.similarityThreshold,
        vectorProfile: record.vectorProfile ? (record.vectorProfile as number[]) : null,
        isDefault: false,
    };
}
