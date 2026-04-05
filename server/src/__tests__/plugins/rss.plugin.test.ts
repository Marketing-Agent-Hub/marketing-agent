import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RssPlugin } from '../../lib/plugins/rss.plugin.js';
import { Source, SourceType, SourceLang, ValidationStatus } from '@prisma/client';

// Mock env
vi.mock('../../config/env.js', () => ({
    env: { USER_AGENT: 'TestBot/1.0' },
}));

const mockSource = (overrides: Partial<Source> = {}): Source => ({
    id: 1,
    name: 'Test Source',
    rssUrl: 'https://example.com/feed.xml',
    siteUrl: null,
    lang: SourceLang.EN,
    topicTags: [],
    trustScore: 70,
    enabled: true,
    type: SourceType.RSS,
    config: null,
    fetchIntervalMinutes: 60,
    denyKeywords: [],
    notes: null,
    lastValidatedAt: null,
    lastValidationStatus: null,
    lastFetchedAt: null,
    lastFetchStatus: null,
    itemsCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});

const RSS_2_XML = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Test Feed</title>
    <item>
      <title>Article One</title>
      <link>https://example.com/article-1</link>
      <description>Description one</description>
      <pubDate>Mon, 01 Jan 2024 00:00:00 GMT</pubDate>
    </item>
    <item>
      <title>Article Two</title>
      <link>https://example.com/article-2</link>
      <description>Description two</description>
    </item>
  </channel>
</rss>`;

const ATOM_XML = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Atom Feed</title>
  <entry>
    <title>Atom Entry One</title>
    <link href="https://example.com/atom-1"/>
    <id>https://example.com/atom-1</id>
    <summary>Atom summary one</summary>
    <updated>2024-01-01T00:00:00Z</updated>
  </entry>
</feed>`;

describe('RssPlugin', () => {
    let plugin: RssPlugin;

    beforeEach(() => {
        plugin = new RssPlugin();
    });

    describe('validateConfig', () => {
        it('luôn trả về true (RSS không cần config)', () => {
            expect(plugin.validateConfig(null)).toBe(true);
            expect(plugin.validateConfig({})).toBe(true);
            expect(plugin.validateConfig(undefined)).toBe(true);
        });
    });

    describe('fetch', () => {
        it('throw Error khi source không có rssUrl', async () => {
            const source = mockSource({ rssUrl: null });
            await expect(plugin.fetch(source)).rejects.toThrow(/thiếu rssUrl/);
        });
    });

    describe('parse', () => {
        it('parse RSS 2.0 XML trả về NormalizedItem[] không rỗng', async () => {
            const source = mockSource();
            const raw = [{ raw: RSS_2_XML }];
            const items = await plugin.parse(raw, source);

            expect(items.length).toBe(2);
            expect(items[0].title).toBe('Article One');
            expect(items[0].link).toBe('https://example.com/article-1');
            expect(items[0].sourceId).toBe(1);
            expect(items[0].contentHash).toHaveLength(64);
        });

        it('parse Atom XML trả về NormalizedItem[] không rỗng', async () => {
            const source = mockSource();
            const raw = [{ raw: ATOM_XML }];
            const items = await plugin.parse(raw, source);

            expect(items.length).toBe(1);
            expect(items[0].title).toBe('Atom Entry One');
            expect(items[0].link).toBe('https://example.com/atom-1');
            expect(items[0].contentHash).toHaveLength(64);
        });

        it('mỗi item có contentHash hợp lệ', async () => {
            const source = mockSource();
            const raw = [{ raw: RSS_2_XML }];
            const items = await plugin.parse(raw, source);

            for (const item of items) {
                expect(item.contentHash).toMatch(/^[0-9a-f]{64}$/);
            }
        });
    });
});
