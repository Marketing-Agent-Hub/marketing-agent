import { prisma } from '../db/index.js';

const MODEL_DEFAULTS: Record<string, string> = {
    'ai.models.stageA': 'openai/gpt-4o-mini',
    'ai.models.stageB': 'openai/gpt-4o',
    'ai.models.embedding': 'openai/text-embedding-3-small',
    'marketing.models.businessAnalysis': 'openai/gpt-4o',
    'marketing.models.strategyGeneration': 'openai/gpt-4o',
    'marketing.models.postGeneration': 'openai/gpt-4o-mini',
    'ai.models.discovery': 'openai/gpt-4o-mini',
};

export interface AiSettingsResponse {
    models: {
        stageA: string;
        stageB: string;
        embedding: string;
        businessAnalysis: string;
        strategyGeneration: string;
        postGeneration: string;
        discovery: string;
    };
    stages: {
        stageA: { enabled: boolean };
        stageB: { enabled: boolean };
    };
}

export interface AiSettingsPatch {
    models?: Partial<AiSettingsResponse['models']>;
    stages?: Partial<AiSettingsResponse['stages']>;
}

class SettingService {
    async getModel(key: string): Promise<string> {
        if (!(key in MODEL_DEFAULTS)) {
            throw new Error(`Unknown model setting key: "${key}"`);
        }

        const record = await prisma.setting.findUnique({ where: { key } });
        return record?.value ?? MODEL_DEFAULTS[key];
    }

    async setModel(key: string, value: string): Promise<void> {
        await prisma.setting.upsert({
            where: { key },
            update: { value },
            create: { key, value },
        });
    }

    async getAllAiSettings(): Promise<AiSettingsResponse> {
        const allKeys = [
            ...Object.keys(MODEL_DEFAULTS),
            'ai_stage_a_enabled',
            'ai_stage_b_enabled',
        ];

        const records = await prisma.setting.findMany({
            where: { key: { in: allKeys } },
        });

        const map = new Map(records.map(r => [r.key, r.value]));

        return {
            models: {
                stageA: map.get('ai.models.stageA') ?? MODEL_DEFAULTS['ai.models.stageA'],
                stageB: map.get('ai.models.stageB') ?? MODEL_DEFAULTS['ai.models.stageB'],
                embedding: map.get('ai.models.embedding') ?? MODEL_DEFAULTS['ai.models.embedding'],
                businessAnalysis: map.get('marketing.models.businessAnalysis') ?? MODEL_DEFAULTS['marketing.models.businessAnalysis'],
                strategyGeneration: map.get('marketing.models.strategyGeneration') ?? MODEL_DEFAULTS['marketing.models.strategyGeneration'],
                postGeneration: map.get('marketing.models.postGeneration') ?? MODEL_DEFAULTS['marketing.models.postGeneration'],
                discovery: map.get('ai.models.discovery') ?? MODEL_DEFAULTS['ai.models.discovery'],
            },
            stages: {
                stageA: { enabled: map.get('ai_stage_a_enabled') === 'true' },
                stageB: { enabled: map.get('ai_stage_b_enabled') === 'true' },
            },
        };
    }

    async updateAiSettings(patch: Partial<AiSettingsPatch>): Promise<AiSettingsResponse> {
        const upserts: Promise<unknown>[] = [];

        if (patch.models) {
            const modelKeyMap: Record<keyof AiSettingsResponse['models'], string> = {
                stageA: 'ai.models.stageA',
                stageB: 'ai.models.stageB',
                embedding: 'ai.models.embedding',
                businessAnalysis: 'marketing.models.businessAnalysis',
                strategyGeneration: 'marketing.models.strategyGeneration',
                postGeneration: 'marketing.models.postGeneration',
                discovery: 'ai.models.discovery',
            };

            for (const [field, value] of Object.entries(patch.models) as [keyof AiSettingsResponse['models'], string][]) {
                const dbKey = modelKeyMap[field];
                if (dbKey && value !== undefined) {
                    upserts.push(
                        prisma.setting.upsert({
                            where: { key: dbKey },
                            update: { value },
                            create: { key: dbKey, value },
                        }),
                    );
                }
            }
        }

        if (patch.stages) {
            const stageKeyMap: Record<keyof AiSettingsResponse['stages'], string> = {
                stageA: 'ai_stage_a_enabled',
                stageB: 'ai_stage_b_enabled',
            };

            for (const [field, stageVal] of Object.entries(patch.stages) as [keyof AiSettingsResponse['stages'], { enabled: boolean }][]) {
                const dbKey = stageKeyMap[field];
                if (dbKey && stageVal !== undefined) {
                    const value = String(stageVal.enabled);
                    upserts.push(
                        prisma.setting.upsert({
                            where: { key: dbKey },
                            update: { value },
                            create: { key: dbKey, value },
                        }),
                    );
                }
            }
        }

        await Promise.all(upserts);
        return this.getAllAiSettings();
    }
}

export const settingService = new SettingService();
