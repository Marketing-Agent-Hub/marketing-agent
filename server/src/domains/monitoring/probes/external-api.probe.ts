import type { HealthProbe, HealthCheckResult } from '../health-aggregator.js';

/**
 * Checks that the OpenRouter API key is configured.
 * Requirements: 5.1
 */
export class ExternalApiProbe implements HealthProbe {
    readonly name = 'openai';

    async check(): Promise<HealthCheckResult> {
        const startTime = Date.now();
        try {
            if (!process.env.OPENROUTER_API_KEY) {
                return {
                    service: this.name,
                    status: 'DEGRADED',
                    responseTime: Date.now() - startTime,
                    message: 'OpenRouter API key not configured',
                };
            }
            return {
                service: this.name,
                status: 'HEALTHY',
                responseTime: Date.now() - startTime,
                message: 'OpenRouter API configured',
            };
        } catch (error) {
            return {
                service: this.name,
                status: 'UNHEALTHY',
                responseTime: Date.now() - startTime,
                message: error instanceof Error ? error.message : 'OpenRouter check failed',
            };
        }
    }
}

export const externalApiProbe = new ExternalApiProbe();
