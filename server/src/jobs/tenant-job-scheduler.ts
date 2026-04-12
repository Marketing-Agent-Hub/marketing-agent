import cron, { ScheduledTask } from 'node-cron';
import { prisma } from '../db/index.js';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import {
    JOB_TYPES,
    JobType,
    TaskKey,
    GLOBAL_DEFAULTS,
} from './job-schedule.types.js';
import { jobScheduleService, setScheduler } from './job-schedule.service.js';

export class TenantJobScheduler {
    private tasks: Map<TaskKey, ScheduledTask> = new Map();
    private runningFlags: Map<TaskKey, boolean> = new Map();

    // Lazy import of job runner registry to avoid circular deps at module load time
    private _registry: Record<JobType, (brandId: number) => Promise<void>> | null = null;

    private async getRegistry(): Promise<Record<JobType, (brandId: number) => Promise<void>>> {
        if (!this._registry) {
            const mod = await import('./job-runner-registry.js');
            this._registry = mod.jobRunnerRegistry;
        }
        return this._registry;
    }

    /**
     * Initialize the scheduler: load all active brands + their schedules from DB,
     * then start cron tasks for each enabled (brandId, jobType) pair.
     */
    async initialize(): Promise<void> {
        logger.info('[TenantJobScheduler] Initializing...');

        // Register self with service to enable hot-reload
        setScheduler(this);

        const brands = await prisma.brand.findMany({
            where: { status: 'ACTIVE' },
            select: { id: true },
        });

        if (brands.length === 0) {
            logger.info('[TenantJobScheduler] No active brands found, no tasks scheduled');
            return;
        }

        const customSchedules = await prisma.jobSchedule.findMany({
            where: { brandId: { in: brands.map(b => b.id) } },
        });

        const defaults = await jobScheduleService.getDefaults();

        // Build a map: brandId → jobType → { cronExpression, enabled }
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
                // Skip source_discovery if TAVILY_API_KEY not configured
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

        logger.info(`[TenantJobScheduler] Initialized — ${started} tasks started across ${brands.length} brands`);
    }

    /**
     * Reschedule a single (brandId, jobType) task.
     * Stops the existing task (if any) and starts a new one if enabled.
     */
    async reschedule(brandId: number, jobType: JobType, cronExpression: string, enabled: boolean): Promise<void> {
        const key: TaskKey = `${brandId}:${jobType}`;
        this.stopTask(key);

        if (enabled) {
            // Skip source_discovery if TAVILY_API_KEY not configured
            if (jobType === 'source_discovery' && !env.TAVILY_API_KEY) {
                logger.warn({ brandId, jobType }, '[TenantJobScheduler] Skipping source_discovery — TAVILY_API_KEY not configured');
                return;
            }
            this.startTask(key, cronExpression, brandId, jobType);
            logger.info({ brandId, jobType, cronExpression }, '[TenantJobScheduler] Rescheduled task');
        } else {
            logger.info({ brandId, jobType }, '[TenantJobScheduler] Task disabled, not restarting');
        }
    }

    /**
     * Reschedule all brands that are using the GlobalDefault for a given jobType.
     * Brands with custom JobSchedule records are not affected.
     */
    async rescheduleDefaultUsers(jobType: JobType, newCron: string): Promise<void> {
        // Find all brands that have a custom schedule for this jobType
        const customBrandIds = new Set(
            (await prisma.jobSchedule.findMany({
                where: { jobType },
                select: { brandId: true },
            })).map(r => r.brandId)
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

        logger.info({ jobType, newCron, count }, '[TenantJobScheduler] Rescheduled default users');
    }

    /**
     * Remove a task from the registry (called when a custom schedule is deleted).
     */
    removeTask(brandId: number, jobType: JobType): void {
        const key: TaskKey = `${brandId}:${jobType}`;
        this.stopTask(key);
    }

    /**
     * Graceful shutdown: stop all running tasks.
     */
    async shutdown(): Promise<void> {
        logger.info(`[TenantJobScheduler] Shutting down ${this.tasks.size} tasks...`);
        for (const [key] of this.tasks) {
            this.stopTask(key);
        }
        logger.info('[TenantJobScheduler] Shutdown complete');
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
            logger.error({ key, cronExpression }, '[TenantJobScheduler] Invalid cron expression, skipping task');
            return;
        }

        const task = cron.schedule(cronExpression, async () => {
            // Concurrency guard: skip tick if job is already running for this brand+jobType
            if (this.runningFlags.get(key)) {
                logger.warn({ brandId, jobType }, '[TenantJobScheduler] Job already running, skipping tick');
                return;
            }

            this.runningFlags.set(key, true);
            try {
                const registry = await this.getRegistry();
                await registry[jobType](brandId);
            } catch (err) {
                // Fault isolation: log error but do NOT rethrow — other tasks must continue
                logger.error({ err, brandId, jobType }, '[TenantJobScheduler] Job execution failed');
            } finally {
                this.runningFlags.set(key, false);
            }
        });

        this.tasks.set(key, task);
    }

    /** Expose task count for testing */
    get taskCount(): number {
        return this.tasks.size;
    }

    /** Check if a task exists for a given key (for testing) */
    hasTask(brandId: number, jobType: JobType): boolean {
        return this.tasks.has(`${brandId}:${jobType}`);
    }
}

export const tenantJobScheduler = new TenantJobScheduler();
