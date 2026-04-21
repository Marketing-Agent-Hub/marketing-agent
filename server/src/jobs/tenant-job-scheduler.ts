/**
 * Backward-compatibility shim.
 * Wires CronScheduler + JobOrchestrator and exports the same public interface
 * as the old TenantJobScheduler class.
 * Requirements: 4.7
 */
import { CronScheduler } from './cron-scheduler.js';
import { JobOrchestrator } from './job-orchestrator.js';
import { setScheduler } from './job-schedule.service.js';

// Re-export types so existing callers don't break
export type { ICronScheduler } from './cron-scheduler.js';

const orchestrator = new JobOrchestrator();
const scheduler = new CronScheduler(orchestrator);

// Keep the old class name as an alias so any `instanceof TenantJobScheduler` checks still work
export { CronScheduler as TenantJobScheduler };

/**
 * Singleton used by bootstrap.ts and the rest of the app.
 * Exposes the same interface as the old TenantJobScheduler singleton.
 */
export const tenantJobScheduler = scheduler;

// Register with JobScheduleService so hot-reload works (replaces old setScheduler call in initialize())
setScheduler(scheduler);
