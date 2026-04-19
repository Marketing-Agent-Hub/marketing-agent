import cron from 'node-cron';

export const JOB_TYPES = [
    'ingest',
    'extraction',
    'filtering',
    'ai_stage_a',
    'ai_stage_b',
    'daily_content_generation',
    'publish_scheduler',
    'trend_matching',
    'source_discovery',
] as const;

export type JobType = (typeof JOB_TYPES)[number];

export interface ScheduleConfig {
    cronExpression?: string;
    intervalMinutes?: number;
    enabled: boolean;
}

export interface JobScheduleRecord {
    id: number;
    brandId: number;
    jobType: JobType;
    cronExpression: string;
    enabled: boolean;
    isDefault: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface EffectiveSchedule {
    jobType: JobType;
    cronExpression: string;
    enabled: boolean;
    isDefault: boolean;
}

export type TaskKey = `${number}:${JobType}`;

export const GLOBAL_DEFAULTS: Record<JobType, string> = {
    ingest: '*/15 * * * *',
    extraction: '*/5 * * * *',
    filtering: '*/3 * * * *',
    ai_stage_a: '*/10 * * * *',
    ai_stage_b: '*/15 * * * *',
    daily_content_generation: '0 6 * * *',
    publish_scheduler: '*/5 * * * *',
    trend_matching: '0 * * * *',
    source_discovery: '0 2 * * 1',
};

export function intervalMinutesToCron(minutes: number): string {
    if (minutes < 1) throw new Error('intervalMinutes must be >= 1');
    if (minutes === 1) return '* * * * *';
    if (minutes < 60) return `*/${minutes} * * * *`;
    if (minutes === 60) return '0 * * * *';
    const hours = Math.floor(minutes / 60);
    if (minutes % 60 === 0 && hours <= 24) return `0 */${hours} * * *`;
    return `*/${minutes} * * * *`;
}

export function validateScheduleConfig(config: ScheduleConfig): string | null {
    if (config.cronExpression !== undefined && config.intervalMinutes !== undefined) {
        return 'Only one of cronExpression or intervalMinutes can be provided, not both';
    }
    if (config.intervalMinutes !== undefined && config.intervalMinutes < 1) {
        return 'intervalMinutes must be >= 1';
    }
    if (config.cronExpression !== undefined && !cron.validate(config.cronExpression)) {
        return `Invalid cronExpression: "${config.cronExpression}"`;
    }
    return null;
}
