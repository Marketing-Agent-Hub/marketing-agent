import express from 'express';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock auth service
const verifyTokenMock = vi.fn();

vi.mock('../domains/auth/internal-auth.service.js', () => ({
    authService: {
        verifyToken: verifyTokenMock,
    },
}));

// Mock job files (required by admin.routes.ts which is imported by internal/index.ts)
vi.mock('../jobs/ingest.job.js', () => ({ triggerImmediateIngest: vi.fn() }));
vi.mock('../jobs/extraction.job.js', () => ({ triggerImmediateExtraction: vi.fn() }));
vi.mock('../jobs/filtering.job.js', () => ({ triggerImmediateFiltering: vi.fn() }));
vi.mock('../jobs/ai-stage-a.job.js', () => ({ triggerImmediateAIStageA: vi.fn() }));
vi.mock('../jobs/ai-stage-b.job.js', () => ({ triggerImmediateAIStageB: vi.fn() }));

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

// Mock monitoring services
const getLogsMock = vi.fn();
const getLogStatsMock = vi.fn();
const getMetricsMock = vi.fn();
const getMetricStatsMock = vi.fn();
const getSystemMetricsMock = vi.fn();
const getHealthStatusMock = vi.fn();
const getHealthHistoryMock = vi.fn();
const getTracesMock = vi.fn();
const getTraceByIdMock = vi.fn();
const getSlowTracesMock = vi.fn();
const getTraceStatsMock = vi.fn();

vi.mock('../domains/monitoring/log.service.js', () => ({
    logService: {
        getLogs: getLogsMock,
        getLogStats: getLogStatsMock,
    },
}));

vi.mock('../domains/monitoring/metric.service.js', () => ({
    metricService: {
        getMetrics: getMetricsMock,
        getMetricStats: getMetricStatsMock,
        getSystemMetrics: getSystemMetricsMock,
        incrementCounter: vi.fn().mockResolvedValue(undefined),
        recordHistogram: vi.fn().mockResolvedValue(undefined),
    },
}));

vi.mock('../domains/monitoring/health.service.js', () => ({
    healthService: {
        getHealthStatus: getHealthStatusMock,
        getHealthHistory: getHealthHistoryMock,
    },
}));

vi.mock('../domains/monitoring/trace.service.js', () => ({
    traceService: {
        getTraces: getTracesMock,
        getTraceById: getTraceByIdMock,
        getSlowTraces: getSlowTracesMock,
        getTraceStats: getTraceStatsMock,
        storeTrace: vi.fn().mockResolvedValue(undefined),
    },
}));

vi.mock('../db/index.js', () => ({
    db: {
        systemMetric: {
            count: vi.fn().mockResolvedValue(0),
        },
        performanceTrace: {
            count: vi.fn().mockResolvedValue(0),
        },
    },
    prisma: {
        systemMetric: {
            count: vi.fn().mockResolvedValue(0),
        },
        performanceTrace: {
            count: vi.fn().mockResolvedValue(0),
        },
    },
}));

describe('Monitoring API endpoints', () => {
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
    }, 15000);

    afterAll(async () => {
        if (!server) return;
        await new Promise<void>((resolve, reject) => {
            server.close(err => (err ? reject(err) : resolve()));
        });
    });

    beforeEach(() => {
        vi.clearAllMocks();

        // Default: valid token
        verifyTokenMock.mockReturnValue({ email: 'admin@example.com' });

        // Default service responses
        getLogsMock.mockResolvedValue({ logs: [], total: 0, limit: 100, offset: 0 });
        getLogStatsMock.mockResolvedValue({ byLevel: [], byService: [] });
        getMetricsMock.mockResolvedValue({ metrics: [], total: 0, limit: 100, offset: 0 });
        getMetricStatsMock.mockResolvedValue(null);
        getSystemMetricsMock.mockResolvedValue({ memory: {}, uptime: 0, nodeVersion: 'v20', platform: 'linux', arch: 'x64' });
        getHealthStatusMock.mockResolvedValue({ overall: 'UP', services: [] });
        getHealthHistoryMock.mockResolvedValue({ checks: [], total: 0, limit: 100, offset: 0 });
        getTracesMock.mockResolvedValue({ traces: [], total: 0, limit: 100, offset: 0 });
        getTraceByIdMock.mockResolvedValue(null);
        getSlowTracesMock.mockResolvedValue([]);
        getTraceStatsMock.mockResolvedValue(null);
    });

    const authHeader = { Authorization: 'Bearer valid-token' };

    describe('Authentication guard', () => {
        const protectedEndpoints = [
            '/api/internal/monitor/logs',
            '/api/internal/monitor/metrics',
            '/api/internal/monitor/health',
            '/api/internal/monitor/traces',
            '/api/internal/monitor/overview',
        ];

        for (const endpoint of protectedEndpoints) {
            it(`returns 401 for ${endpoint} without auth`, async () => {
                const response = await fetch(`${baseUrl}${endpoint}`);
                expect(response.status).toBe(401);
                const body = await response.json();
                expect(body.error.code).toBe('UNAUTHORIZED');
            });
        }
    });

    describe('GET /api/internal/monitor/logs', () => {
        it('returns 200 with valid auth', async () => {
            const response = await fetch(`${baseUrl}/api/internal/monitor/logs`, {
                headers: authHeader,
            });
            expect(response.status).toBe(200);
            const body = await response.json();
            expect(body.success).toBe(true);
            expect(body.data).toBeDefined();
            expect(getLogsMock).toHaveBeenCalledTimes(1);
        });
    });

    describe('GET /api/internal/monitor/metrics', () => {
        it('returns 200 with valid auth', async () => {
            const response = await fetch(`${baseUrl}/api/internal/monitor/metrics`, {
                headers: authHeader,
            });
            expect(response.status).toBe(200);
            const body = await response.json();
            expect(body.success).toBe(true);
            expect(body.data).toBeDefined();
            expect(getMetricsMock).toHaveBeenCalledTimes(1);
        });
    });

    describe('GET /api/internal/monitor/health', () => {
        it('returns 200 with valid auth', async () => {
            const response = await fetch(`${baseUrl}/api/internal/monitor/health`, {
                headers: authHeader,
            });
            expect(response.status).toBe(200);
            const body = await response.json();
            expect(body.success).toBe(true);
            expect(body.data.overall).toBe('UP');
            expect(getHealthStatusMock).toHaveBeenCalledTimes(1);
        });
    });

    describe('GET /api/internal/monitor/traces', () => {
        it('returns 200 with valid auth', async () => {
            const response = await fetch(`${baseUrl}/api/internal/monitor/traces`, {
                headers: authHeader,
            });
            expect(response.status).toBe(200);
            const body = await response.json();
            expect(body.success).toBe(true);
            expect(body.data).toBeDefined();
            expect(getTracesMock).toHaveBeenCalledTimes(1);
        });
    });

    describe('GET /api/internal/monitor/overview', () => {
        it('returns 200 with valid auth', async () => {
            getTraceStatsMock.mockResolvedValue({ count: 5, avg: 100, min: 10, max: 500, p95: 400, p99: 490, errorCount: 0, errorRate: 0 });

            const response = await fetch(`${baseUrl}/api/internal/monitor/overview`, {
                headers: authHeader,
            });
            expect(response.status).toBe(200);
            const body = await response.json();
            expect(body.success).toBe(true);
            expect(body.data.health).toBeDefined();
            expect(body.data.logs).toBeDefined();
            expect(body.data.metrics).toBeDefined();
            expect(body.data.traces).toBeDefined();
            expect(body.data.timestamp).toBeDefined();
        });
    });
});
