import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { JOB_TYPES, JobType, GLOBAL_DEFAULTS, intervalMinutesToCron } from '../../../jobs/job-schedule.types.js';

/**
 * Feature: per-tenant-job-scheduling
 *
 * Property 1: JobSchedule DB round-trip
 * Validates: Requirements 1.1, 1.4
 *
 * Property 2: GlobalDefault fallback
 * Validates: Requirements 1.3, 1.5, 6.2
 *
 * Property 10: GlobalDefault update propagates to default users only
 * Validates: Requirements 8.3, 8.4
 */

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../../../db/index.js', () => ({
    prisma: {
        jobSchedule: {
            findUnique: vi.fn(),
            findMany: vi.fn(),
            upsert: vi.fn(),
            deleteMany: vi.fn(),
        },
        setting: {
            findMany: vi.fn(),
            upsert: vi.fn(),
        },
    },
}));

vi.mock('../../../lib/logger.js', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// Import after mocks
const { prisma } = await import('../../../db/index.js');
const { JobScheduleService, setScheduler } = await import('../../../jobs/job-schedule.service.js');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeDbRecord(brandId: number, jobType: JobType, cronExpression: string, enabled = true) {
    return {
        id: Math.floor(Math.random() * 10000),
        brandId,
        jobType,
        cronExpression,
        enabled,
        createdAt: new Date(),
        updatedAt: new Date(),
    };
}

const validCronArb = fc.constantFrom(
    '*/5 * * * *',
    '*/15 * * * *',
    '0 * * * *',
    '0 6 * * *',
    '0 2 * * 1',
    '*/3 * * * *',
    '*/10 * * * *',
);

const jobTypeArb = fc.constantFrom(...JOB_TYPES);

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('JobScheduleService — property tests', () => {
    let service: InstanceType<typeof JobScheduleService>;

    beforeEach(() => {
        vi.clearAllMocks();
        service = new JobScheduleService();
        setScheduler(null); // no scheduler during unit tests
    });

    // ─── Property 1: DB round-trip ─────────────────────────────────────────────

    /**
     * Property 1: JobSchedule DB round-trip
     * Validates: Requirements 1.1, 1.4
     *
     * For any valid (brandId, jobType, cronExpression), after upserting the schedule,
     * getEffective should return the same cronExpression with isDefault: false.
     */
    it('Property 1: upsert then getEffective returns the same cronExpression', async () => {
        // Feature: per-tenant-job-scheduling, Property 1: JobSchedule DB round-trip
        await fc.assert(
            fc.asyncProperty(
                fc.integer({ min: 1, max: 9999 }),
                jobTypeArb,
                validCronArb,
                async (brandId, jobType, cronExpression) => {
                    const dbRecord = makeDbRecord(brandId, jobType, cronExpression);

                    // upsert returns the record
                    vi.mocked(prisma.jobSchedule.upsert).mockResolvedValue(dbRecord as any);
                    // getEffective finds the record
                    vi.mocked(prisma.jobSchedule.findUnique).mockResolvedValue(dbRecord as any);

                    await service.upsert(brandId, jobType, { cronExpression, enabled: true });
                    const effective = await service.getEffective(brandId, jobType);

                    return effective.cronExpression === cronExpression && effective.isDefault === false;
                }
            ),
            { numRuns: 100 }
        );
    });

    // ─── Property 2: GlobalDefault fallback ───────────────────────────────────

    /**
     * Property 2: GlobalDefault fallback
     * Validates: Requirements 1.3, 1.5, 6.2
     *
     * For any (brandId, jobType) where no custom JobSchedule exists,
     * getEffective should return isDefault: true and the hardcoded GLOBAL_DEFAULTS cron.
     */
    it('Property 2: getEffective returns GlobalDefault when no custom schedule exists', async () => {
        // Feature: per-tenant-job-scheduling, Property 2: GlobalDefault fallback
        await fc.assert(
            fc.asyncProperty(
                fc.integer({ min: 1, max: 9999 }),
                jobTypeArb,
                async (brandId, jobType) => {
                    // No custom record in DB
                    vi.mocked(prisma.jobSchedule.findUnique).mockResolvedValue(null);
                    // No overrides in Setting table
                    vi.mocked(prisma.setting.findMany).mockResolvedValue([]);

                    const effective = await service.getEffective(brandId, jobType);

                    return (
                        effective.isDefault === true &&
                        effective.cronExpression === GLOBAL_DEFAULTS[jobType] &&
                        effective.enabled === true
                    );
                }
            ),
            { numRuns: 100 }
        );
    });

    // ─── Property 10: GlobalDefault propagation isolation ─────────────────────

    /**
     * Property 10: GlobalDefault update propagates to default users only
     * Validates: Requirements 8.3, 8.4
     *
     * listEffective for a brand with NO custom schedule should reflect the new GlobalDefault.
     * listEffective for a brand WITH a custom schedule should remain unchanged.
     */
    it('Property 10: GlobalDefault update only affects brands without custom schedules', async () => {
        // Feature: per-tenant-job-scheduling, Property 10: GlobalDefault update propagates to default users only
        await fc.assert(
            fc.asyncProperty(
                fc.integer({ min: 1, max: 4999 }),
                fc.integer({ min: 5000, max: 9999 }),
                jobTypeArb,
                validCronArb,
                validCronArb,
                async (brandWithCustom, brandWithDefault, jobType, customCron, newDefaultCron) => {
                    fc.pre(customCron !== newDefaultCron);

                    const customRecord = makeDbRecord(brandWithCustom, jobType, customCron);

                    // Brand with custom: has a record for this jobType
                    vi.mocked(prisma.jobSchedule.findMany).mockImplementation(async (args: any) => {
                        if (args?.where?.brandId === brandWithCustom) return [customRecord];
                        return []; // brand with default has no custom records
                    });

                    // Setting table returns the new default
                    vi.mocked(prisma.setting.findMany).mockResolvedValue([
                        { id: 1, key: `job_default:${jobType}`, value: newDefaultCron, description: null, createdAt: new Date(), updatedAt: new Date() },
                    ]);

                    const schedulesWithCustom = await service.listEffective(brandWithCustom);
                    const schedulesWithDefault = await service.listEffective(brandWithDefault);

                    const customEntry = schedulesWithCustom.find(s => s.jobType === jobType)!;
                    const defaultEntry = schedulesWithDefault.find(s => s.jobType === jobType)!;

                    // Brand with custom: should keep its custom cron, not the new default
                    const customUnchanged = customEntry.cronExpression === customCron && customEntry.isDefault === false;
                    // Brand with default: should use the new GlobalDefault
                    const defaultUpdated = defaultEntry.cronExpression === newDefaultCron && defaultEntry.isDefault === true;

                    return customUnchanged && defaultUpdated;
                }
            ),
            { numRuns: 100 }
        );
    });

    // ─── Example-based tests ──────────────────────────────────────────────────

    describe('getDefaults — example-based', () => {
        it('returns GLOBAL_DEFAULTS when Setting table is empty', async () => {
            vi.mocked(prisma.setting.findMany).mockResolvedValue([]);
            const defaults = await service.getDefaults();
            expect(defaults).toEqual(GLOBAL_DEFAULTS);
        });

        it('overrides with Setting table values', async () => {
            vi.mocked(prisma.setting.findMany).mockResolvedValue([
                { id: 1, key: 'job_default:ingest', value: '*/30 * * * *', description: null, createdAt: new Date(), updatedAt: new Date() },
            ]);
            const defaults = await service.getDefaults();
            expect(defaults.ingest).toBe('*/30 * * * *');
            expect(defaults.extraction).toBe(GLOBAL_DEFAULTS.extraction);
        });
    });

    describe('listEffective — example-based', () => {
        it('returns exactly 9 entries', async () => {
            vi.mocked(prisma.jobSchedule.findMany).mockResolvedValue([]);
            vi.mocked(prisma.setting.findMany).mockResolvedValue([]);
            const schedules = await service.listEffective(1);
            expect(schedules).toHaveLength(9);
            expect(schedules.map(s => s.jobType).sort()).toEqual([...JOB_TYPES].sort());
        });
    });
});
