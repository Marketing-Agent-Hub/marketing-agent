import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma
vi.mock('../db/index.js', () => ({
    prisma: {
        source: {
            findUnique: vi.fn(),
            update: vi.fn(),
        },
        item: {
            create: vi.fn(),
        },
    },
}));

// Mock plugin registry
vi.mock('../lib/plugins/plugin-registry.js', () => ({
    getPlugin: vi.fn(),
}));

// Mock job monitoring
vi.mock('../lib/job-monitoring.js', () => ({
    logProcessingError: vi.fn(),
}));

// Mock metric service
vi.mock('../services/metric.service.js', () => ({
    metricService: {
        incrementCounter: vi.fn(),
        recordHistogram: vi.fn(),
    },
}));

// Mock logger
vi.mock('../lib/logger.js', () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
    },
}));

import { prisma } from '../db/index.js';
import { getPlugin } from '../lib/plugins/plugin-registry.js';
import { ingestSource, ingestAllSources, saveItems } from '../services/ingest.service.js';
import { SourceType, SourceLang } from '@prisma/client';

const mockSource = (id: number, overrides = {}) => ({
    id,
    name: `Source ${id}`,
    rssUrl: `https://example.com/feed${id}.xml`,
    siteUrl: null,
    lang: SourceLang.EN,
    topicTags: [],
    trustScore: 70,
    enabled: true,
    type: SourceType.RSS,
    config: null,
    fetchIntervalMinutes: 60,
    denyKeywords: [],
    notes: null,
    lastValidatedAt: null,
    lastValidationStatus: null,
    lastFetchedAt: null,
    lastFetchStatus: null,
    itemsCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});

describe('ingestSource', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('trả về { success: false } khi source không tồn tại', async () => {
        vi.mocked(prisma.source.findUnique).mockResolvedValue(null);
        const result = await ingestSource(999);
        expect(result.success).toBe(false);
        expect(result.error).toBe('Source not found');
    });

    it('trả về { success: false } khi plugin throw error — không re-throw', async () => {
        const source = mockSource(1);
        vi.mocked(prisma.source.findUnique).mockResolvedValue(source as any);
        vi.mocked(prisma.source.update).mockResolvedValue(source as any);
        vi.mocked(getPlugin).mockImplementation(() => {
            throw new Error('Plugin error');
        });

        const result = await ingestSource(1);
        expect(result.success).toBe(false);
        expect(result.error).toBe('Plugin error');
    });

    it('trả về { success: true } khi plugin hoạt động bình thường', async () => {
        const source = mockSource(1);
        vi.mocked(prisma.source.findUnique).mockResolvedValue(source as any);
        vi.mocked(prisma.source.update).mockResolvedValue(source as any);
        vi.mocked(prisma.item.create).mockResolvedValue({} as any);

        const mockPlugin = {
            fetch: vi.fn().mockResolvedValue([{ raw: '<rss/>' }]),
            parse: vi.fn().mockResolvedValue([
                {
                    sourceId: 1,
                    title: 'Test',
                    link: 'https://example.com/1',
                    contentHash: 'abc123',
                },
            ]),
            validateConfig: vi.fn().mockReturnValue(true),
        };
        vi.mocked(getPlugin).mockReturnValue(mockPlugin);

        const result = await ingestSource(1);
        expect(result.success).toBe(true);
        expect(result.itemsCreated).toBe(1);
    });
});

describe('ingestAllSources', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('tiếp tục xử lý source còn lại khi một source lỗi', async () => {
        // Source 1 sẽ lỗi, source 2 sẽ thành công
        vi.mocked(prisma.source.findUnique)
            .mockResolvedValueOnce(mockSource(1) as any)
            .mockResolvedValueOnce(mockSource(2) as any);

        vi.mocked(prisma.source.update).mockResolvedValue({} as any);
        vi.mocked(prisma.item.create).mockResolvedValue({} as any);

        // Source 1: plugin throw error
        // Source 2: plugin hoạt động bình thường
        const mockPluginError = {
            fetch: vi.fn().mockRejectedValue(new Error('Network error')),
            parse: vi.fn(),
            validateConfig: vi.fn().mockReturnValue(true),
        };
        const mockPluginOk = {
            fetch: vi.fn().mockResolvedValue([{ raw: '' }]),
            parse: vi.fn().mockResolvedValue([]),
            validateConfig: vi.fn().mockReturnValue(true),
        };

        vi.mocked(getPlugin)
            .mockReturnValueOnce(mockPluginError)
            .mockReturnValueOnce(mockPluginOk);

        // Mock fetchEnabledSources via prisma.source.findMany
        const { prisma: prismaMock } = await import('../db/index.js');
        (prismaMock.source as any).findMany = vi.fn().mockResolvedValue([
            mockSource(1),
            mockSource(2),
        ]);

        // Should not throw
        await expect(ingestAllSources()).resolves.toBeUndefined();

        // Both sources were attempted
        expect(prisma.source.findUnique).toHaveBeenCalledTimes(2);
    });
});
