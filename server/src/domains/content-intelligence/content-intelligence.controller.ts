/**
 * Backward-compatibility re-export shim.
 * New code should import PipelineJobController or TrendController directly.
 * Requirements: 6.6
 */
export { PipelineJobController, pipelineJobController } from './pipeline-job.controller.js';
export { TrendController, trendController } from './trend.controller.js';

// Keep the old class name as a combined facade for any callers that still use it
import { Request, Response, NextFunction } from 'express';
import { pipelineJobController } from './pipeline-job.controller.js';
import { trendController } from './trend.controller.js';

export class ContentIntelligenceController {
    triggerIngest = pipelineJobController.triggerIngest.bind(pipelineJobController);
    triggerExtraction = pipelineJobController.triggerExtraction.bind(pipelineJobController);
    triggerFiltering = pipelineJobController.triggerFiltering.bind(pipelineJobController);
    triggerStageA = pipelineJobController.triggerStageA.bind(pipelineJobController);
    triggerStageB = pipelineJobController.triggerStageB.bind(pipelineJobController);
    refreshTrendSignals = trendController.refreshTrendSignals.bind(trendController);
    matchBrandTrends = trendController.matchBrandTrends.bind(trendController);
    listBrandTrends = trendController.listBrandTrends.bind(trendController);
}

export const contentIntelligenceController = new ContentIntelligenceController();
