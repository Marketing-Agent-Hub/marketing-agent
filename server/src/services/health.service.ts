import { db } from '../db/index.js';
import { logger } from '../lib/logger.js';
import { monitorConfig } from '../config/monitor.config.js';
import type { HealthStatus } from '../types/monitoring.js';
import { env } from '../config/env.js';
import fs from 'fs';
import path from 'path';

export interface HealthCheckResult {
    service: string;
    status: HealthStatus;
    responseTime?: number;
    message?: string;
    details?: Record<string, any>;
}

/**
 * Service for health checks and monitoring
 */
export class HealthService {
    private healthChecks: Map<string, HealthCheckResult> = new Map();
    private checkInterval?: NodeJS.Timeout;

    /**
     * Start periodic health checks
     */
    startHealthChecks() {
        if (this.checkInterval) {
            return;
        }

        logger.info('Starting periodic health checks');

        // Run immediately
        this.runAllHealthChecks();

        // Then run periodically
        this.checkInterval = setInterval(() => {
            this.runAllHealthChecks();
        }, monitorConfig.healthCheck.interval);
    }

    /**
     * Stop periodic health checks
     */
    stopHealthChecks() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = undefined;
            logger.info('Stopped periodic health checks');
        }
    }

    /**
     * Run all health checks
     */
    private async runAllHealthChecks() {
        const services = monitorConfig.healthCheck.services;

        for (const service of services) {
            try {
                const result = await this.checkService(service);
                this.healthChecks.set(service, result);

                // Store in database
                await this.storeHealthCheck(result);
            } catch (error) {
                logger.error({ error, service }, 'Health check failed');
            }
        }
    }

    /**
     * Check a specific service
     */
    private async checkService(service: string): Promise<HealthCheckResult> {
        const startTime = Date.now();

        try {
            switch (service) {
                case 'database':
                    return await this.checkDatabase(startTime);
                case 'openai':
                    return await this.checkOpenAI(startTime);
                case 'filesystem':
                    return await this.checkFileSystem(startTime);
                default:
                    return {
                        service,
                        status: 'UNHEALTHY',
                        message: 'Unknown service',
                    };
            }
        } catch (error) {
            return {
                service,
                status: 'UNHEALTHY',
                responseTime: Date.now() - startTime,
                message: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    /**
     * Check database health
     */
    private async checkDatabase(startTime: number): Promise<HealthCheckResult> {
        try {
            // Simple query to check connection
            await db.$queryRaw`SELECT 1`;

            const responseTime = Date.now() - startTime;

            return {
                service: 'database',
                status: responseTime < 100 ? 'HEALTHY' : 'DEGRADED',
                responseTime,
                message: 'Database connection OK',
                details: {
                    type: 'postgresql',
                },
            };
        } catch (error) {
            return {
                service: 'database',
                status: 'UNHEALTHY',
                responseTime: Date.now() - startTime,
                message: error instanceof Error ? error.message : 'Database connection failed',
            };
        }
    }

    /**
     * Check OpenAI API availability
     */
    private async checkOpenAI(startTime: number): Promise<HealthCheckResult> {
        try {
            if (!process.env.OPENAI_API_KEY) {
                return {
                    service: 'openai',
                    status: 'DEGRADED',
                    message: 'OpenAI API key not configured',
                };
            }

            // OpenAI is configured
            return {
                service: 'openai',
                status: 'HEALTHY',
                responseTime: Date.now() - startTime,
                message: 'OpenAI API configured',
            };
        } catch (error) {
            return {
                service: 'openai',
                status: 'UNHEALTHY',
                responseTime: Date.now() - startTime,
                message: error instanceof Error ? error.message : 'OpenAI check failed',
            };
        }
    }

    /**
     * Check filesystem health
     */
    private async checkFileSystem(startTime: number): Promise<HealthCheckResult> {
        try {
            const testFile = path.join(monitorConfig.logging.logDir, '.health-check');

            // Try to write and read a file
            fs.writeFileSync(testFile, 'OK');
            const content = fs.readFileSync(testFile, 'utf-8');
            fs.unlinkSync(testFile);

            if (content !== 'OK') {
                throw new Error('File content mismatch');
            }

            return {
                service: 'filesystem',
                status: 'HEALTHY',
                responseTime: Date.now() - startTime,
                message: 'Filesystem read/write OK',
            };
        } catch (error) {
            return {
                service: 'filesystem',
                status: 'UNHEALTHY',
                responseTime: Date.now() - startTime,
                message: error instanceof Error ? error.message : 'Filesystem check failed',
            };
        }
    }

    /**
     * Store health check in database
     */
    private async storeHealthCheck(result: HealthCheckResult): Promise<void> {
        try {
            await db.healthCheck.create({
                data: {
                    service: result.service,
                    status: result.status,
                    responseTime: result.responseTime,
                    message: result.message,
                    details: result.details as any,
                },
            });
        } catch (error) {
            logger.error({ error }, 'Failed to store health check in database');
        }
    }

    /**
     * Get current health status
     */
    async getHealthStatus() {
        const checks = Array.from(this.healthChecks.values());

        const overallStatus = checks.every((c) => c.status === 'HEALTHY')
            ? 'HEALTHY'
            : checks.some((c) => c.status === 'UNHEALTHY')
                ? 'UNHEALTHY'
                : 'DEGRADED';

        // Map status to frontend format
        const mapStatus = (status: HealthStatus): 'UP' | 'DOWN' | 'DEGRADED' => {
            if (status === 'HEALTHY') return 'UP';
            if (status === 'UNHEALTHY') return 'DOWN';
            return 'DEGRADED';
        };

        return {
            overall: mapStatus(overallStatus),
            services: checks.map((check) => ({
                service: check.service,
                status: mapStatus(check.status),
                lastCheck: new Date().toISOString(),
                responseTime: check.responseTime,
            })),
        };
    }

    /**
     * Get health check history
     */
    async getHealthHistory(params: {
        service?: string;
        limit?: number;
        offset?: number;
        startDate?: Date;
        endDate?: Date;
    }) {
        const { service, limit = 100, offset = 0, startDate, endDate } = params;

        const where: any = {
            ...(service && { service }),
            ...(startDate &&
                endDate && {
                checkedAt: {
                    gte: startDate,
                    lte: endDate,
                },
            }),
        };

        const [checks, total] = await Promise.all([
            db.healthCheck.findMany({
                where,
                orderBy: { checkedAt: 'desc' },
                take: limit,
                skip: offset,
            }),
            db.healthCheck.count({ where }),
        ]);

        return {
            checks,
            total,
            limit,
            offset,
        };
    }

    /**
     * Clean up old health checks
     */
    async cleanupOldHealthChecks(daysToKeep: number = 7): Promise<number> {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

        const result = await db.healthCheck.deleteMany({
            where: {
                checkedAt: {
                    lt: cutoffDate,
                },
            },
        });

        logger.info(
            { count: result.count, cutoffDate },
            'Cleaned up old health checks'
        );

        return result.count;
    }
}

export const healthService = new HealthService();

