import crypto from 'crypto';
import { Source } from '@prisma/client';

/**
 * Raw data from source, before parsing
 */
export interface RawPluginData {
    raw: unknown;
}

/**
 * Normalized item - standard output of every plugin
 * Maps directly to Prisma's Item model
 */
export interface NormalizedItem {
    sourceId: number;
    guid?: string;
    title: string;
    link: string;
    snippet?: string;
    contentHash: string;
    publishedAt?: Date;
}

/**
 * Base config for every plugin
 */
export interface BasePluginConfig {
    timeoutMs?: number;
    userAgent?: string;
    rateLimitDelayMs?: number;
}

/**
 * Mandatory interface that every plugin must implement
 */
export interface BasePlugin {
    fetch(source: Source): Promise<RawPluginData[]>;
    parse(raw: RawPluginData[], source: Source): Promise<NormalizedItem[]>;
    validateConfig(config: unknown): boolean;
}

/**
 * Single function to generate contentHash - shared across plugins
 * Ensures consistent deduplication
 */
export function generateContentHash(item: {
    title: string;
    link: string;
    snippet?: string;
}): string {
    const normalized = [
        item.title.trim().toLowerCase(),
        item.link.trim(),
        (item.snippet || '').trim().toLowerCase().substring(0, 200),
    ].join('|');
    return crypto.createHash('sha256').update(normalized).digest('hex');
}
