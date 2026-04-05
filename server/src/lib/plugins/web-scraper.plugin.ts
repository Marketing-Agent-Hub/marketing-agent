import * as cheerio from 'cheerio';
import { z } from 'zod';
import { Source } from '@prisma/client';
import { env } from '../../config/env.js';
import { BasePlugin, RawPluginData, NormalizedItem, generateContentHash } from './base.plugin.js';

// Config schema cho Web Scraper
export const webScraperConfigSchema = z.object({
    targetUrl: z.string().url(),
    selectors: z.object({
        items: z.string(),
        title: z.string(),
        link: z.string(),
        snippet: z.string().optional(),
        publishedAt: z.string().optional(),
    }),
    pagination: z.object({
        nextPageSelector: z.string().optional(),
        maxPages: z.number().int().min(1).max(10).default(1),
    }).optional(),
});

export type WebScraperConfig = z.infer<typeof webScraperConfigSchema>;

export class WebScraperPlugin implements BasePlugin {
    /**
     * Fetch HTML từ targetUrl trong config
     */
    async fetch(source: Source): Promise<RawPluginData[]> {
        const config = webScraperConfigSchema.parse(source.config);

        const timeoutMs = 10000;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const response = await fetch(config.targetUrl, {
                signal: controller.signal,
                headers: { 'User-Agent': env.USER_AGENT },
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const html = await response.text();
            return [{ raw: html }];
        } finally {
            clearTimeout(timeout);
        }
    }

    /**
     * Parse HTML bằng cheerio, extract items theo CSS selectors
     */
    async parse(raw: RawPluginData[], source: Source): Promise<NormalizedItem[]> {
        const config = webScraperConfigSchema.parse(source.config);
        const html = raw[0].raw as string;
        const $ = cheerio.load(html);
        const items: NormalizedItem[] = [];

        $(config.selectors.items).each((_index, element) => {
            const el = $(element);

            const title = el.find(config.selectors.title).first().text().trim();
            if (!title) return;

            let link = el.find(config.selectors.link).first().attr('href') || '';
            if (!link) return;

            // Resolve relative URLs
            if (link.startsWith('/')) {
                try {
                    const base = new URL(config.targetUrl);
                    link = `${base.origin}${link}`;
                } catch {
                    return;
                }
            }

            const snippet = config.selectors.snippet
                ? el.find(config.selectors.snippet).first().text().trim().substring(0, 1000)
                : undefined;

            let publishedAt: Date | undefined;
            if (config.selectors.publishedAt) {
                const dateStr = el.find(config.selectors.publishedAt).first().attr('datetime')
                    || el.find(config.selectors.publishedAt).first().text().trim();
                if (dateStr) {
                    const parsed = new Date(dateStr);
                    if (!isNaN(parsed.getTime())) {
                        publishedAt = parsed;
                    }
                }
            }

            items.push({
                sourceId: source.id,
                title,
                link,
                snippet,
                contentHash: generateContentHash({ title, link, snippet }),
                publishedAt,
            });
        });

        return items;
    }

    /**
     * Validate config bằng Zod schema
     */
    validateConfig(config: unknown): boolean {
        return webScraperConfigSchema.safeParse(config).success;
    }
}

export const webScraperPlugin = new WebScraperPlugin();
