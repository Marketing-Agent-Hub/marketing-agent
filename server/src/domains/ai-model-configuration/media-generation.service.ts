import { prisma } from '../../db/index.js';

export interface MediaGenerationConfigData {
    imageModel: string;
    videoModel: string | null;
    audioModel: string | null;
    imageSize: string;
    imageStyle: string;
}

export const MEDIA_DEFAULTS: MediaGenerationConfigData = {
    imageModel: 'openai/dall-e-3',
    videoModel: null,
    audioModel: null,
    imageSize: '1024x1024',
    imageStyle: 'natural',
};

class MediaGenerationService {
    /**
     * Get media generation config for a brand.
     * Returns MEDIA_DEFAULTS if no record exists (does NOT create a record).
     */
    async getConfig(brandId: number): Promise<MediaGenerationConfigData> {
        const record = await prisma.mediaGenerationConfig.findUnique({
            where: { brandId },
        });
        if (!record) return { ...MEDIA_DEFAULTS };
        return {
            imageModel: record.imageModel,
            videoModel: record.videoModel,
            audioModel: record.audioModel,
            imageSize: record.imageSize,
            imageStyle: record.imageStyle,
        };
    }

    /**
     * Upsert media generation config for a brand.
     * Merges patch with existing config (or defaults) before persisting.
     */
    async upsertConfig(
        brandId: number,
        patch: Partial<MediaGenerationConfigData>
    ): Promise<MediaGenerationConfigData> {
        const existing = await this.getConfig(brandId);
        const merged = { ...existing, ...patch };

        const record = await prisma.mediaGenerationConfig.upsert({
            where: { brandId },
            update: {
                imageModel: merged.imageModel,
                videoModel: merged.videoModel,
                audioModel: merged.audioModel,
                imageSize: merged.imageSize,
                imageStyle: merged.imageStyle,
            },
            create: {
                brandId,
                imageModel: merged.imageModel,
                videoModel: merged.videoModel,
                audioModel: merged.audioModel,
                imageSize: merged.imageSize,
                imageStyle: merged.imageStyle,
            },
        });

        return {
            imageModel: record.imageModel,
            videoModel: record.videoModel,
            audioModel: record.audioModel,
            imageSize: record.imageSize,
            imageStyle: record.imageStyle,
        };
    }
}

export const mediaGenerationService = new MediaGenerationService();
