export interface TrendSnippet {
    id: number;
    headline: string;
    summary: string | null;
    topicTags: string[];
    sourceName: string | null;
    relevanceScore?: number | null;
}

export function extractTrendSnippets(sourceMetadata: unknown): TrendSnippet[] {
    const metadata = (sourceMetadata && typeof sourceMetadata === 'object')
        ? sourceMetadata as { trendSignals?: unknown }
        : null;
    return Array.isArray(metadata?.trendSignals) ? metadata.trendSignals as TrendSnippet[] : [];
}

export function normalizeTrendSnippets(matches: any[]): TrendSnippet[] {
    return matches.map(match => ({
        id: match.trendSignal.id,
        headline: match.trendSignal.headline,
        summary: match.trendSignal.summary,
        topicTags: match.trendSignal.topicTags,
        sourceName: match.trendSignal.sourceName,
        relevanceScore: match.relevanceScore,
    }));
}
