import cron, { ScheduledTask } from 'node-cron';
import { prisma } from '../db/index.js';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { JOB_TYPES, JobType, TaskKey } from './job-schedule.types.js';
import { jobScheduleService } from './job-schedule.service.js';
import type { IJobOrchestrator } from './job-orchestrator.js';

export interface ICronScheduler {
    initialize(): Promise<void>;
    reschedule(brandId: number, jobType: JobType, cronExpression: string, enabled: boolean): Promise<void>;
    rescheduleDefaultUsers(jobType: JobType, newCron: string): Promise<void>;
    removeTask(brandId: number, jobType: JobType): void;
    shutdown(): Promise<void>;
    readonly taskCount: number;
    hasTask(brandId: number, jobType: JobType): boolean;
}

/**
 * Manages node-cron tasks for all brands.
 * Knows nothing about job business logic — delegates execution to IJobOrchestrator.
 * Requirements: 4.1, 4.2, 4.3, 4.6
 */
export class CronScheduler implements ICronScheduler {
    private tasks: Map<TaskKey, ScheduledTask> = new Map();
    /** Concurrency guard — independent of JobOrchestrator. Requirements: 4.6 */
    private runningFlags: Map<TaskKey, boolean> = new Map();

    constructor(private readonly orchestrator: IJobOrchestrator) { }

    /**
     * Load all active brands + their schedules from DB and start cron tasks.
     * Requirements: 4.1
     */
    async initialize(): Promise<void> {
        logger.info('[CronScheduler] Initializing...');

        const brands = await prisma.brand.findMany({
            where: { status: 'ACTIVE' },
            select: { id: true },
        });

        if (brands.length === 0) {
            logger.info('[CronScheduler] No active brands found, no tasks scheduled');
            return;
        }

        const customSchedules = await prisma.jobSchedule.findMany({
            where: { brandId: { in: brands.map(b => b.id) } },
        });

        const defaults = await jobScheduleService.getDefaults();

        const customMap = new Map<string, { cronExpression: string; enabled: boolean }>();
        for (const s of customSchedules) {
            customMap.set(`${s.brandId}:${s.jobType}`, {
                cronExpression: s.cronExpression,
                enabled: s.enabled,
            });
        }

        let started = 0;
        for (const brand of brands) {
            for (const jobType of JOB_TYPES) {
                if (jobType === 'source_discovery' && !env.TAVILY_API_KEY) continue;

                const custom = customMap.get(`${brand.id}:${jobType}`);
                const cronExpression = custom?.cronExpression ?? defaults[jobType];
                const enabled = custom?.enabled ?? true;

                if (enabled) {
                    const key: TaskKey = `${brand.id}:${jobType}`;
                    this.startTask(key, cronExpression, brand.id, jobType);
                    started++;
                }
            }
        }

        logger.info(`[CronScheduler] Initialized — ${started} tasks started across ${brands.length} brands`);
    }

    /**
     * Stop existing task and start a new one if enabled.
     * Requirements: 4.1
     */
    async reschedule(brandId: number, jobType: JobType, cronExpression: string, enabled: boolean): Promise<void> {
        const key: TaskKey = `${brandId}:${jobType}`;
        this.stopTask(key);

        if (enabled) {
            if (jobType === 'source_discovery' && !env.TAVILY_API_KEY) {
                logger.warn({ brandId, jobType }, '[CronScheduler] Skipping source_discovery — TAVILY_API_KEY not configured');
                return;
            }
            this.startTask(key, cronExpression, brandId, jobType);
            logger.info({ brandId, jobType, cronExpression }, '[CronScheduler] Rescheduled task');
        } else {
            logger.info({ brandId, jobType }, '[CronScheduler] Task disabled, not restarting');
        }
    }

    /**
     * Reschedule all brands using the GlobalDefault for a given jobType.
     */
    async rescheduleDefaultUsers(jobType: JobType, newCron: string): Promise<void> {
        const customBrandIds = new Set(
            (await prisma.jobSchedule.findMany({
                where: { jobType },
                select: { brandId: true },
            })).map(r => r.brandId),
        );

        const brands = await prisma.brand.findMany({
            where: { status: 'ACTIVE' },
            select: { id: true },
        });

        let count = 0;
        for (const brand of brands) {
            if (!customBrandIds.has(brand.id)) {
                await this.reschedule(brand.id, jobType, newCron, true);
                count++;
            }
        }

        logger.info({ jobType, newCron, count }, '[CronScheduler] Rescheduled default users');
    }

    removeTask(brandId: number, jobType: JobType): void {
        const key: TaskKey = `${brandId}:${jobType}`;
        this.stopTask(key);
    }

    async shutdown(): Promise<void> {
        logger.info(`[CronScheduler] Shutting down ${this.tasks.size} tasks...`);
        for (const [key] of this.tasks) {
            this.stopTask(key);
        }
        logger.info('[CronScheduler] Shutdown complete');
    }

    get taskCount(): number {
        return this.tasks.size;
    }

    hasTask(brandId: number, jobType: JobType): boolean {
        return this.tasks.has(`${brandId}:${jobType}`);
    }

    // ─── Private helpers ──────────────────────────────────────────────────────

    private stopTask(key: TaskKey): void {
        const existing = this.tasks.get(key);
        if (existing) {
            existing.stop();
            this.tasks.delete(key);
            this.runningFlags.delete(key);
        }
    }

    private startTask(key: TaskKey, cronExpression: string, brandId: number, jobType: JobType): void {
        if (!cron.validate(cronExpression)) {
            logger.error({ key, cronExpression }, '[CronScheduler] Invalid cron expression, skipping task');
            return;
        }

        const task = cron.schedule(cronExpression, async () => {
            // Concurrency guard — independent of orchestrator. Requirements: 4.6
            if (this.runningFlags.get(key)) {
                logger.warn({ brandId, jobType }, '[CronScheduler] Job already running, skipping tick');
                return;
            }

            this.runningFlags.set(key, true);
            try {
                // Delegate to orchestrator — CronScheduler does NOT call job functions directly
                // Requirements: 4.3
                await this.orchestrator.run(brandId, jobType);
            } catch (err) {
                logger.error({ err, brandId, jobType }, '[CronScheduler] Job execution failed');
            } finally {
                this.runningFlags.set(key, false);
            }
        });

        this.tasks.set(key, task);
    }
}
