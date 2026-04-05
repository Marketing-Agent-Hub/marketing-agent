import { describe, it, expect } from 'vitest';
import { SourceType } from '@prisma/client';
import { getPlugin, registerPlugin } from '../../lib/plugins/plugin-registry.js';
import { RssPlugin } from '../../lib/plugins/rss.plugin.js';
import { WebScraperPlugin } from '../../lib/plugins/web-scraper.plugin.js';

describe('PluginRegistry', () => {
    it('getPlugin(RSS) trả về RssPlugin instance', () => {
        const plugin = getPlugin(SourceType.RSS);
        expect(plugin).toBeInstanceOf(RssPlugin);
    });

    it('getPlugin(WEB_SCRAPER) trả về WebScraperPlugin instance', () => {
        const plugin = getPlugin(SourceType.WEB_SCRAPER);
        expect(plugin).toBeInstanceOf(WebScraperPlugin);
    });

    it('getPlugin(YOUTUBE) throw Error vì chưa đăng ký', () => {
        expect(() => getPlugin(SourceType.YOUTUBE)).toThrow(/Plugin chưa được hỗ trợ/);
    });

    it('getPlugin(SOCIAL_MEDIA) throw Error vì chưa đăng ký', () => {
        expect(() => getPlugin(SourceType.SOCIAL_MEDIA)).toThrow(/Plugin chưa được hỗ trợ/);
    });
});
