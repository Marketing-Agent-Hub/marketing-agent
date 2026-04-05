import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import { prisma } from '../../db/index.js';
import { ItemStatus } from '@prisma/client';
import { env } from '../../config/env.js';

const MAX_CONTENT_LENGTH_CHARS = 10000; // ~2500 tokens for AI processing

// ========== IMAGE EXTRACTION TYPES ==========

interface ImageCandidate {
    url: string;
    source: 'metadata' | 'body' | 'rss';
    score: number;
    width?: number;
    height?: number;
    alt?: string;
}

// ========== TIER 2: RESOLVE ACTUAL URL ==========

/**
 * Resolve redirect URLs (e.g., Google News) to actual article URL
 */
export async function resolveActualUrl(url: string, maxRedirects = 5): Promise<string> {
    try {
        // Comprehensive list of redirect/proxy domains
        const redirectDomains = [
            'news.google.com',
            'news.google.co',
            't.co',           // Twitter
            'bit.ly',
            'tinyurl.com',
            'ow.ly',
            'is.gd',
            'buff.ly',
            'adf.ly',
            'goo.gl',
            'short.link',
            'fb.me',          // Facebook
            'ln.run',
            'rebrand.ly',
            'cutt.ly',
            'feedproxy.google.com',  // FeedBurner
            'feeds.feedburner.com',
        ];

        // Check if URL contains any redirect domain
        const isRedirect = redirectDomains.some(domain => url.includes(domain));

        if (!isRedirect) {
            return url; // No need to resolve
        }

        console.log(`[Extraction] Detected redirect URL: ${url}`);

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        try {
            const response = await fetch(url, {
                signal: controller.signal,
                method: 'HEAD',
                redirect: 'follow',
                headers: {
                    'User-Agent': env.USER_AGENT,
                },
            });

            clearTimeout(timeout);

            // Return the final URL after redirects
            return response.url || url;
        } catch (error) {
            clearTimeout(timeout);
            console.warn(`[Extraction] Could not resolve redirect: ${url}`);
            return url;
        }
    } catch (error) {
        return url;
    }
}

// ========== TIER 3: EXTRACT METADATA IMAGES ==========

/**
 * Extract images from structured data (JSON-LD, schema.org)
 */
function extractStructuredDataImages(document: Document, baseUrl: string): ImageCandidate[] {
    const candidates: ImageCandidate[] = [];

    // Find all JSON-LD scripts
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');

    scripts.forEach((script) => {
        try {
            const data = JSON.parse(script.textContent || '');

            // Handle arrays of structured data
            const items = Array.isArray(data) ? data : [data];

            items.forEach((item) => {
                // NewsArticle, BlogPosting, Article types
                if (item['@type'] && ['NewsArticle', 'BlogPosting', 'Article', 'WebPage'].includes(item['@type'])) {
                    // image can be string, object, or array
                    const images = item.image;

                    if (typeof images === 'string') {
                        try {
                            candidates.push({
                                url: new URL(images, baseUrl).href,
                                source: 'metadata',
                                score: 95,
                            });
                        } catch (e) { /* Invalid URL */ }
                    } else if (Array.isArray(images)) {
                        images.forEach((img) => {
                            const imgUrl = typeof img === 'string' ? img : img.url;
                            if (imgUrl) {
                                try {
                                    candidates.push({
                                        url: new URL(imgUrl, baseUrl).href,
                                        source: 'metadata',
                                        score: 95,
                                    });
                                } catch (e) { /* Invalid URL */ }
                            }
                        });
                    } else if (images?.url) {
                        try {
                            candidates.push({
                                url: new URL(images.url, baseUrl).href,
                                source: 'metadata',
                                score: 95,
                            });
                        } catch (e) { /* Invalid URL */ }
                    }
                }
            });
        } catch (error) {
            // Invalid JSON or parsing error
        }
    });

    return candidates;
}

/**
 * Extract images from meta tags (og:image, twitter:image, etc.)
 */
