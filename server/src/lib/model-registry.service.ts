import { logger } from './logger.js';

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface ModelInfo {
    id: string;
    name: string;
    provider: string;
    contextLength: number | null;
    pricing: {
        prompt: number;
        completion: number;
    };
    outputModalities?: string[];
    supportedParameters?: string[];
}

export interface ModelRegistryCache {
    models: ModelInfo[];
    fetchedAt: number; // Unix timestamp ms
}

// ─── ModelRegistryService ─────────────────────────────────────────────────────

export class ModelRegistryService {
    private cacheMap: Map<string, ModelRegistryCache> = new Map();
    private readonly TTL_MS = 60 * 60 * 1000; // 1 hour

    /**
     * Check if the cache for a given key is still valid (within TTL).
     */
    private isCacheValid(key: string): boolean {
        const cache = this.cacheMap.get(key);
        if (!cache) return false;
        return cache.fetchedAt + this.TTL_MS > Date.now();
    }

    /**
     * Map a raw OpenRouter model response object to a ModelInfo.
     * Returns null if the model is invalid (missing or empty id).
     */
    private mapOpenRouterModel(raw: unknown): ModelInfo | null {
        const model = raw as Record<string, unknown>;

        // id is required and must be a non-empty string
        const id = model.id;
        if (typeof id !== 'string' || id.trim() === '') {
            logger.warn({ raw }, '[ModelRegistryService] Skipping model with missing or empty id');
            return null;
        }

        // name falls back to id if missing or not a string
        const name = typeof model.name === 'string' ? model.name : id;

        // provider is the part before the first '/' in id
        const slashIndex = id.indexOf('/');
        const provider = slashIndex !== -1 ? id.slice(0, slashIndex) : id;

        // contextLength is nullable
        let contextLength: number | null = null;
        if (model.context_length !== undefined && model.context_length !== null) {
            const parsed = Number(model.context_length);
            contextLength = isNaN(parsed) ? null : parsed;
        }

        // pricing fields — parse float, default 0 on NaN
        const pricingRaw = model.pricing as Record<string, unknown> | undefined;
        const promptRaw = pricingRaw?.prompt ?? '0';
        const completionRaw = pricingRaw?.completion ?? '0';
        const promptPrice = parseFloat(String(promptRaw));
        const completionPrice = parseFloat(String(completionRaw));

        const pricing = {
            prompt: isNaN(promptPrice) ? 0 : promptPrice,
            completion: isNaN(completionPrice) ? 0 : completionPrice,
        };

        // outputModalities — only set if it's an array
        const outputModalities = Array.isArray(model.output_modalities)
            ? (model.output_modalities as string[])
            : undefined;

        // supportedParameters — only set if it's an array
        const supportedParameters = Array.isArray(model.supported_parameters)
            ? (model.supported_parameters as string[])
            : undefined;

        const result: ModelInfo = {
            id,
            name,
            provider,
            contextLength,
            pricing,
        };

        if (outputModalities !== undefined) {
            result.outputModalities = outputModalities;
        }
        if (supportedParameters !== undefined) {
            result.supportedParameters = supportedParameters;
        }

        return result;
    }

    /**
     * Fetch models from OpenRouter API.
     * Throws if OPENROUTER_API_KEY is not set (fail-fast).
     * Returns [] on HTTP error or JSON parse error.
     */
    private async fetchFromOpenRouter(category?: string): Promise<ModelInfo[]> {
        const apiKey = process.env.OPENROUTER_API_KEY;
        if (!apiKey) {
            throw new Error('OPENROUTER_API_KEY is not configured');
        }

        const url = new URL('https://openrouter.ai/api/v1/models');
        if (category) {
            url.searchParams.set('category', category);
        }

        try {
            const response = await fetch(url.toString(), {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'HTTP-Referer': process.env.APP_URL ?? 'http://localhost:3000',
                    'X-Title': 'Marketing Agent',
                },
            });

            if (!response.ok) {
                logger.error(
                    { status: response.status, statusText: response.statusText, url: url.toString() },
                    '[ModelRegistryService] OpenRouter API returned non-OK response'
                );
                return [];
            }

            const json = (await response.json()) as { data?: unknown[] };
            const rawModels = Array.isArray(json.data) ? json.data : [];

            return rawModels
                .map((raw) => this.mapOpenRouterModel(raw))
                .filter((m): m is ModelInfo => m !== null);
        } catch (error) {
            logger.error(
                { error, url: url.toString() },
                '[ModelRegistryService] Failed to fetch models from OpenRouter'
            );
            return [];
        }
    }

    /**
     * Get available models, using TTL cache per category.
     * Falls back to stale cache if fetch fails.
     */
    async getAvailableModels(category?: string): Promise<ModelInfo[]> {
        const cacheKey = category ?? '__all__';

        if (this.isCacheValid(cacheKey)) {
            return this.cacheMap.get(cacheKey)!.models;
        }

        // Save stale cache before fetching
        const staleCache = this.cacheMap.get(cacheKey);

        const models = await this.fetchFromOpenRouter(category);

        if (models.length > 0) {
            this.cacheMap.set(cacheKey, { models, fetchedAt: Date.now() });
            return models;
        }

        // Fetch failed or returned empty — return stale cache if available
        return staleCache?.models ?? [];
    }
}

export const modelRegistryService = new ModelRegistryService();
