import { SourceType } from '@prisma/client';
import { BasePlugin } from './base.plugin.js';
import { rssPlugin } from './rss.plugin.js';
import { webScraperPlugin } from './web-scraper.plugin.js';

const registry = new Map<SourceType, BasePlugin>([
    [SourceType.RSS, rssPlugin],
    [SourceType.WEB_SCRAPER, webScraperPlugin],
]);

/**
 * Lấy plugin instance theo SourceType
 * Throws nếu plugin chưa được đăng ký
 */
export function getPlugin(type: SourceType): BasePlugin {
    const plugin = registry.get(type);
    if (!plugin) {
        throw new Error(`Plugin chưa được hỗ trợ: ${type}`);
    }
    return plugin;
}

/**
 * Đăng ký plugin mới vào registry
 */
export function registerPlugin(type: SourceType, plugin: BasePlugin): void {
    registry.set(type, plugin);
}
