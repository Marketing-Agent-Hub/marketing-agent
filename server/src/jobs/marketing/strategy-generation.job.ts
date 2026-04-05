import { withJobMonitoring } from '../../lib/job-monitoring.js';
import { strategyService } from '../../domains/strategy/strategy.service.js';
import { GenerateStrategyInput } from '../../shared/marketing/schemas/strategy.schema.js';

export async function runStrategyGenerationJob(
    brandId: number,
    options: GenerateStrategyInput
): Promise<void> {
    await withJobMonitoring('strategy-generation', async () => {
        await strategyService.generateStrategy(brandId, options);
    });
}