export function extractMetadataImages(document: Document, baseUrl: string): ImageCandidate[] {
    const candidates: ImageCandidate[] = [];

    // Comprehensive list of meta tags in priority order
    const metaSelectors = [
        // Open Graph (highest priority)
        { selector: 'meta[property="og:image"]', score: 100 },
        { selector: 'meta[property="og:image:url"]', score: 98 },
        { selector: 'meta[property="og:image:secure_url"]', score: 97 },

        // Twitter Cards
        { selector: 'meta[name="twitter:image"]', score: 95 },
        { selector: 'meta[name="twitter:image:src"]', score: 94 },

        // Article specific
        { selector: 'meta[property="article:image"]', score: 93 },

        // Generic image tags
        { selector: 'link[rel="image_src"]', score: 90 },

        // AMP specific
        { selector: 'meta[property="og:image:amp"]', score: 88 },

        // Dublin Core
        { selector: 'meta[name="dcterms.image"]', score: 85 },

        // Legacy/fallback
        { selector: 'meta[itemprop="image"]', score: 80 },
        { selector: 'link[itemprop="image"]', score: 78 },
    ];

    metaSelectors.forEach(({ selector, score }) => {
        const elements = document.querySelectorAll(selector);
        elements.forEach((el) => {
            const content = el.getAttribute('content') || el.getAttribute('href');
            if (content && content.trim()) {
                try {
                    const absoluteUrl = new URL(content.trim(), baseUrl).href;
                    candidates.push({
                        url: absoluteUrl,
                        source: 'metadata',
                        score,
                    });
                } catch (error) {
                    // Invalid URL
                }
            }
        });
    });

    // Extract from structured data (JSON-LD)
    const structuredDataImages = extractStructuredDataImages(document, baseUrl);
    candidates.push(...structuredDataImages);

    return candidates;
}

// ========== TIER 4: EXTRACT BODY IMAGES ==========

/**
 * Check if image URL is likely a logo/icon/banner/ad
 */
function isLikelyLogoOrIcon(url: string): boolean {
    const urlLower = url.toLowerCase();

    // Comprehensive list of logo/icon/ad keywords
    const logoKeywords = [
        'logo', 'icon', 'lockup', 'banner', 'header', 'footer',
        'favicon', 'sprite', 'badge', 'avatar', 'thumb', 'thumbnail',
        'social', 'share', 'button', 'brand', 'emblem',
        'ads', 'advertisement', 'sponsor', 'promo',
        'widget', 'sidebar', 'navigation', 'nav',
        'author', 'profile', 'gravatar',
    ];

    // Common logo/icon/ad paths across various CMS
    const logoPaths = [
        '/assets/logo', '/img/icon', '/images/brand', '/static/brand',
        '/wp-content/themes', '/dist/svg', '/svg/', '/icons/',
        '/favicons/', '/apple-touch-icon',
        '/uploads/avatar', '/uploads/profile',
        '/ads/', '/advertisement/', '/banners/',
        '/_next/static', '/static/media',  // Next.js, React
        '/assets/images/ui', '/ui/', '/chrome/',  // UI elements
    ];

    // Check keywords
    if (logoKeywords.some(keyword => urlLower.includes(keyword))) {
        return true;
    }

    // Check paths
    if (logoPaths.some(path => urlLower.includes(path))) {
        return true;
    }

    // SVG and ICO are usually logos/icons
    if (urlLower.endsWith('.svg') || urlLower.endsWith('.ico') || urlLower.endsWith('.gif')) {
        return true;
    }

    // Small icon sizes
    if (/[-_](8|16|24|32|48|64|96|128|192|256)x?\d*\.(png|jpg|jpeg|webp)/i.test(urlLower)) {
        return true;
    }

    // Common ad dimensions
    if (/(300x250|728x90|160x600|336x280|970x90|468x60|234x60|125x125)/i.test(urlLower)) {
        return true;
    }

    return false;
}

/**
 * Parse srcset to get the highest quality image URL
 */
function parseSrcset(srcset: string): { url: string; width: number }[] {
    const entries: { url: string; width: number }[] = [];

    if (!srcset) return entries;

    // Split by comma and parse each entry
    const sources = srcset.split(',').map(s => s.trim());

    sources.forEach((source) => {
        const parts = source.split(/\s+/);
        if (parts.length >= 1) {
            const url = parts[0];
            // Parse width descriptor (e.g., "800w" or "2x")
            const descriptor = parts[1];
            let width = 0;

            if (descriptor) {
                if (descriptor.endsWith('w')) {
                    width = parseInt(descriptor);
                } else if (descriptor.endsWith('x')) {
                    // Pixel density (1x, 2x, 3x) - convert to estimate
                    width = parseInt(descriptor) * 1000;
                }
            }

            entries.push({ url, width });
        }
    });

    return entries;
}

