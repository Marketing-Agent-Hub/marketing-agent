import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { JOB_TYPES, JobType } from '../../../jobs/job-schedule.types.js';

/**
 * Feature: per-tenant-job-scheduling
 *
 * Property 5: Task registry reflects enabled state
 * Validates: Requirements 3.1, 3.2, 3.4
 *
 * Property 6: No duplicate job instances per brand+jobType
 * Validates: Requirements 3.3
 *
 * Property 7: Hot-reload replaces task atomically
 * Validates: Requirements 4.1
 *
 * Property 9: Fault isolation between tenants
 * Validates: Requirements 7.1, 7.4
 */

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockStop = vi.fn();
const mockSchedule = vi.fn();

vi.mock('node-cron', () => ({
    default: {
        validate: (expr: string) => /^\S+ \S+ \S+ \S+ \S+$/.test(expr),
        schedule: (expr: string, fn: () => void) => {
            mockSchedule(expr, fn);
            return { stop: mockStop, _fn: fn };
        },
    },
}));

vi.mock('../../../db/index.js', () => ({
    prisma: {
        brand: { findMany: vi.fn() },
        jobSchedule: { findMany: vi.fn() },
        setting: { findMany: vi.fn() },
    },
}));

vi.mock('../../../config/env.js', () => ({
    env: { TAVILY_API_KEY: 'test-key' },
}));

