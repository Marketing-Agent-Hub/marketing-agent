import { SourceType } from '@prisma/client';
import { BasePlugin } from './base.plugin.js';
import { rssPlugin } from './rss.plugin.js';
import { webScraperPlugin } from './web-scraper.plugin.js';

const registry = new Map<SourceType, BasePlugin>([
    [SourceType.RSS, rssPlugin],
    [SourceType.WEB_SCRAPER, webScraperPlugin],
]);

/**
 * Get plugin instance by SourceType
 * Throws if plugin is not registered
 */
export function getPlugin(type: SourceType): BasePlugin {
    const plugin = registry.get(type);
    if (!plugin) {
        throw new Error(`Unsupported plugin type: ${type}`);
    }
    return plugin;
}

/**
 * Register a new plugin into the registry
 */
export function registerPlugin(type: SourceType, plugin: BasePlugin): void {
    registry.set(type, plugin);
}