/**
 * Extract images from HTML body with comprehensive lazy-load support
 */
export function extractBodyImages(document: Document, baseUrl: string): ImageCandidate[] {
    const candidates: ImageCandidate[] = [];

    // Extract from <img> tags
    const images = document.querySelectorAll('img');

    images.forEach((img) => {
        // Comprehensive lazy-load attribute list
        const srcAttributes = [
            'src',
            'data-src',
            'data-original',
            'data-lazy-src',
            'data-lazy',
            'data-lazysrc',
            'data-actualsrc',
            'data-echo',  // Echo.js lazy load
            'data-srcset',
            'data-original-src',
            'data-hi-res-src',
            'data-full-src',
        ];

        let imageUrl: string | null = null;
        let width: number | undefined;
        let height: number | undefined;

        // Try each attribute until we find an image
        for (const attr of srcAttributes) {
            const value = img.getAttribute(attr);
            if (value && value.trim()) {
                imageUrl = value.trim();
                break;
            }
        }

        // If still no image, try srcset (get highest quality)
        if (!imageUrl) {
            const srcset = img.getAttribute('srcset') || img.getAttribute('data-srcset');
            if (srcset) {
                const parsed = parseSrcset(srcset);
                if (parsed.length > 0) {
                    // Sort by width descending, get highest quality
                    parsed.sort((a, b) => b.width - a.width);
                    imageUrl = parsed[0].url;
                    width = parsed[0].width;
                }
            }
        }

        if (imageUrl) {
            try {
                const absoluteUrl = new URL(imageUrl, baseUrl).href;

                // Filter out unwanted images
                const shouldSkip =
                    imageUrl.includes('1x1') ||
                    imageUrl.includes('pixel') ||
                    imageUrl.includes('tracking') ||
                    imageUrl.includes('spacer') ||
                    imageUrl.includes('transparent') ||
                    imageUrl.includes('blank') ||
                    isLikelyLogoOrIcon(absoluteUrl) ||
                    absoluteUrl.startsWith('data:') ||
                    absoluteUrl.startsWith('blob:');

                if (!shouldSkip) {
                    // Try to get dimensions
                    if (!width) {
                        width = parseInt(img.getAttribute('width') || '0') || undefined;
                    }
                    if (!height) {
                        height = parseInt(img.getAttribute('height') || '0') || undefined;
                    }
                    const alt = img.getAttribute('alt') || '';

                    candidates.push({
                        url: absoluteUrl,
                        source: 'body',
                        score: 50, // Base score for body images
                        width,
                        height,
                        alt,
                    });
                }
            } catch (error) {
                // Invalid URL
            }
        }
    });

    // Extract from <picture> elements (responsive images)
    const pictures = document.querySelectorAll('picture');
    pictures.forEach((picture) => {
        const sources = picture.querySelectorAll('source');
        sources.forEach((source) => {
            const srcset = source.getAttribute('srcset');
            if (srcset) {
                const parsed = parseSrcset(srcset);
                parsed.forEach(({ url }) => {
                    try {
                        const absoluteUrl = new URL(url, baseUrl).href;
                        if (!isLikelyLogoOrIcon(absoluteUrl)) {
                            candidates.push({
                                url: absoluteUrl,
                                source: 'body',
                                score: 55, // Slightly higher for picture elements
                            });
                        }
                    } catch (error) {
                        // Invalid URL
                    }
                });
            }
        });

        // Also check img inside picture
        const img = picture.querySelector('img');
        if (img) {
            const src = img.getAttribute('src');
            if (src) {
                try {
                    const absoluteUrl = new URL(src, baseUrl).href;
                    if (!isLikelyLogoOrIcon(absoluteUrl)) {
                        candidates.push({
                            url: absoluteUrl,
                            source: 'body',
                            score: 55,
                        });
                    }
                } catch (error) {
                    // Invalid URL
                }
            }
        }
    });

    return candidates;
}

// ========== TIER 5: SCORE AND SELECT IMAGES ==========

