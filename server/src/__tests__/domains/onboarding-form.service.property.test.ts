import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as fc from 'fast-check';

/**
 * Feature: brand-onboarding-upgrade
 *
 * Property 1: Generate endpoint không lưu DB (idempotency)
 * Validates: Requirements 7.3, 9.3
 *
 * Property 2: Save endpoint là upsert idempotent
 * Validates: Requirements 8.2, 11.1, 11.2
 *
 * Property 3: Save endpoint replace ContentPillars chính xác
 * Validates: Requirements 8.3
 *
 * Property 4: fieldKey generate chỉ trả về field được yêu cầu
 * Validates: Requirements 7.5
 */

const {
    mockAiChat,
    mockTransaction,
    mockBrandFindUnique,
    mockBrandProfileUpsert,
    mockContentPillarDeleteMany,
    mockContentPillarCreateMany,
    mockBrandProfileFindUnique,
} = vi.hoisted(() => ({
    mockAiChat: vi.fn(),
    mockTransaction: vi.fn(),
    mockBrandFindUnique: vi.fn(),
    mockBrandProfileUpsert: vi.fn(),
    mockContentPillarDeleteMany: vi.fn(),
    mockContentPillarCreateMany: vi.fn(),
    mockBrandProfileFindUnique: vi.fn(),
}));

vi.mock('../../db/index.js', () => ({
    prisma: {
        brand: { findUnique: mockBrandFindUnique },
        brandProfile: { upsert: mockBrandProfileUpsert, findUnique: mockBrandProfileFindUnique },
        contentPillar: { deleteMany: mockContentPillarDeleteMany, createMany: mockContentPillarCreateMany },
        generationRun: { create: vi.fn().mockResolvedValue({ id: 1 }), update: vi.fn().mockResolvedValue({}) },
        $transaction: mockTransaction,
    },
}));

vi.mock('../../lib/ai-client.js', () => ({
    aiClient: { chat: mockAiChat },
}));

vi.mock('../../shared/marketing/settings.js', () => ({
    getAIModel: vi.fn().mockResolvedValue('gpt-4o-mini'),
}));

import { OnboardingFormService } from '../../domains/onboarding/onboarding-form.service.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const makeBrand = (id = 1) => ({
    id,
    name: 'Test Brand',
    workspaceId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
});

const makeValidProfileJson = () => ({
    summary: 'A great brand',
    targetAudience: [{ segment: 'Young adults', painPoints: ['cost', 'time'] }],
    valueProps: ['Quality', 'Speed'],
    toneGuidelines: { voice: 'Friendly', avoid: ['jargon'] },
    businessGoals: ['Grow revenue'],
    messagingAngles: ['Innovation'],
    contentPillarCandidates: [{ name: 'Education', description: 'Teach users' }],
});

const makeAiChatResponse = (content: object) => ({
    data: {
        choices: [{ message: { content: JSON.stringify(content) } }],
        usage: { prompt_tokens: 10, completion_tokens: 20 },
    },
    actualModel: 'gpt-4o-mini',
});

