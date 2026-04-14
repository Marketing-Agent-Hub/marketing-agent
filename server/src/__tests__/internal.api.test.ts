import express from 'express';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const verifyTokenMock = vi.fn();
const ingestMock = vi.fn();
const extractionMock = vi.fn();
const filteringMock = vi.fn();
const stageAMock = vi.fn();
const stageBMock = vi.fn();

vi.mock('../domains/auth/auth.service.js', () => ({
    authService: {
        verifyToken: verifyTokenMock,
    },
}));

vi.mock('../jobs/ingest.job.js', () => ({
    triggerImmediateIngest: ingestMock,
}));

vi.mock('../jobs/extraction.job.js', () => ({
    triggerImmediateExtraction: extractionMock,
}));

vi.mock('../jobs/filtering.job.js', () => ({
    triggerImmediateFiltering: filteringMock,
}));

vi.mock('../jobs/ai-stage-a.job.js', () => ({
    triggerImmediateAIStageA: stageAMock,
}));

vi.mock('../jobs/ai-stage-b.job.js', () => ({
    triggerImmediateAIStageB: stageBMock,
}));

vi.mock('../domains/content-intelligence/trend-signal.service.js', () => ({
    trendSignalService: {
        refreshRecentTrendSignals: vi.fn().mockResolvedValue({ created: 0, updated: 0, total: 0 }),
    },
}));

vi.mock('../domains/content-intelligence/trend-matching.service.js', () => ({
    trendMatchingService: {
        matchBrandToRecentSignals: vi.fn().mockResolvedValue([]),
        getRecentMatchesForBrand: vi.fn().mockResolvedValue([]),
    },
}));

describe('Internal auth and manual trigger routes', () => {
    let server: ReturnType<ReturnType<typeof express>['listen']>;
    let baseUrl: string;

    beforeAll(async () => {
        const { default: internalRoutes } = await import('../routes/internal/index.js');

        const app = express();
        app.use(express.json());
        app.use('/api/internal', internalRoutes);

        await new Promise<void>(resolve => {
            server = app.listen(0, '127.0.0.1', () => resolve());
        });

        const address = server.address();
        if (!address || typeof address === 'string') {
            throw new Error('Failed to start test server');
        }

        baseUrl = `http://127.0.0.1:${address.port}`;
    }, 30000);

    afterAll(async () => {
        if (!server) {
            return;
        }

        await new Promise<void>((resolve, reject) => {
            server.close(err => err ? reject(err) : resolve());
        });
    });

    beforeEach(() => {
        vi.clearAllMocks();
        verifyTokenMock.mockReturnValue({ userId: 1, email: 'admin@example.com', systemRole: 'ADMIN' });
        ingestMock.mockResolvedValue({ started: true });
        extractionMock.mockImplementation(async (limit?: number) => ({ started: true, limit: limit ?? 10 }));
        filteringMock.mockResolvedValue({ started: true, limit: 20 });
        stageAMock.mockResolvedValue({ started: true, limit: 5 });
        stageBMock.mockResolvedValue({ started: true, limit: 3 });
    });

    it('protects manual trigger endpoints with internal auth', async () => {
        const response = await fetch(`${baseUrl}/api/internal/content-intelligence/jobs/ingest/run`, {
            method: 'POST',
        });

        expect(response.status).toBe(401);
        expect(ingestMock).not.toHaveBeenCalled();
    });

    it('runs manual ingest trigger with valid internal token', async () => {
        const response = await fetch(`${baseUrl}/api/internal/content-intelligence/jobs/ingest/run`, {
            method: 'POST',
            headers: { Authorization: 'Bearer internal-token' },
        });

        expect(response.status).toBe(200);
        expect(ingestMock).toHaveBeenCalledTimes(1);

        const body = await response.json();
        expect(body.success).toBe(true);
        expect(body.job).toBe('ingest');
    });

    it('passes request limits to extraction trigger', async () => {
        const response = await fetch(`${baseUrl}/api/internal/content-intelligence/jobs/extraction/run`, {
            method: 'POST',
            headers: {
                Authorization: 'Bearer internal-token',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ limit: 7 }),
        });

        expect(response.status).toBe(200);
        expect(extractionMock).toHaveBeenCalledWith(7);

        const body = await response.json();
        expect(body.job).toBe('extraction');
        expect(body.result.limit).toBe(7);
    });
});