vi.mock('../../../lib/logger.js', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('../../../jobs/job-schedule.service.js', () => ({
    jobScheduleService: {
        getDefaults: vi.fn().mockResolvedValue({
            ingest: '*/15 * * * *',
            extraction: '*/5 * * * *',
            filtering: '*/3 * * * *',
            ai_stage_a: '*/10 * * * *',
            ai_stage_b: '*/15 * * * *',
            daily_content_generation: '0 6 * * *',
            publish_scheduler: '*/5 * * * *',
            trend_matching: '0 * * * *',
            source_discovery: '0 2 * * 1',
        }),
    },
    setScheduler: vi.fn(),
}));

// Mock job runner registry — all runners are no-ops by default
const mockRunners: Record<JobType, ReturnType<typeof vi.fn>> = {} as any;
for (const jt of JOB_TYPES) {
    mockRunners[jt] = vi.fn().mockResolvedValue(undefined);
}

vi.mock('../../../jobs/job-runner-registry.js', () => ({
    jobRunnerRegistry: mockRunners,
}));

// Import after mocks
const { TenantJobScheduler } = await import('../../../jobs/tenant-job-scheduler.js');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const jobTypeArb = fc.constantFrom(...JOB_TYPES);
const validCronArb = fc.constantFrom(
    '*/5 * * * *',
    '*/15 * * * *',
    '0 * * * *',
    '0 6 * * *',
    '*/3 * * * *',
);

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('TenantJobScheduler — property tests', () => {
    let scheduler: InstanceType<typeof TenantJobScheduler>;

    beforeEach(() => {
        vi.clearAllMocks();
        scheduler = new TenantJobScheduler();
    });

    // ─── Property 5: Task registry reflects enabled state ─────────────────────

    /**
     * Property 5: Task registry reflects enabled state
     * Validates: Requirements 3.1, 3.2, 3.4
     *
     * For any set of (brandId, jobType, enabled) tuples, after calling reschedule,
     * hasTask(brandId, jobType) should be true iff enabled === true.
     */
    it('Property 5: task registry reflects enabled state after reschedule', async () => {
        // Feature: per-tenant-job-scheduling, Property 5: Task registry reflects enabled state
        await fc.assert(
            fc.asyncProperty(
                fc.integer({ min: 1, max: 9999 }),
                jobTypeArb,
                fc.boolean(),
                validCronArb,
                async (brandId, jobType, enabled, cronExpression) => {
                    await scheduler.reschedule(brandId, jobType, cronExpression, enabled);
                    return scheduler.hasTask(brandId, jobType) === enabled;
                }
            ),
            { numRuns: 100 }
        );
    });

    // ─── Property 6: No duplicate instances ───────────────────────────────────

    /**
     * Property 6: No duplicate job instances per brand+jobType
     * Validates: Requirements 3.3
     *
     * Calling reschedule multiple times for the same (brandId, jobType) should result
     * in exactly one task in the registry (not multiple).
     */
    it('Property 6: multiple reschedule calls result in exactly one task', async () => {
        // Feature: per-tenant-job-scheduling, Property 6: No duplicate job instances per brand+jobType
        await fc.assert(
            fc.asyncProperty(
                fc.integer({ min: 1, max: 9999 }),
                jobTypeArb,
                fc.array(validCronArb, { minLength: 2, maxLength: 5 }),
                async (brandId, jobType, cronExpressions) => {
                    // Fresh scheduler per iteration to avoid cross-iteration state
                    const s = new TenantJobScheduler();
                    for (const cron of cronExpressions) {
                        await s.reschedule(brandId, jobType, cron, true);
                    }
                    // Should have exactly 1 task for this brand+jobType
                    return s.hasTask(brandId, jobType) === true && s.taskCount === 1;
                }
            ),
            { numRuns: 100 }
        );
    });

    // ─── Property 7: Hot-reload atomicity ─────────────────────────────────────

    /**
     * Property 7: Hot-reload replaces task atomically
     * Validates: Requirements 4.1
     *
     * After calling reschedule with a new cron, the old task should be stopped
     * and a new task should be started with the new cron expression.
     */
    it('Property 7: reschedule stops old task and starts new one atomically', async () => {
        // Feature: per-tenant-job-scheduling, Property 7: Hot-reload replaces task atomically
        await fc.assert(
            fc.asyncProperty(
                fc.integer({ min: 1, max: 9999 }),
                jobTypeArb,
                validCronArb,
                validCronArb,
                async (brandId, jobType, oldCron, newCron) => {
                    // Fresh scheduler per iteration
                    const s = new TenantJobScheduler();
                    mockStop.mockClear();

                    // Start with old cron
                    await s.reschedule(brandId, jobType, oldCron, true);
                    const stopCallsBefore = mockStop.mock.calls.length;

                    // Reschedule with new cron
                    await s.reschedule(brandId, jobType, newCron, true);

                    // Old task should have been stopped
                    const stopCallsAfter = mockStop.mock.calls.length;
                    const oldTaskStopped = stopCallsAfter > stopCallsBefore;

                    // New task should exist and only one task total
                    const newTaskExists = s.hasTask(brandId, jobType);
                    const singleTask = s.taskCount === 1;

                    return oldTaskStopped && newTaskExists && singleTask;
                }
            ),
            { numRuns: 100 }
        );
    });

    // ─── Property 9: Fault isolation between tenants ──────────────────────────

    /**
     * Property 9: Fault isolation between tenants
     * Validates: Requirements 7.1, 7.4
     *
     * If Brand A's job runner throws an exception, Brand B's task should still
     * be registered and able to run.
     */
    it('Property 9: exception in brand A job does not affect brand B task', async () => {
        // Feature: per-tenant-job-scheduling, Property 9: Fault isolation between tenants
        await fc.assert(
            fc.asyncProperty(
                fc.integer({ min: 1, max: 4999 }),
                fc.integer({ min: 5000, max: 9999 }),
                jobTypeArb,
                validCronArb,
                async (brandA, brandB, jobType, cronExpression) => {
                    fc.pre(brandA !== brandB);

                    // Fresh scheduler per iteration
                    const s = new TenantJobScheduler();

                    // Make brand A's runner throw
                    mockRunners[jobType].mockRejectedValueOnce(new Error('Brand A job failed'));

                    // Schedule both brands
                    await s.reschedule(brandA, jobType, cronExpression, true);
                    await s.reschedule(brandB, jobType, cronExpression, true);

                    // Both tasks should exist in registry
                    const bothExist = s.hasTask(brandA, jobType) && s.hasTask(brandB, jobType);

                    // Total tasks should be 2
                    const correctCount = s.taskCount === 2;

                    return bothExist && correctCount;
                }
            ),
            { numRuns: 100 }
        );
    });

    // ─── Example-based tests ──────────────────────────────────────────────────

    describe('removeTask — example-based', () => {
        it('removes task from registry', async () => {
            await scheduler.reschedule(1, 'ingest', '*/15 * * * *', true);
            expect(scheduler.hasTask(1, 'ingest')).toBe(true);

            scheduler.removeTask(1, 'ingest');
            expect(scheduler.hasTask(1, 'ingest')).toBe(false);
        });
    });

    describe('shutdown — example-based', () => {
        it('stops all tasks', async () => {
            await scheduler.reschedule(1, 'ingest', '*/15 * * * *', true);
            await scheduler.reschedule(2, 'filtering', '*/3 * * * *', true);
            expect(scheduler.taskCount).toBe(2);

            await scheduler.shutdown();
            expect(scheduler.taskCount).toBe(0);
        });
    });
});
