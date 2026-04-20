import OpenAI, { APIError } from 'openai';
import { logger } from './logger.js';
import { walletService } from '../domains/wallet/wallet.service.js';
import { getPricePerToken, DEFAULT_PRICE_PER_TOKEN } from './model-pricing.registry.js';

// ─── Return types ────────────────────────────────────────────────────────────

export interface ChatResult {
    data: OpenAI.Chat.Completions.ChatCompletion;
    actualModel: string;
}

export interface EmbedResult {
    data: OpenAI.Embeddings.CreateEmbeddingResponse;
    actualModel: string;
}

// ─── Credit context ───────────────────────────────────────────────────────────

export interface CreditContext {
    userId: number;
    brandId?: number;
}

// ─── OpenRouter-specific error types ─────────────────────────────────────────

export class OpenRouterCreditError extends Error {
    readonly statusCode = 402;
    constructor() {
        super('Insufficient balance. Please recharge your account!');
        this.name = 'OpenRouterCreditError';
    }
}

export class OpenRouterOverloadedError extends Error {
    readonly statusCode = 529;
    constructor() {
        super('The server is experiencing high traffic. Please try again in a few minutes!');
        this.name = 'OpenRouterOverloadedError';
    }
}

export class InsufficientCreditsError extends Error {
    readonly statusCode = 402;
    constructor() {
        super('Insufficient credits. Please top up your wallet to continue using AI features.');
        this.name = 'InsufficientCreditsError';
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
        params: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming,
        creditContext?: CreditContext
    ): Promise<ChatResult> {
        // Pre-call balance check
        if (creditContext) {
            const wallet = await walletService.getOrCreate(creditContext.userId);
            if (wallet.balanceCredits.lessThanOrEqualTo(0)) {
                throw new InsufficientCreditsError();
            }
        }

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

            // Post-call credit deduction
            if (creditContext) {
                const usage = data.usage;
                if (usage) {
                    const totalTokens = usage.total_tokens;
                    const pricePerToken = getPricePerToken(actualModel);

                    if (pricePerToken === DEFAULT_PRICE_PER_TOKEN && !getPricePerToken(actualModel)) {
                        logger.warn(
                            { model: actualModel },
                            '[AiClient] Model not in pricing registry, using default price'
                        );
                    }

                    const credits = Math.ceil(totalTokens * pricePerToken * 1000);

                    try {
                        await walletService.deductCredits({
                            userId: creditContext.userId,
                            credits,
                            description: `AI usage: ${actualModel} (${totalTokens} tokens)`,
                            brandId: creditContext.brandId,
                            aiModel: actualModel,
                            promptTokens: usage.prompt_tokens,
                            completionTokens: usage.completion_tokens,
                            totalTokens,
                        });
                    } catch (deductError) {
                        // Log but don't throw — AI call already completed
                        logger.error(
                            {
                                userId: creditContext.userId,
                                credits,
                                model: actualModel,
                                error: deductError instanceof Error ? deductError.message : String(deductError),
                            },
                            '[AiClient] Failed to deduct credits after successful AI call'
                        );
                    }
                }
            }

            return { data, actualModel };
        } catch (error) {
            if (error instanceof InsufficientCreditsError) throw error;
            if (error instanceof APIError) {
                if (error.status === 402) throw new OpenRouterCreditError();
                if (error.status === 529) throw new OpenRouterOverloadedError();
                // Log all other provider errors with full context
                logger.error({
                    provider: 'openrouter',
                    httpStatus: error.status,
                    requestedModel: params.model,
                    errorCode: error.code,
                    errorMessage: error.message,
                    errorBody: error.error,
                }, '[AiClient] Provider API error during chat');
            } else {
                logger.error({
                    provider: 'openrouter',
                    requestedModel: params.model,
                    error: error instanceof Error ? error.message : String(error),
                }, '[AiClient] Unexpected error during chat (network/timeout?)');
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
            if (error instanceof APIError) {
                if (error.status === 402) throw new OpenRouterCreditError();
                if (error.status === 529) throw new OpenRouterOverloadedError();
                logger.error({
                    provider: 'openrouter',
                    httpStatus: error.status,
                    requestedModel: params.model,
                    errorCode: error.code,
                    errorMessage: error.message,
                    errorBody: error.error,
                }, '[AiClient] Provider API error during embed');
            } else {
                logger.error({
                    provider: 'openrouter',
                    requestedModel: params.model,
                    error: error instanceof Error ? error.message : String(error),
                }, '[AiClient] Unexpected error during embed (network/timeout?)');
            }
            throw error;
        }
    }
}

export const aiClient = new AiClient();
