import { tenantJobScheduler } from './tenant-job-scheduler.js';
import { logger } from '../lib/logger.js';

export async function startBackgroundJobs(): Promise<void> {
    logger.info('Starting background jobs via CronScheduler...');
    await tenantJobScheduler.initialize();
}

export async function stopBackgroundJobs(): Promise<void> {
    logger.info('Stopping background jobs...');
    await tenantJobScheduler.shutdown();
}
