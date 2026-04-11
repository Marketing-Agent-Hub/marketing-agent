import { prisma } from '../../db/index.js';
import { settingService } from '../../lib/setting.service.js';

export async function getSetting(key: string, defaultValue: string): Promise<string> {
    const setting = await prisma.setting.findUnique({ where: { key } });
    return setting?.value ?? defaultValue;
}

export async function getAIModel(
    workflow: 'businessAnalysis' | 'strategyGeneration' | 'postGeneration'
): Promise<string> {
    const keyMap: Record<string, string> = {
        businessAnalysis: 'marketing.models.businessAnalysis',
        strategyGeneration: 'marketing.models.strategyGeneration',
        postGeneration: 'marketing.models.postGeneration',
    };
    return settingService.getModel(keyMap[workflow]);
}

export async function getDefaultPostingCadence(): Promise<number> {
    const val = await getSetting('marketing.defaults.postingCadence', '5');
    return parseInt(val, 10);
}

export async function isReviewRequired(): Promise<boolean> {
    const val = await getSetting('marketing.defaults.reviewRequired', 'true');
    return val === 'true';
}
