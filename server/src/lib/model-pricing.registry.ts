/**
 * Model Pricing Registry
 *
 * Static registry of per-token prices in USD for AI models.
 * Using a static map instead of a database to avoid extra DB queries
 * on the hot path of every AI call. Update via code deploy.
 *
 * Price unit: USD per token (combined prompt+completion average)
 */

export const MODEL_PRICING: Record<string, number> = {
    'openai/gpt-4o': 0.000005, // $5/1M tokens avg
    'openai/gpt-4o-mini': 0.0000003, // $0.30/1M tokens avg
    'anthropic/claude-3.5-sonnet': 0.000006, // $6/1M tokens avg
    'anthropic/claude-3-haiku': 0.0000004, // $0.40/1M tokens avg
    'openai/dall-e-3': 0.00004, // image generation flat
};

/**
 * Fallback price per token for models not in the registry.
 * Defaults to gpt-4o pricing ($5/1M tokens).
 */
export const DEFAULT_PRICE_PER_TOKEN = 0.000005;

/**
 * Returns the price per token (USD) for a given model identifier.
 * Falls back to DEFAULT_PRICE_PER_TOKEN for unknown models.
 * Always returns a value > 0.
 */
export function getPricePerToken(model: string): number {
    return Object.prototype.hasOwnProperty.call(MODEL_PRICING, model)
        ? MODEL_PRICING[model]
        : DEFAULT_PRICE_PER_TOKEN;
}

/**
 * Calculates the number of credits to add for a given USD top-up amount.
 * Formula: floor(amountUsd × 1000)
 * 1 credit = $0.001 USD → 1000 credits = $1
 */
export function calculateCreditsFromUsd(amountUsd: number): number {
    return Math.floor(amountUsd * 1000);
}

/**
 * Calculates the number of credits to deduct for an AI call.
 * Formula: ceil(totalTokens × pricePerToken × 1000)
 * Always returns a positive integer ≥ 1.
 */
export function calculateCreditsForUsage(totalTokens: number, model: string): number {
    const pricePerToken = getPricePerToken(model);
    return Math.ceil(totalTokens * pricePerToken * 1000);
}