const makeSavedBrandProfile = (brandId: number) => ({
    id: 1,
    brandId,
    summary: 'A great brand',
    targetAudience: [],
    valueProps: [],
    toneGuidelines: {},
    businessGoals: [],
    messagingAngles: [],
    createdAt: new Date(),
    updatedAt: new Date(),
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('OnboardingFormService — property tests', () => {
    let service: OnboardingFormService;

    beforeEach(() => {
        service = new OnboardingFormService();
        vi.clearAllMocks();
    });

    /**
     * Property 1: Generate endpoint không lưu DB (idempotency)
     * Validates: Requirements 7.3, 9.3
     *
     * For any valid form data, generateProfile() SHALL NOT call any DB write
     * operations (upsert, deleteMany, createMany). It only reads (findUnique)
     * and calls AI.
     */
    it('Property 1: generateProfile — không gọi bất kỳ DB write operation nào', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.record({
                    brandName: fc.string({ minLength: 1 }),
                    websiteUrl: fc.constant(''),
                    industry: fc.string(),
                    description: fc.string(),
                    targetAudience: fc.string(),
                    toneOfVoice: fc.string(),
                    businessGoals: fc.string(),
                    usp: fc.string(),
                    competitors: fc.string(),
                    keyMessages: fc.string(),
                    contentPillars: fc.string(),
                    socialChannels: fc.constant([]),
                }),
                async (formData) => {
                    // Reset mocks for each iteration
                    mockBrandFindUnique.mockResolvedValue(makeBrand(1));
                    mockAiChat.mockResolvedValue(makeAiChatResponse(makeValidProfileJson()));
                    mockBrandProfileUpsert.mockClear();
                    mockContentPillarDeleteMany.mockClear();
                    mockContentPillarCreateMany.mockClear();

                    await service.generateProfile(1, 1, formData);

                    // Verify no DB write operations were called
                    expect(mockBrandProfileUpsert).not.toHaveBeenCalled();
                    expect(mockContentPillarDeleteMany).not.toHaveBeenCalled();
                    expect(mockContentPillarCreateMany).not.toHaveBeenCalled();
                },
            ),
            { numRuns: 100 },
        );
    });

    /**
     * Property 2: Save endpoint là upsert idempotent
     * Validates: Requirements 8.2, 11.1, 11.2
     *
     * For any brandId and set of pillars, calling saveProfile multiple times
     * SHALL NOT throw an error — the upsert semantics ensure idempotency.
     */
    it('Property 2: saveProfile — gọi nhiều lần không throw error', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.integer({ min: 1 }),
                fc.array(
                    fc.record({
                        name: fc.string({ minLength: 1 }),
                        description: fc.string(),
                    }),
                ),
                async (brandId, pillars) => {
                    const profile = {
                        summary: 'Test summary',
                        targetAudience: [{ segment: 'Adults', painPoints: ['cost'] }],
                        valueProps: ['Quality'],
                        toneGuidelines: { voice: 'Friendly', avoid: ['jargon'] },
                        businessGoals: ['Grow'],
                        messagingAngles: ['Innovation'],
                    };

                    // Mock transaction to execute the callback with a tx object
                    const makeTx = () => ({
                        brandProfile: {
                            upsert: mockBrandProfileUpsert.mockResolvedValue({}),
                        },
                        contentPillar: {
                            deleteMany: mockContentPillarDeleteMany.mockResolvedValue({}),
                            createMany: mockContentPillarCreateMany.mockResolvedValue({}),
                        },
                    });

                    mockTransaction.mockImplementation(async (fn: (tx: any) => Promise<any>) =>
                        fn(makeTx()),
                    );
                    mockBrandProfileFindUnique.mockResolvedValue(makeSavedBrandProfile(brandId));

                    // Call saveProfile 2 times — should not throw
                    await expect(service.saveProfile(brandId, profile, pillars)).resolves.not.toThrow();
                    await expect(service.saveProfile(brandId, profile, pillars)).resolves.not.toThrow();
                },
            ),
            { numRuns: 100 },
        );
    });

    /**
     * Property 3: Save endpoint replace ContentPillars chính xác
     * Validates: Requirements 8.3
     *
     * For any array of pillars, saveProfile() SHALL call createMany with
     * exactly the same pillars provided — same count and same names.
     */
    it('Property 3: saveProfile — createMany được gọi với đúng pillars đã cung cấp', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.array(
                    fc.record({
                        name: fc.string({ minLength: 1 }),
                        description: fc.string(),
                    }),
                    { minLength: 0, maxLength: 10 },
                ),
                async (pillars) => {
                    const brandId = 42;
                    const profile = {
                        summary: 'Test summary',
                        targetAudience: [{ segment: 'Adults', painPoints: ['cost'] }],
                        valueProps: ['Quality'],
                        toneGuidelines: { voice: 'Friendly', avoid: ['jargon'] },
                        businessGoals: ['Grow'],
                        messagingAngles: ['Innovation'],
                    };

                    let capturedCreateManyArgs: any = null;

                    const tx = {
                        brandProfile: {
                            upsert: vi.fn().mockResolvedValue({}),
                        },
                        contentPillar: {
                            deleteMany: vi.fn().mockResolvedValue({}),
                            createMany: vi.fn().mockImplementation((args: any) => {
                                capturedCreateManyArgs = args;
                                return Promise.resolve({});
                            }),
                        },
                    };

                    mockTransaction.mockImplementation(async (fn: (tx: any) => Promise<any>) => fn(tx));
                    mockBrandProfileFindUnique.mockResolvedValue(makeSavedBrandProfile(brandId));

                    await service.saveProfile(brandId, profile, pillars);

                    // Verify createMany was called with exactly the pillars provided
                    expect(capturedCreateManyArgs).not.toBeNull();
                    expect(capturedCreateManyArgs.data).toHaveLength(pillars.length);

                    const createdNames = capturedCreateManyArgs.data.map((p: any) => p.name);
                    const inputNames = pillars.map(p => p.name);
                    expect(createdNames).toEqual(inputNames);
                },
            ),
            { numRuns: 100 },
        );
    });

    /**
     * Property 4: fieldKey generate chỉ trả về field được yêu cầu
     * Validates: Requirements 7.5
     *
     * For any valid fieldKey, generateFieldSuggestion() SHALL return an object
     * with { fieldKey, suggestion } and SHALL NOT contain 'profile' or 'pillars' keys.
     */
    it('Property 4: generateFieldSuggestion — chỉ trả về { fieldKey, suggestion }, không có profile hay pillars', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.constantFrom(
                    'brandName',
                    'description',
                    'toneOfVoice',
                    'usp',
                    'competitors',
                    'businessGoals',
                ),
                async (fieldKey) => {
                    const formData = {
                        brandName: 'Test Brand',
                        websiteUrl: '' as const,
                        industry: 'Tech',
                        description: 'A tech company',
                        targetAudience: 'Developers',
                        toneOfVoice: 'Professional',
                        businessGoals: 'Grow',
                        usp: 'Fast',
                        competitors: 'None',
                        keyMessages: 'Quality',
                        contentPillars: 'Education',
                        socialChannels: [] as string[],
                    };

                    mockAiChat.mockResolvedValue({
                        data: {
                            choices: [
                                {
                                    message: {
                                        content: JSON.stringify({
                                            fieldKey,
                                            suggestion: 'test suggestion',
                                        }),
                                    },
                                },
                            ],
                            usage: { prompt_tokens: 5, completion_tokens: 10 },
                        },
                        actualModel: 'gpt-4o-mini',
                    });

                    const result = await service.generateFieldSuggestion(1, 1, formData, fieldKey);

                    // Must have fieldKey and suggestion
                    expect(result).toHaveProperty('fieldKey', fieldKey);
                    expect(result).toHaveProperty('suggestion');
                    expect(typeof result.suggestion).toBe('string');

                    // Must NOT have profile or pillars keys
                    expect(result).not.toHaveProperty('profile');
                    expect(result).not.toHaveProperty('pillars');
                },
            ),
            { numRuns: 100 },
        );
    });
});
