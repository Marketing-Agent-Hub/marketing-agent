import OpenAI from 'openai';
import { logger } from './logger.js';

// ─── Return types ────────────────────────────────────────────────────────────

export interface ChatResult {
    data: OpenAI.Chat.Completions.ChatCompletion;
    actualModel: string;
}

export interface EmbedResult {
    data: OpenAI.Embeddings.CreateEmbeddingResponse;
    actualModel: string;
}

// ─── OpenRouter-specific error types ─────────────────────────────────────────

export class OpenRouterCreditError extends Error {
    readonly statusCode = 402;
    constructor() {
        super('OpenRouter credit exhausted or payment required (HTTP 402). Please top up your OpenRouter account.');
        this.name = 'OpenRouterCreditError';
    }
}

export class OpenRouterOverloadedError extends Error {
    readonly statusCode = 529;
    constructor() {
        super('OpenRouter service is overloaded (HTTP 529). Please retry with exponential backoff.');
        this.name = 'OpenRouterOverloadedError';
    }
}

// ─── AiClient ─────────────────────────────────────────────────────────────────

export class AiClient {
    private client: OpenAI;

    constructor() {
        const apiKey = process.env.OPENROUTER_API_KEY;
        if (!apiKey) {
            throw new Error(
                'OPENROUTER_API_KEY is required but not configured. ' +
                'Set this environment variable to your OpenRouter API key.'
            );
        }
        this.client = new OpenAI({
            baseURL: 'https://openrouter.ai/api/v1',
            apiKey,
        });
    }

    async chat(
        params: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming
    ): Promise<ChatResult> {
        try {
            const { data, response } = await this.client.chat.completions
                .create(params)
                .withResponse();

            const headerModel = response.headers.get('x-openrouter-model');
            if (!headerModel) {
                logger.warn(
                    `[AiClient] Warning: x-openrouter-model header missing, falling back to requested model: ${params.model}`
                );
            }
            const actualModel = headerModel ?? params.model;

            return { data, actualModel };
        } catch (error) {
            if (error instanceof OpenAI.APIStatusError) {
                if (error.status === 402) throw new OpenRouterCreditError();
                if (error.status === 529) throw new OpenRouterOverloadedError();
            }
            throw error;
        }
    }

    async embed(params: OpenAI.Embeddings.EmbeddingCreateParams): Promise<EmbedResult> {
        try {
            const { data, response } = await this.client.embeddings
                .create(params)
                .withResponse();

            const headerModel = response.headers.get('x-openrouter-model');
            if (!headerModel) {
                logger.warn(
                    `[AiClient] Warning: x-openrouter-model header missing, falling back to requested model: ${params.model}`
                );
            }
            const actualModel = headerModel ?? params.model;

            return { data, actualModel };
        } catch (error) {
            if (error instanceof OpenAI.APIStatusError) {
                if (error.status === 402) throw new OpenRouterCreditError();
                if (error.status === 529) throw new OpenRouterOverloadedError();
            }
            throw error;
        }
    }
}

export const aiClient = new AiClient();
