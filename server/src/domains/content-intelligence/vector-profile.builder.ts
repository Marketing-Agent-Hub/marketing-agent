export type EmbedFn = (text: string) => Promise<number[]>;

export class ValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ValidationError';
    }
}

function normalizeVector(v: number[]): number[] {
    let norm = 0;
    for (let i = 0; i < v.length; i++) {
        norm += v[i] * v[i];
    }
    norm = Math.sqrt(norm);

    if (norm === 0) {
        throw new ValidationError('Cannot normalize a zero vector');
    }

    return v.map((x) => x / norm);
}

export async function buildVectorProfile(
    topicTags: string[],
    description: string | null,
    embedFn: EmbedFn
): Promise<number[]> {
    const hasDescription = description !== null && description.trim() !== '';

    if (topicTags.length === 0 && !hasDescription) {
        throw new ValidationError('topicTags must not be empty when description is null');
    }

    const tagsVector = await embedFn(topicTags.join(' '));

    if (hasDescription) {
        const descVector = await embedFn(description as string);
        const combined = tagsVector.map((val, i) => 0.6 * val + 0.4 * descVector[i]);
        return normalizeVector(combined);
    }

    return normalizeVector(tagsVector);
}
