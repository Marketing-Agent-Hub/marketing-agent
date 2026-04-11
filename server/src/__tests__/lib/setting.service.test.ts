/**
 * Feature: openrouter-ai-client
 * Unit tests for SettingService
 * Requirements: 3.1, 3.3
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock prisma before importing the service
vi.mock('../../db/index.js', () => ({
    prisma: {
        setting: {
            findUnique: vi.fn(),
            findMany: vi.fn(),
            upsert: vi.fn(),
        },
    },
}));

import { prisma } from '../../db/index.js';
import { settingService } from '../../lib/setting.service.js';

const MODEL_DEFAULTS = {
    'ai.models.stageA': 'openai/gpt-4o-mini',
    'ai.models.stageB': 'openai/gpt-4o',
    'ai.models.embedding': 'openai/text-embedding-3-small',
    'marketing.models.businessAnalysis': 'openai/gpt-4o',
    'marketing.models.strategyGeneration': 'openai/gpt-4o',
    'marketing.models.postGeneration': 'openai/gpt-4o-mini',
    'ai.models.discovery': 'openai/gpt-4o-mini',
} as const;

describe('SettingService — unit tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // ── getModel() default values ─────────────────────────────────────────────

    describe('getModel() — default values when DB returns null', () => {
        beforeEach(() => {
            vi.mocked(prisma.setting.findUnique).mockResolvedValue(null);
        });

        it.each(Object.entries(MODEL_DEFAULTS))(
            'returns default "%s" → "%s" when DB has no record',
            async (key, expectedDefault) => {
                const result = await settingService.getModel(key);
                expect(result).toBe(expectedDefault);
            },
        );
    });

    // ── getModel() unknown key ────────────────────────────────────────────────

    describe('getModel() — unknown key', () => {
        it('throws an error for an unknown key', async () => {
            await expect(settingService.getModel('unknown.key')).rejects.toThrow(
                'Unknown model setting key: "unknown.key"',
            );
        });
    });

    // ── getAllAiSettings() shape ───────────────────────────────────────────────

    describe('getAllAiSettings() — shape and defaults', () => {
        beforeEach(() => {
            vi.mocked(prisma.setting.findMany).mockResolvedValue([]);
        });

        it('returns an object with models and stages keys', async () => {
            const result = await settingService.getAllAiSettings();
            expect(result).toHaveProperty('models');
            expect(result).toHaveProperty('stages');
        });

        it('models object contains all 7 expected keys', async () => {
            const result = await settingService.getAllAiSettings();
            expect(Object.keys(result.models)).toEqual(
                expect.arrayContaining([
                    'stageA',
                    'stageB',
                    'embedding',
                    'businessAnalysis',
                    'strategyGeneration',
                    'postGeneration',
                    'discovery',
                ]),
            );
            expect(Object.keys(result.models)).toHaveLength(7);
        });

        it('returns correct default values for all 7 model keys', async () => {
            const result = await settingService.getAllAiSettings();
            expect(result.models.stageA).toBe('openai/gpt-4o-mini');
            expect(result.models.stageB).toBe('openai/gpt-4o');
            expect(result.models.embedding).toBe('openai/text-embedding-3-small');
            expect(result.models.businessAnalysis).toBe('openai/gpt-4o');
            expect(result.models.strategyGeneration).toBe('openai/gpt-4o');
            expect(result.models.postGeneration).toBe('openai/gpt-4o-mini');
            expect(result.models.discovery).toBe('openai/gpt-4o-mini');
        });

        it('stages default to enabled: false when no DB records', async () => {
            const result = await settingService.getAllAiSettings();
            expect(result.stages.stageA).toEqual({ enabled: false });
            expect(result.stages.stageB).toEqual({ enabled: false });
        });
    });
});
