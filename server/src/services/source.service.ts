import { Source, ValidationStatus } from '@prisma/client';
import { prisma } from '../db';
import { CreateSourceInput, UpdateSourceInput } from '../schemas/source.schema';
import { normalizeTags, normalizeKeywords, normalizeUrl } from '../lib/normalizer';
import { validateRSSFeed, RSSValidationResult } from '../lib/rss-validator';

export class SourceService {
    /**
     * Get all sources
     */
    async getAllSources(): Promise<Source[]> {
        return prisma.source.findMany({
            orderBy: [{ enabled: 'desc' }, { trustScore: 'desc' }, { createdAt: 'desc' }],
        });
    }

    /**
     * Get source by ID
     */
    async getSourceById(id: number): Promise<Source | null> {
        return prisma.source.findUnique({
            where: { id },
        });
    }

    /**
     * Create a new source
     */
    async createSource(input: CreateSourceInput): Promise<Source> {
        // Normalize data
        const normalizedData = {
            ...input,
            rssUrl: normalizeUrl(input.rssUrl),
            siteUrl: input.siteUrl ? normalizeUrl(input.siteUrl) : undefined,
            topicTags: normalizeTags(input.topicTags),
            denyKeywords: normalizeKeywords(input.denyKeywords),
        };

        return prisma.source.create({
            data: normalizedData,
        });
    }

    /**
     * Update a source
     */
    async updateSource(id: number, input: UpdateSourceInput): Promise<Source | null> {
        // Check if source exists
        const existing = await this.getSourceById(id);
        if (!existing) {
            return null;
        }

        // Normalize data if provided
        const normalizedData: UpdateSourceInput = { ...input };
        if (input.rssUrl) {
            normalizedData.rssUrl = normalizeUrl(input.rssUrl);
        }
        if (input.siteUrl) {
            normalizedData.siteUrl = normalizeUrl(input.siteUrl);
        }
        if (input.topicTags) {
            normalizedData.topicTags = normalizeTags(input.topicTags);
        }
        if (input.denyKeywords) {
            normalizedData.denyKeywords = normalizeKeywords(input.denyKeywords);
        }

        return prisma.source.update({
            where: { id },
            data: normalizedData,
        });
    }

    /**
     * Delete a source
     */
    async deleteSource(id: number): Promise<boolean> {
        try {
            await prisma.source.delete({
                where: { id },
            });
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Validate an RSS feed URL
     */
    async validateRSS(url: string): Promise<RSSValidationResult> {
        const result = await validateRSSFeed(url);

        // Update validation status if this URL belongs to an existing source
        const source = await prisma.source.findUnique({
            where: { rssUrl: normalizeUrl(url) },
        });

        if (source) {
            await prisma.source.update({
                where: { id: source.id },
                data: {
                    lastValidatedAt: new Date(),
                    lastValidationStatus: result.ok ? ValidationStatus.OK : ValidationStatus.FAILED,
                },
            });

            console.log(
                `Validation for source ${source.id} (${source.name}):`,
                result.ok ? 'OK' : 'FAILED'
            );
        }

        return result;
    }
}

export const sourceService = new SourceService();
