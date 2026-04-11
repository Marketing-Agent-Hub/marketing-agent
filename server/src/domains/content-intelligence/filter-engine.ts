import { cosineSimilarity } from '../../lib/cosine-similarity.js';

export interface ArticleInput {
    title: string;
    extractedContent: string;
}

export interface FilterProfileInput {
    mode: 'PASS_THROUGH' | 'AI_EMBEDDING';
    vectorProfile: number[] | null;
    similarityThreshold: number;
}

export interface FilterResult {
    allowed: boolean;
    score: number; // [0, 1]
    reason: string;
}

export type EmbedFn = (text: string) => Promise<number[]>;

export async function runFilterEngine(
    article: ArticleInput,
    filterProfile: FilterProfileInput,
    embedFn: EmbedFn,
): Promise<FilterResult> {
    if (filterProfile.mode === 'PASS_THROUGH') {
        return { allowed: true, score: 1.0, reason: 'pass_through' };
    }

    // AI_EMBEDDING mode
    if (filterProfile.vectorProfile === null) {
        return { allowed: true, score: 0, reason: 'no_vector_profile' };
    }

    try {
        const truncatedContent = article.extractedContent.slice(0, 500);
        const text = `${article.title} ${truncatedContent}`;
        const articleVector = await embedFn(text);

        const rawScore = cosineSimilarity(articleVector, filterProfile.vectorProfile);
        const score = Math.max(0, rawScore);

        if (score >= filterProfile.similarityThreshold) {
            return { allowed: true, score, reason: 'above_threshold' };
        } else {
            return { allowed: false, score, reason: 'below_threshold' };
        }
    } catch {
        return { allowed: true, score: 0, reason: 'embedding_error' };
    }
}
