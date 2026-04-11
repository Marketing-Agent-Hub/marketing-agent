import { beforeEach, describe, it, vi } from 'vitest';
import * as fc from 'fast-check';

/**
 * Feature: openrouter-ai-client
 *
 * Property 3: SettingService round-trip đọc/ghi model
 * Validates: Requirements 3.2, 3.5
 */

// Mock prisma before importing the service
vi.mock('../../db/index.js', () => ({
    prisma: {
        setting: {
            findUnique: vi.fn(),
            upsert: vi.fn(),
        },
    },
}));

import { prisma } from '../../db/index.js';
import { settingService } from '../../lib/setting.service.js';

const VALID_KEYS = [
    'ai.models.stageA',
    'ai.models.stageB',
    'ai.models.embedding',
    'marketing.models.businessAnalysis',
    'marketing.models.strategyGeneration',
    'marketing.models.postGeneration',
    'ai.models.discovery',
] as const;

describe('SettingService — property tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    /**
     * Property 3: SettingService round-trip đọc/ghi model
     * Validates: Requirements 3.2, 3.5
     *
     * For any valid key and any model name string, after writing a value via
     * setModel(key, value), a subsequent getModel(key) call MUST return that
     * exact same value — the DB is the source of truth.
     */
    it('Property 3: getModel returns the value that was written by setModel (round-trip)', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.constantFrom(...VALID_KEYS),
                // model names: printable ASCII, non-empty, up to 100 chars
                fc.stringMatching(/^[a-zA-Z0-9/_\-.:]{1,100}$/),
                async (key, modelName) => {
                    // Simulate upsert succeeding
                    vi.mocked(prisma.setting.upsert).mockResolvedValue({
                        id: 1,
                        key,
                        value: modelName,
                        description: null,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    });

                    // Simulate findUnique returning the written value
                    vi.mocked(prisma.setting.findUnique).mockResolvedValue({
                        id: 1,
                        key,
                        value: modelName,
                        description: null,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    });

                    await settingService.setModel(key, modelName);
                    const result = await settingService.getModel(key);

                    return result === modelName;
                },
            ),
            { numRuns: 100 },
        );
    });

    /**
     * Property 3b: getModel falls back to a non-empty default when DB has no record
     * Validates: Requirement 3.3
     *
     * For any valid key, if the DB returns null, getModel must return a non-empty
     * default string (never undefined or empty).
     */
    it('Property 3b: getModel returns a non-empty default when DB has no record', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.constantFrom(...VALID_KEYS),
                async (key) => {
                    vi.mocked(prisma.setting.findUnique).mockResolvedValue(null);

                    const result = await settingService.getModel(key);

                    return typeof result === 'string' && result.length > 0;
                },
            ),
            { numRuns: 100 },
        );
    });
});
