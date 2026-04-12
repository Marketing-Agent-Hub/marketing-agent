import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import cron from 'node-cron';
import { JOB_TYPES, GLOBAL_DEFAULTS } from '../../../jobs/job-schedule.types.js';

/**
 * Feature: per-tenant-job-scheduling
 *
 * Property 8: GET /job-schedules returns all 9 job types
 * Validates: Requirements 5.1
 */

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../../../db/index.js', () => ({
    prisma: {
        brand: { findUnique: vi.fn(), count: vi.fn() },
        jobSchedule: { findMany: vi.fn(), findUnique: vi.fn(), upsert: vi.fn(), deleteMany: vi.fn(), count: vi.fn() },
        setting: { findMany: vi.fn(), upsert: vi.fn() },
    },
}));

vi.mock('../../../lib/logger.js', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('../../../jobs/tenant-job-scheduler.js', () => ({
    tenantJobScheduler: { reschedule: vi.fn(), removeTask: vi.fn(), rescheduleDefaultUsers: vi.fn() },
}));

vi.mock('../../../jobs/job-schedule.service.js', async () => {
    const actual = await vi.importActual('../../../jobs/job-schedule.service.js') as any;
    return actual;
});

const { prisma } = await import('../../../db/index.js');
const { jobScheduleService, setScheduler } = await import('../../../jobs/job-schedule.service.js');

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('JobSchedule API — property tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        setScheduler(null);
    });

    /**
     * Property 8: GET /job-schedules returns all 9 job types
     * Validates: Requirements 5.1
     *
     * For any valid brandId, listEffective should return exactly 9 entries —
     * one for each JobType — each with a valid cronExpression.
     */
    it('Property 8: listEffective always returns exactly 9 entries with valid cron expressions', async () => {
        // Feature: per-tenant-job-scheduling, Property 8: GET /job-schedules returns all 9 job types
        await fc.assert(
            fc.asyncProperty(
                fc.integer({ min: 1, max: 9999 }),
                async (brandId) => {
                    // No custom schedules, no Setting overrides
                    vi.mocked(prisma.jobSchedule.findMany).mockResolvedValue([]);
                    vi.mocked(prisma.setting.findMany).mockResolvedValue([]);

                    const schedules = await jobScheduleService.listEffective(brandId);

                    // Must have exactly 9 entries
                    if (schedules.length !== 9) return false;

                    // Must cover all 9 job types
                    const returnedTypes = new Set(schedules.map(s => s.jobType));
                    if (returnedTypes.size !== 9) return false;
                    for (const jt of JOB_TYPES) {
                        if (!returnedTypes.has(jt)) return false;
                    }

                    // Each entry must have a valid cron expression
                    for (const s of schedules) {
                        if (!cron.validate(s.cronExpression)) return false;
                    }

                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });

    // ─── Example-based tests ──────────────────────────────────────────────────

    it('listEffective returns GlobalDefaults when no custom schedules exist', async () => {
        vi.mocked(prisma.jobSchedule.findMany).mockResolvedValue([]);
        vi.mocked(prisma.setting.findMany).mockResolvedValue([]);

        const schedules = await jobScheduleService.listEffective(1);

        expect(schedules).toHaveLength(9);
        for (const s of schedules) {
            expect(s.isDefault).toBe(true);
            expect(s.cronExpression).toBe(GLOBAL_DEFAULTS[s.jobType]);
        }
    });

    it('validateAndResolve returns error for invalid jobType in PUT request', () => {
        const result = jobScheduleService.validateAndResolve({
            cronExpression: 'not-a-valid-cron',
            enabled: true,
        });
        expect('error' in result).toBe(true);
    });

    it('validateAndResolve returns error when both cronExpression and intervalMinutes provided', () => {
        const result = jobScheduleService.validateAndResolve({
            cronExpression: '*/5 * * * *',
            intervalMinutes: 5,
            enabled: true,
        });
        expect('error' in result).toBe(true);
    });
});
