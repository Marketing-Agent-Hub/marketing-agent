export const PROMPT_VERSIONS = {
    BUSINESS_ANALYSIS: 'marketing.business_analysis.v1',
    STRATEGY_GENERATION: 'marketing.strategy_generation.v1',
    BRIEF_GENERATION: 'marketing.brief_generation.v1',
    POST_GENERATION: 'marketing.post_generation.v1',
} as const;

export type PromptVersion = typeof PROMPT_VERSIONS[keyof typeof PROMPT_VERSIONS];