/**
 * Score and rank image candidates
 */
export function scoreAndSelectImages(
    candidates: ImageCandidate[],
    baseUrl: string,
    maxImages = 5
): { mainImage: string | null; imageList: string[] } {
    if (candidates.length === 0) {
        return { mainImage: null, imageList: [] };
    }

    const baseDomain = new URL(baseUrl).hostname;

    // Score each candidate
    candidates.forEach((candidate) => {
        try {
            const candidateDomain = new URL(candidate.url).hostname;
            const urlLower = candidate.url.toLowerCase();
            const urlPath = new URL(candidate.url).pathname.toLowerCase();

            // ==== DOMAIN SCORING ====
            // Bonus for same domain or CDN of same publisher
            if (candidateDomain === baseDomain || candidateDomain.endsWith(baseDomain)) {
                candidate.score += 25;
            } else if (urlPath.includes(baseDomain.replace(/\./g, '-'))) {
                // CDN might have path like /domain-com/images
                candidate.score += 15;
            }

            // Penalty for generic CDN with no context
            const genericCdns = ['imgur.com', 'photobucket.com', 'tinypic.com'];
            if (genericCdns.some(cdn => candidateDomain.includes(cdn))) {
                candidate.score -= 10;
            }

            // ==== SOURCE TYPE SCORING ====
            // Metadata images are usually hand-picked by publisher
            if (candidate.source === 'metadata') {
                candidate.score += 35;
            } else if (candidate.source === 'rss') {
                candidate.score += 25; // RSS enclosures are often good
            }

            // ==== SIZE SCORING ====
            if (candidate.width && candidate.height) {
                const area = candidate.width * candidate.height;
                const aspectRatio = candidate.width / candidate.height;

                // Size bonuses
                if (area > 800000) candidate.score += 35;      // HD image (1280x720+)
                else if (area > 500000) candidate.score += 30; // Large (800x600+)
                else if (area > 200000) candidate.score += 20; // Medium
                else if (area > 50000) candidate.score += 10;  // Small but usable
                else candidate.score -= 25;                    // Too small, likely icon/thumb

                // Aspect ratio scoring (penalize extreme ratios)
                if (aspectRatio < 0.5 || aspectRatio > 3) {
                    candidate.score -= 15; // Very tall or very wide, likely banner/ad
                } else if (aspectRatio >= 1.2 && aspectRatio <= 2.0) {
                    candidate.score += 10; // Good article image ratio (16:9, 4:3, etc.)
                }
            }

            // ==== PATH SCORING ====
            // Bonus for images in article/content directories
            const goodPaths = ['/article', '/content', '/post', '/story', '/news', '/uploads', '/media', '/wp-content/uploads'];
            if (goodPaths.some(path => urlPath.includes(path))) {
                candidate.score += 15;
            }

            // Penalty for UI/template directories
            const badPaths = ['/template', '/theme', '/layout', '/ui', '/chrome', '/assets/css'];
            if (badPaths.some(path => urlPath.includes(path))) {
                candidate.score -= 20;
            }

            // ==== FILENAME SCORING ====
            // Penalty for suspicious/generic filenames
            const suspiciousNames = [
                'placeholder', 'default', 'dummy', 'sample', 'test',
                'noimage', 'no-image', 'missing', 'unavailable',
                'coming-soon', 'temp', 'example'
            ];
            if (suspiciousNames.some(name => urlLower.includes(name))) {
                candidate.score -= 35;
            }

            // Bonus for date-based filenames (often original uploads)
            if (/\d{4}-\d{2}-\d{2}/.test(urlPath) || /\d{8}/.test(urlPath)) {
                candidate.score += 10;
            }

            // Bonus for descriptive filenames (long names often meaningful)
            const filename = urlPath.split('/').pop() || '';
            if (filename.length > 20 && filename.length < 100) {
                candidate.score += 8;
            }

            // ==== ALT TEXT SCORING ====
            if (candidate.alt) {
                const altLength = candidate.alt.trim().length;
                if (altLength > 20) {
                    candidate.score += 15; // Detailed alt text, likely important
                } else if (altLength > 10) {
                    candidate.score += 8;
                } else if (altLength > 0) {
                    candidate.score += 3;
                }

                // Penalty for generic alt text
                const genericAlts = ['image', 'photo', 'picture', 'img', 'thumbnail'];
                if (genericAlts.includes(candidate.alt.toLowerCase())) {
                    candidate.score -= 5;
                }
            }

            // ==== FORMAT SCORING ====
            // Prefer modern formats
            if (urlLower.endsWith('.webp') || urlLower.endsWith('.avif')) {
                candidate.score += 5; // Modern, usually high quality
            } else if (urlLower.endsWith('.jpg') || urlLower.endsWith('.jpeg') || urlLower.endsWith('.png')) {
                candidate.score += 2; // Standard formats
            } else if (urlLower.endsWith('.gif')) {
                candidate.score -= 10; // Often animated or low quality
            } else if (urlLower.endsWith('.bmp')) {
                candidate.score -= 15; // Rare, usually placeholder
            }

            // ==== QUERY STRING PENALTIES ====
            // Penalize images with resize/crop parameters (might be thumbnails)
            if (urlLower.includes('resize=') || urlLower.includes('w=') && parseInt(new URL(candidate.url).searchParams.get('w') || '0') < 400) {
                candidate.score -= 10;
            }

        } catch (error) {
            // Invalid URL or parsing error
            candidate.score -= 50;
        }
    });

    // Sort by score (descending)
    candidates.sort((a, b) => b.score - a.score);

    // Remove duplicates
    const uniqueUrls = new Map<string, ImageCandidate>();
    for (const candidate of candidates) {
        if (!uniqueUrls.has(candidate.url) && candidate.score > 0) {
            uniqueUrls.set(candidate.url, candidate);
        }
    }

    const sortedUnique = Array.from(uniqueUrls.values());

    // Select main image (highest score) and additional images
    const mainImage = sortedUnique.length > 0 ? sortedUnique[0].url : null;
    const imageList = sortedUnique.slice(0, maxImages).map(c => c.url);

    return { mainImage, imageList };
}

