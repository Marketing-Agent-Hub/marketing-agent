import crypto from 'crypto';
import { Source } from '@prisma/client';

/**
 * Dữ liệu thô từ nguồn, trước khi parse
 */
export interface RawPluginData {
    raw: unknown;
}

/**
 * Item đã chuẩn hóa — output chuẩn của mọi plugin
 * Map trực tiếp vào Item model của Prisma
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
 * Config cơ bản cho mọi plugin
 */
export interface BasePluginConfig {
    timeoutMs?: number;
    userAgent?: string;
    rateLimitDelayMs?: number;
}

/**
 * Interface bắt buộc mọi plugin phải implement
 */
export interface BasePlugin {
    fetch(source: Source): Promise<RawPluginData[]>;
    parse(raw: RawPluginData[], source: Source): Promise<NormalizedItem[]>;
    validateConfig(config: unknown): boolean;
}

/**
 * Hàm duy nhất tạo contentHash — dùng chung cho mọi plugin
 * Đảm bảo deduplication nhất quán
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
