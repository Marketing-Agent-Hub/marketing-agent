import { JobType } from './job-schedule.types.js';
import { ingestForBrand } from './ingest.job.js';
import { extractionForBrand } from './extraction.job.js';
import { filteringForBrand } from './filtering.job.js';
import { aiStageAForBrand } from './ai-stage-a.job.js';
import { aiStageBForBrand } from './ai-stage-b.job.js';
import { trendMatchingForBrand } from './trend-matching.job.js';
import { sourceDiscoveryForBrand } from './source-discovery.job.js';
import { dailyContentForBrand } from './marketing/daily-content-generation.job.js';
import { publishSchedulerForBrand } from './marketing/publish-scheduler.job.js';

export type JobRunner = (brandId: number) => Promise<void>;

export const jobRunnerRegistry: Record<JobType, JobRunner> = {
    ingest: ingestForBrand,
    extraction: extractionForBrand,
    filtering: filteringForBrand,
    ai_stage_a: aiStageAForBrand,
    ai_stage_b: aiStageBForBrand,
    trend_matching: trendMatchingForBrand,
    source_discovery: sourceDiscoveryForBrand,
    daily_content_generation: dailyContentForBrand,
    publish_scheduler: publishSchedulerForBrand,
};
