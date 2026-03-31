import { Source, ValidationStatus } from '@prisma/client';
import { prisma } from '../db/index.js';
import { CreateSourceInput, UpdateSourceInput, GetSourcesInput } from '../schemas/source.schema.js';
import { normalizeTags, normalizeKeywords, normalizeUrl } from '../lib/normalizer.js';
import { validateRSSFeed, RSSValidationResult } from '../lib/rss-validator.js';
import { getPlugin } from '../lib/plugins/plugin-registry.js';

export class SourceService {
    /**
     * Get all sources with pagination, search, and filters
     */
    async getAllSources(params?: GetSourcesInput): Promise<{
        sources: Source[];
        total: number;
        limit: number;
        offset: number;
    }> {
        // If no params, return all sources (backward compatibility)
        if (!params) {
            const sources = await prisma.source.findMany({
                orderBy: [{ enabled: 'desc' }, { trustScore: 'desc' }, { createdAt: 'desc' }],
            });
            return {
                sources,
                total: sources.length,
                limit: sources.length,
                offset: 0,
            };
        }

        const { limit, offset, search, enabled, lang, minTrustScore, sortBy, sortOrder } = params;

        // Build where clause
        const where: any = {};

        // Search filter (case-insensitive search in name, rssUrl, siteUrl, notes)
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { rssUrl: { contains: search, mode: 'insensitive' } },
                { siteUrl: { contains: search, mode: 'insensitive' } },
                { notes: { contains: search, mode: 'insensitive' } },
            ];
        }

        // Filter by enabled status
        if (enabled !== undefined) {
            where.enabled = enabled;
        }

        // Filter by language
        if (lang) {
            where.lang = lang;
        }

        // Filter by minimum trust score
        if (minTrustScore !== undefined) {
            where.trustScore = { gte: minTrustScore };
        }

        // Build orderBy
        const orderBy: any = {};
        orderBy[sortBy] = sortOrder;

        // Execute query with pagination
        const [sources, total] = await Promise.all([
            prisma.source.findMany({
                where,
                orderBy,
                take: limit,
                skip: offset,
            }),
            prisma.source.count({ where }),
        ]);

        return {
            sources,
            total,
            limit,
            offset,
        };
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
        const normalizedData = {
            ...input,
            rssUrl: input.rssUrl ? normalizeUrl(input.rssUrl) : undefined,
            siteUrl: input.siteUrl ? normalizeUrl(input.siteUrl) : undefined,
            topicTags: normalizeTags(input.topicTags ?? []),
            denyKeywords: normalizeKeywords(input.denyKeywords ?? []),
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
     * Validate plugin config của một source
     */
    async validatePluginConfig(id: number): Promise<{ valid: boolean; error?: string }> {
        const source = await this.getSourceById(id);
        if (!source) {
            return { valid: false, error: 'Source not found' };
        }

        try {
            const plugin = getPlugin(source.type);
            const valid = plugin.validateConfig(source.config);
            return { valid };
        } catch (error: any) {
            return { valid: false, error: error.message };
        }
    }

    /**
     * Validate an RSS feed URL
     */
    async validateRSS(url: string): Promise<RSSValidationResult> {
        const result = await validateRSSFeed(url);

        const source = await prisma.source.findUnique({
            where: { rssUrl: normalizeUrl(url) },
        });

        if (source && source.type === 'RSS') {
            await prisma.source.update({
                where: { id: source.id },
                data: {
                    lastValidatedAt: new Date(),
                    lastValidationStatus: result.ok ? ValidationStatus.OK : ValidationStatus.FAILED,
                },
            });
        }

        return result;
    }
}

export const sourceService = new SourceService();

