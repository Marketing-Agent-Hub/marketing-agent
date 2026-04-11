/**
 * Computes the cosine similarity between two vectors.
 * Returns a value in the range [-1, 1].
 *
 * @throws Error if vectors have different dimensions
 * @throws Error if either vector is a zero vector
 */
export function cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
        throw new Error('Vectors must have the same dimension');
    }

    let dot = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
        throw new Error('Zero vector has no direction');
    }

    return dot / (normA * normB);
}
