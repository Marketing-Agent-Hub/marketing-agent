import { logger } from '../lib/logger.js';
import { JOB_TYPES, JobType } from './job-schedule.types.js';
import { UnknownJobTypeError } from '../shared/errors/app-error.js';

export type JobRunner = (brandId: number) => Promise<void>;

export interface IJobOrchestrator {
    run(brandId: number, jobType: JobType): Promise<void>;
    getRegistry(): Record<JobType, JobRunner>;
}

/**
 * Application Service that selects the correct JobRunner from the registry
 * and executes it for a given brand.
 * Requirements: 4.1, 4.4, 4.5
 */
export class JobOrchestrator implements IJobOrchestrator {
    // Lazy-loaded registry to avoid circular imports at module load time
    private _registry: Record<JobType, JobRunner> | null = null;

    constructor(private readonly registryFactory?: () => Promise<Record<JobType, JobRunner>>) { }

    private async loadRegistry(): Promise<Record<JobType, JobRunner>> {
        if (!this._registry) {
            if (this.registryFactory) {
                this._registry = await this.registryFactory();
            } else {
                const mod = await import('./job-runner-registry.js');
                this._registry = mod.jobRunnerRegistry;
            }
        }
        return this._registry;
    }

    /**
     * Execute a job for a brand.
     * Throws UnknownJobTypeError if jobType is not in the registry.
     * Requirements: 4.4, 4.5
     */
    async run(brandId: number, jobType: JobType): Promise<void> {
        const registry = await this.loadRegistry();

        if (!(jobType in registry)) {
            throw new UnknownJobTypeError(`Unknown job type: "${jobType}". Valid types: ${JOB_TYPES.join(', ')}`);
        }

        logger.info({ brandId, jobType }, '[JobOrchestrator] Running job');
        await registry[jobType](brandId);
    }

    getRegistry(): Record<JobType, JobRunner> {
        if (!this._registry) {
            throw new Error('Registry not loaded yet — call run() first or await loadRegistry()');
        }
        return this._registry;
    }
}

export const jobOrchestrator = new JobOrchestrator();
