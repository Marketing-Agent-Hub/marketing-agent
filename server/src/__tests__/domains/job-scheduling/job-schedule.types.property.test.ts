import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import cron from 'node-cron';
import { intervalMinutesToCron, validateScheduleConfig } from '../../../jobs/job-schedule.types.js';

/**
 * Feature: per-tenant-job-scheduling
 *
 * Property 3: intervalMinutes conversion produces valid cron
 * Validates: Requirements 2.1
 *
 * Property 4: Mutual exclusion of cronExpression and intervalMinutes
 * Validates: Requirements 2.5
 */

describe('job-schedule.types — property tests', () => {
    // ─── Property 3 ───────────────────────────────────────────────────────────

    /**
     * Property 3: intervalMinutes conversion produces valid cron
     * Validates: Requirements 2.1
     *
     * For any positive integer intervalMinutes in [1, 1440],
     * intervalMinutesToCron() should produce a string that passes node-cron.validate().
     */
    it('Property 3: intervalMinutesToCron — always produces a valid cron expression', () => {
        // Feature: per-tenant-job-scheduling, Property 3: intervalMinutes conversion produces valid cron
        fc.assert(
            fc.property(
                fc.integer({ min: 1, max: 1440 }),
                (minutes) => cron.validate(intervalMinutesToCron(minutes)) === true
            ),
            { numRuns: 100 }
        );
    });

    // ─── Property 4 ───────────────────────────────────────────────────────────

    /**
     * Property 4: Mutual exclusion of cronExpression and intervalMinutes
     * Validates: Requirements 2.5
     *
     * For any ScheduleConfig where both cronExpression and intervalMinutes are defined,
     * validateScheduleConfig() should return a non-null error string.
     */
    it('Property 4: validateScheduleConfig — rejects configs with both cronExpression and intervalMinutes', () => {
        // Feature: per-tenant-job-scheduling, Property 4: Mutual exclusion of cronExpression and intervalMinutes
        fc.assert(
            fc.property(
                fc.tuple(fc.string(), fc.integer({ min: 1 })),
                ([cronExpression, intervalMinutes]) =>
                    validateScheduleConfig({ cronExpression, intervalMinutes, enabled: true }) !== null
            ),
            { numRuns: 100 }
        );
    });

    // ─── Example-based tests ──────────────────────────────────────────────────

    describe('intervalMinutesToCron — example-based', () => {
        it('1 minute → every-minute cron', () => {
            expect(intervalMinutesToCron(1)).toBe('* * * * *');
        });

        it('5 minutes → */5 * * * *', () => {
            expect(intervalMinutesToCron(5)).toBe('*/5 * * * *');
        });

        it('60 minutes → 0 * * * *', () => {
            expect(intervalMinutesToCron(60)).toBe('0 * * * *');
        });

        it('120 minutes → 0 */2 * * *', () => {
            expect(intervalMinutesToCron(120)).toBe('0 */2 * * *');
        });
    });

    describe('validateScheduleConfig — example-based', () => {
        it('no schedule fields → valid (null)', () => {
            expect(validateScheduleConfig({ enabled: true })).toBeNull();
        });

        it('valid cronExpression only → valid (null)', () => {
            expect(validateScheduleConfig({ cronExpression: '*/5 * * * *', enabled: true })).toBeNull();
        });

        it('valid intervalMinutes only → valid (null)', () => {
            expect(validateScheduleConfig({ intervalMinutes: 15, enabled: true })).toBeNull();
        });

        it('invalid cronExpression → non-null error', () => {
            expect(validateScheduleConfig({ cronExpression: 'invalid', enabled: true })).not.toBeNull();
        });

        it('intervalMinutes = 0 → non-null error', () => {
            expect(validateScheduleConfig({ intervalMinutes: 0, enabled: true })).not.toBeNull();
        });
    });
});
