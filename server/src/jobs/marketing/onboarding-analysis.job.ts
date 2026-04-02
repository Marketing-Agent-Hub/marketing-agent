import { withJobMonitoring } from '../../lib/job-monitoring.js';
import { brandAnalysisService } from '../../domains/brand/brand-analysis.service.js';

export async function runOnboardingAnalysisJob(brandId: number, sessionId: number): Promise<void> {
    await withJobMonitoring('onboarding-analysis', async () => {
        await brandAnalysisService.runBusinessAnalysis(brandId, sessionId);
    });
}
