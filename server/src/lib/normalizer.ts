/**
 * Normalize tags: lowercase, trim, deduplicate
 */
export function normalizeTags(tags: string[]): string[] {
  const normalized = tags.map((tag) => tag.trim().toLowerCase()).filter((tag) => tag.length > 0);
  return Array.from(new Set(normalized));
}

/**
 * Normalize keywords: lowercase, trim, deduplicate
 */
export function normalizeKeywords(keywords: string[]): string[] {
  const normalized = keywords.map((kw) => kw.trim().toLowerCase()).filter((kw) => kw.length > 0);
  return Array.from(new Set(normalized));
}

/**
 * Normalize URL: trim and remove trailing slash
 */
export function normalizeUrl(url: string): string {
  return url.trim().replace(/\/$/, '');
}