// ========== MASTER FUNCTION: COMPREHENSIVE IMAGE EXTRACTION ==========

/**
 * Extract images using 5-tier architecture
 */
export async function extractImagesComprehensive(
    html: string,
    originalUrl: string
): Promise<{ mainImage: string | null; imageList: string[] }> {
    try {
        // Tier 2: Resolve actual URL (if redirect)
        const actualUrl = await resolveActualUrl(originalUrl);
        if (actualUrl !== originalUrl) {
            console.log(`[Extraction] 🔗 Resolved redirect: ${originalUrl} → ${actualUrl}`);
        }

        // Parse DOM
        const dom = new JSDOM(html, { url: actualUrl });
        const document = dom.window.document;

        const allCandidates: ImageCandidate[] = [];

        // Tier 3: Extract from metadata (og:image, twitter:image, JSON-LD)
        const metadataImages = extractMetadataImages(document, actualUrl);
        console.log(`[Extraction] 📊 Metadata: ${metadataImages.length} images (og:image, twitter:image, schema.org)`);
        allCandidates.push(...metadataImages);

        // Tier 4: Extract from HTML body (img, picture, lazy-load)
        const bodyImages = extractBodyImages(document, actualUrl);
        console.log(`[Extraction] 🖼️  Body: ${bodyImages.length} images (after filtering logos/icons)`);
        allCandidates.push(...bodyImages);

        console.log(`[Extraction] 📦 Total candidates: ${allCandidates.length}`);

        // Tier 5: Score and select best images
        const result = scoreAndSelectImages(allCandidates, actualUrl, 10);

        if (result.mainImage) {
            console.log(`[Extraction] ✅ Main image selected: ${result.mainImage.substring(0, 80)}...`);
            console.log(`[Extraction] 📋 Additional images: ${result.imageList.length - 1}`);
        } else {
            console.log(`[Extraction] ⚠️  No suitable main image found`);
        }

        return result;
    } catch (error) {
        console.error('[Extraction] ❌ Error in comprehensive image extraction:', error);
        return { mainImage: null, imageList: [] };
    }
}

/**
 * Fetch full HTML from URL with timeout
 */
export async function fetchFullHtml(url: string, timeoutMs = 10000): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': env.USER_AGENT,
                Accept: 'text/html,application/xhtml+xml,application/xml',
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.text();
    } finally {
        clearTimeout(timeout);
    }
}

