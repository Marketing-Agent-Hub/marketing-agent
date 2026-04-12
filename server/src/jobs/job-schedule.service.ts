import { prisma } from '../db/index.js';
import cron from 'node-cron';
import {
    JOB_TYPES,
    JobType,
    ScheduleConfig,
    JobScheduleRecord,
    EffectiveSchedule,
    GLOBAL_DEFAULTS,
    intervalMinutesToCron,
    validateScheduleConfig,
} from './job-schedule.types.js';
import { logger } from '../lib/logger.js';

// Lazy scheduler injection to avoid circular dependency
// tenant-job-scheduler.ts imports this file, so we use setter injection
let _scheduler: any = null;

export function setScheduler(scheduler: any): void {
    _scheduler = scheduler;
}

function getScheduler(): any {
    return _scheduler;
}

export class JobScheduleService {
    /**
     * Validate a ScheduleConfig and resolve it to a cronExpression.
     * Returns { cronExpression } on success or { error } on failure.
     * If neither cronExpression nor intervalMinutes is provided, cronExpression will be empty string
     * (caller should use GlobalDefault).
     */
    validateAndResolve(config: ScheduleConfig): { cronExpression: string } | { error: string } {
        const error = validateScheduleConfig(config);
        if (error) return { error };

        if (config.intervalMinutes !== undefined) {
            return { cronExpression: intervalMinutesToCron(config.intervalMinutes) };
        }
        if (config.cronExpression !== undefined) {
            return { cronExpression: config.cronExpression };
        }
        // Neither provided — caller will use GlobalDefault
        return { cronExpression: '' };
    }

    /**
     * Get all GlobalDefaults: reads from Setting table (key: job_default:{jobType}),
     * falls back to GLOBAL_DEFAULTS hardcoded values.
     */
    async getDefaults(): Promise<Record<JobType, string>> {
        const records = await prisma.setting.findMany({
            where: { key: { startsWith: 'job_default:' } },
        });

        const dbMap = new Map(records.map(r => [r.key, r.value]));
        const result = {} as Record<JobType, string>;
        for (const jobType of JOB_TYPES) {
            result[jobType] = dbMap.get(`job_default:${jobType}`) ?? GLOBAL_DEFAULTS[jobType];
        }
        return result;
    }

    /**
     * Update the GlobalDefault cron for a jobType.
     * Validates the cron expression, upserts the Setting, then reschedules default users.
     */
    async updateDefault(jobType: JobType, cronExpression: string): Promise<void> {
        if (!cron.validate(cronExpression)) {
            throw new Error(`cronExpression không hợp lệ: "${cronExpression}"`);
        }

        const key = `job_default:${jobType}`;
        await prisma.setting.upsert({
            where: { key },
            update: { value: cronExpression },
            create: { key, value: cronExpression },
        });

        logger.info({ jobType, cronExpression }, '[JobScheduleService] Updated GlobalDefault');

        const scheduler = getScheduler();
        if (scheduler) {
            await scheduler.rescheduleDefaultUsers(jobType, cronExpression);
        }
    }

    /**
     * Get the effective schedule for a (brandId, jobType) pair.
     * Returns custom config if exists, otherwise GlobalDefault with isDefault: true.
     */
    async getEffective(brandId: number, jobType: JobType): Promise<EffectiveSchedule> {
        const record = await prisma.jobSchedule.findUnique({
            where: { brandId_jobType: { brandId, jobType } },
        });

        if (record) {
            return {
                jobType: record.jobType as JobType,
                cronExpression: record.cronExpression,
                enabled: record.enabled,
                isDefault: false,
            };
        }

        const defaults = await this.getDefaults();
        return {
            jobType,
            cronExpression: defaults[jobType],
            enabled: true,
            isDefault: true,
        };
    }

    /**
     * List effective schedules for all 9 job types for a brand.
     * Returns 9 entries — custom config where available, GlobalDefault otherwise.
     */
    async listEffective(brandId: number): Promise<EffectiveSchedule[]> {
        const customRecords = await prisma.jobSchedule.findMany({ where: { brandId } });
        const customMap = new Map(customRecords.map(r => [r.jobType, r]));
        const defaults = await this.getDefaults();

        return JOB_TYPES.map(jobType => {
            const custom = customMap.get(jobType);
            if (custom) {
                return {
                    jobType,
                    cronExpression: custom.cronExpression,
                    enabled: custom.enabled,
                    isDefault: false,
                };
            }
            return {
                jobType,
                cronExpression: defaults[jobType],
                enabled: true,
                isDefault: true,
            };
        });
    }

    /**
     * Upsert a JobSchedule for (brandId, jobType).
     * Validates config, resolves cronExpression, persists to DB, then triggers reschedule.
     */
    async upsert(brandId: number, jobType: JobType, config: ScheduleConfig): Promise<JobScheduleRecord> {
        const resolved = this.validateAndResolve(config);
        if ('error' in resolved) throw new Error(resolved.error);

        let cronExpression = resolved.cronExpression;
        if (!cronExpression) {
            const defaults = await this.getDefaults();
            cronExpression = defaults[jobType];
        }

        const record = await prisma.jobSchedule.upsert({
            where: { brandId_jobType: { brandId, jobType } },
            create: { brandId, jobType, cronExpression, enabled: config.enabled },
            update: { cronExpression, enabled: config.enabled, updatedAt: new Date() },
        });

        logger.info({ brandId, jobType, cronExpression, enabled: config.enabled }, '[JobScheduleService] Upserted schedule');

        const scheduler = getScheduler();
        if (scheduler) {
            await scheduler.reschedule(brandId, jobType, cronExpression, config.enabled);
        }

        return {
            id: record.id,
            brandId: record.brandId,
            jobType: record.jobType as JobType,
            cronExpression: record.cronExpression,
            enabled: record.enabled,
            isDefault: false,
            createdAt: record.createdAt,
            updatedAt: record.updatedAt,
        };
    }

    /**
     * Remove a custom JobSchedule for (brandId, jobType).
     * After removal, reschedules the brand back to the GlobalDefault for that jobType.
     */
    async remove(brandId: number, jobType: JobType): Promise<void> {
        await prisma.jobSchedule.deleteMany({ where: { brandId, jobType } });

        logger.info({ brandId, jobType }, '[JobScheduleService] Removed custom schedule, reverting to GlobalDefault');

        const defaults = await this.getDefaults();
        const scheduler = getScheduler();
        if (scheduler) {
            await scheduler.reschedule(brandId, jobType, defaults[jobType], true);
        }
    }
}

export const jobScheduleService = new JobScheduleService();
