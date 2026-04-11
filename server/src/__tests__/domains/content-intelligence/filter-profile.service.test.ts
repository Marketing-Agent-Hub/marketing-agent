import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Integration tests for FilterProfile Service
 * Validates: Requirements 9.1, 9.3, 10.5
 */

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('../../../db/index.js', () => ({
    prisma: {
        filterProfile: {
            findUnique: vi.fn(),
            upsert: vi.fn(),
        },
    },
}));

vi.mock('../../../config/ai.config.js', () => ({
    openai: {
        embeddings: {
            create: vi.fn(),
        },
    },
}));

vi.mock('../../../domains/content-intelligence/vector-profile.builder.js', () => ({
    buildVectorProfile: vi.fn(),
    ValidationError: class ValidationError extends Error {
        constructor(message: string) {
            super(message);
            this.name = 'ValidationError';
        }
    },
}));

import { prisma } from '../../../db/index.js';
import { buildVectorProfile, ValidationError } from '../../../domains/content-intelligence/vector-profile.builder.js';
import {
    getFilterProfile,
    upsertFilterProfile,
} from '../../../domains/content-intelligence/filter-profile.service.js';

// ---------------------------------------------------------------------------
// getFilterProfile
// ---------------------------------------------------------------------------

describe('getFilterProfile', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns default PASS_THROUGH profile when no record exists', async () => {
        vi.mocked(prisma.filterProfile.findUnique).mockResolvedValue(null);

        const result = await getFilterProfile(42);

        expect(result).toMatchObject({
            brandId: 42,
            mode: 'PASS_THROUGH',
            topicTags: [],
            description: null,
            similarityThreshold: 0.7,
            vectorProfile: null,
            isDefault: true,
        });
    });

    it('returns stored profile when record exists', async () => {
        const stored = {
            id: 1,
            brandId: 42,
            mode: 'AI_EMBEDDING' as const,
            topicTags: ['tech', 'ai'],
            description: 'AI and technology news',
            similarityThreshold: 0.8,
            vectorProfile: [0.1, 0.2, 0.3],
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        vi.mocked(prisma.filterProfile.findUnique).mockResolvedValue(stored as any);

        const result = await getFilterProfile(42);

        expect(result).toMatchObject({
            brandId: 42,
            mode: 'AI_EMBEDDING',
            topicTags: ['tech', 'ai'],
            description: 'AI and technology news',
            similarityThreshold: 0.8,
            vectorProfile: [0.1, 0.2, 0.3],
            isDefault: false,
        });
    });
});

// ---------------------------------------------------------------------------
// upsertFilterProfile — PASS_THROUGH mode
// ---------------------------------------------------------------------------

describe('upsertFilterProfile — PASS_THROUGH mode', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('stores profile without calling buildVectorProfile when mode is PASS_THROUGH', async () => {
        const stored = {
            id: 1,
            brandId: 42,
            mode: 'PASS_THROUGH' as const,
            topicTags: [],
            description: null,
            similarityThreshold: 0.7,
            vectorProfile: null,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        vi.mocked(prisma.filterProfile.upsert).mockResolvedValue(stored as any);

        const result = await upsertFilterProfile(42, { mode: 'PASS_THROUGH' });

        expect(buildVectorProfile).not.toHaveBeenCalled();
        expect(result.mode).toBe('PASS_THROUGH');
        expect(result.vectorProfile).toBeNull();
    });
});

// ---------------------------------------------------------------------------
// upsertFilterProfile — AI_EMBEDDING mode triggers VectorProfile recomputation
// ---------------------------------------------------------------------------

describe('upsertFilterProfile — AI_EMBEDDING mode', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('Requirement 10.5: calls buildVectorProfile and persists vectorProfile when mode is AI_EMBEDDING', async () => {
        const computedVector = [0.5, 0.5, 0.707];
        vi.mocked(buildVectorProfile).mockResolvedValue(computedVector);

        const stored = {
            id: 1,
            brandId: 42,
            mode: 'AI_EMBEDDING' as const,
            topicTags: ['tech', 'ai'],
            description: 'AI news',
            similarityThreshold: 0.75,
            vectorProfile: computedVector,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        vi.mocked(prisma.filterProfile.upsert).mockResolvedValue(stored as any);

        const result = await upsertFilterProfile(42, {
            mode: 'AI_EMBEDDING',
            topicTags: ['tech', 'ai'],
            description: 'AI news',
            similarityThreshold: 0.75,
        });

        // buildVectorProfile MUST be called (VectorProfile recomputation triggered)
        expect(buildVectorProfile).toHaveBeenCalledTimes(1);
        expect(buildVectorProfile).toHaveBeenCalledWith(
            ['tech', 'ai'],
            'AI news',
            expect.any(Function),
        );

        // vectorProfile is persisted in the upsert call
        expect(prisma.filterProfile.upsert).toHaveBeenCalledWith(
            expect.objectContaining({
                create: expect.objectContaining({ vectorProfile: computedVector }),
                update: expect.objectContaining({ vectorProfile: computedVector }),
            }),
        );

        // Response includes the computed vectorProfile
        expect(result.vectorProfile).toEqual(computedVector);
        expect(result.mode).toBe('AI_EMBEDDING');
    });

    it('throws ValidationError when topicTags is empty and mode is AI_EMBEDDING', async () => {
        vi.mocked(buildVectorProfile).mockRejectedValue(
            new ValidationError('topicTags must be a non-empty array when mode is AI_EMBEDDING'),
        );

        await expect(
            upsertFilterProfile(42, {
                mode: 'AI_EMBEDDING',
                topicTags: [],
            }),
        ).rejects.toThrow('topicTags must be a non-empty array when mode is AI_EMBEDDING');
    });

    it('recomputes vectorProfile on every PUT with AI_EMBEDDING (not cached)', async () => {
        const vector1 = [0.1, 0.9];
        const vector2 = [0.8, 0.2];

        vi.mocked(buildVectorProfile)
            .mockResolvedValueOnce(vector1)
            .mockResolvedValueOnce(vector2);

        const makeStored = (v: number[]) => ({
            id: 1,
            brandId: 42,
            mode: 'AI_EMBEDDING' as const,
            topicTags: ['tech'],
            description: null,
            similarityThreshold: 0.7,
            vectorProfile: v,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        vi.mocked(prisma.filterProfile.upsert)
            .mockResolvedValueOnce(makeStored(vector1) as any)
            .mockResolvedValueOnce(makeStored(vector2) as any);

        const result1 = await upsertFilterProfile(42, { mode: 'AI_EMBEDDING', topicTags: ['tech'] });
        const result2 = await upsertFilterProfile(42, { mode: 'AI_EMBEDDING', topicTags: ['tech'] });

        expect(buildVectorProfile).toHaveBeenCalledTimes(2);
        expect(result1.vectorProfile).toEqual(vector1);
        expect(result2.vectorProfile).toEqual(vector2);
    });
});