/**
 * Extract main content from HTML using Readability
 */
export function extractMainContent(html: string, url: string): {
    content: string;
    textContent: string;
    title: string;
    excerpt: string;
} | null {
    try {
        const dom = new JSDOM(html, { url });
        const reader = new Readability(dom.window.document);
        const article = reader.parse();

        if (!article || !article.textContent) {
            return null;
        }

        return {
            content: article.content || '', // HTML content
            textContent: article.textContent, // Plain text
            title: article.title || 'Untitled',
            excerpt: article.excerpt || '',
        };
    } catch (error) {
        console.error('[Extraction] Error parsing HTML:', error);
        return null;
    }
}

/**
 * Truncate content to max length for token optimization
 */
export function truncateContent(content: string, maxLength = MAX_CONTENT_LENGTH_CHARS): string {
    if (content.length <= maxLength) {
        return content;
    }

    // Truncate at word boundary
    const truncated = content.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');

    if (lastSpace > 0) {
        return truncated.substring(0, lastSpace) + '...';
    }

    return truncated + '...';
}

/**
 * Process an item: fetch HTML, extract content, save to articles table
 */
export async function processItem(itemId: number): Promise<{
    success: boolean;
    error?: string;
}> {
    try {
        // Fetch item details
        const item = await prisma.item.findUnique({
            where: { id: itemId },
            select: {
                id: true,
                link: true,
                title: true,
                snippet: true,
                status: true,
            },
        });

        if (!item) {
            return { success: false, error: 'Item not found' };
        }

        // Skip if already processed
        if (item.status !== ItemStatus.NEW) {
            console.log(`[Extraction] Item ${itemId} already processed (status: ${item.status})`);
            return { success: false, error: 'Item already processed' };
        }

        console.log(`[Extraction] Fetching content for: ${item.title}`);

        // Fetch full HTML
        const html = await fetchFullHtml(item.link);

        // Extract main content
        const extracted = extractMainContent(html, item.link);

        // Extract images using 5-tier comprehensive system
        const { mainImage, imageList } = await extractImagesComprehensive(html, item.link);
        console.log(`[Extraction] Images: main=${mainImage ? 'YES' : 'NO'}, total=${imageList.length}`);

        if (!extracted) {
            console.warn(`[Extraction] Could not extract content for: ${item.title}`);

            // Update item status to EXTRACTED but with empty content
            await prisma.item.update({
                where: { id: itemId },
                data: { status: ItemStatus.EXTRACTED },
            });

            // Create article with snippet only
            await prisma.article.create({
                data: {
                    itemId: item.id,
                    fullHtml: null,
                    extractedContent: item.snippet || 'No content available',
                    truncatedContent: item.snippet || 'No content available',
                    mainImageUrl: mainImage,
                    imageList: imageList,
                },
            });

            return { success: true };
        }

        // Truncate for AI processing
        const truncated = truncateContent(extracted.textContent);

        // Save article
        await prisma.article.create({
            data: {
                itemId: item.id,
                fullHtml: html,
                extractedContent: extracted.textContent,
                truncatedContent: truncated,
                mainImageUrl: mainImage,
                imageList: imageList,
            },
        });

        // Update item status
        await prisma.item.update({
            where: { id: itemId },
            data: { status: ItemStatus.EXTRACTED },
        });

        console.log(`[Extraction] Successfully extracted content for: ${item.title} (${truncated.length} chars)`);

        return { success: true };
    } catch (error: any) {
        console.error(`[Extraction] Error processing item ${itemId}:`, error);
        return { success: false, error: error.message };
    }
}

/**
 * Process all NEW items (batch extraction)
 */
export async function processNewItems(limitPerBatch = 10): Promise<{
    processed: number;
    errors: number;
}> {
    const items = await prisma.item.findMany({
        where: { status: ItemStatus.NEW },
        take: limitPerBatch,
        select: { id: true },
    });

    console.log(`[Extraction] Processing ${items.length} new items`);

    let processed = 0;
    let errors = 0;

    for (const item of items) {
        const result = await processItem(item.id);
        if (result.success) {
            processed++;
        } else {
            errors++;
        }
    }

    console.log(`[Extraction] Batch complete: ${processed} processed, ${errors} errors`);

    return { processed, errors };
}

