import { db } from '../../../db/index.js';
import type { HealthProbe, HealthCheckResult } from '../health-aggregator.js';

/**
 * Checks PostgreSQL connectivity by running SELECT 1.
 * Requirements: 5.1
 */
export class DatabaseProbe implements HealthProbe {
    readonly name = 'database';

    async check(): Promise<HealthCheckResult> {
        const startTime = Date.now();
        try {
            await db.$queryRaw`SELECT 1`;
            const responseTime = Date.now() - startTime;
            return {
                service: this.name,
                status: responseTime < 100 ? 'HEALTHY' : 'DEGRADED',
                responseTime,
                message: 'Database connection OK',
                details: { type: 'postgresql' },
            };
        } catch (error) {
            return {
                service: this.name,
                status: 'UNHEALTHY',
                responseTime: Date.now() - startTime,
                message: error instanceof Error ? error.message : 'Database connection failed',
            };
        }
    }
}

export const databaseProbe = new DatabaseProbe();
