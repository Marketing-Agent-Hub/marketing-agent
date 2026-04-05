import { describe, it, expect, beforeEach } from 'vitest';
import { WebScraperPlugin } from '../../lib/plugins/web-scraper.plugin.js';

describe('WebScraperPlugin', () => {
    let plugin: WebScraperPlugin;

    beforeEach(() => {
        plugin = new WebScraperPlugin();
    });

    describe('validateConfig', () => {
        it('trả về true với config hợp lệ', () => {
            const config = {
                targetUrl: 'https://example.com/news',
                selectors: {
                    items: 'article.post',
                    title: 'h2.title',
                    link: 'a.read-more',
                },
            };
            expect(plugin.validateConfig(config)).toBe(true);
        });

        it('trả về false khi thiếu targetUrl', () => {
            const config = {
                selectors: {
                    items: 'article',
                    title: 'h2',
                    link: 'a',
                },
            };
            expect(plugin.validateConfig(config)).toBe(false);
        });

        it('trả về false khi targetUrl không phải URL hợp lệ', () => {
            const config = {
                targetUrl: 'not-a-url',
                selectors: { items: 'article', title: 'h2', link: 'a' },
            };
            expect(plugin.validateConfig(config)).toBe(false);
        });

        it('trả về false khi thiếu selectors.title', () => {
            const config = {
                targetUrl: 'https://example.com',
                selectors: {
                    items: 'article',
                    link: 'a',
                    // title missing
                },
            };
            expect(plugin.validateConfig(config)).toBe(false);
        });

        it('trả về false khi thiếu selectors.link', () => {
            const config = {
                targetUrl: 'https://example.com',
                selectors: {
                    items: 'article',
                    title: 'h2',
                    // link missing
                },
            };
            expect(plugin.validateConfig(config)).toBe(false);
        });

        it('trả về false với null', () => {
            expect(plugin.validateConfig(null)).toBe(false);
        });
    });
});
