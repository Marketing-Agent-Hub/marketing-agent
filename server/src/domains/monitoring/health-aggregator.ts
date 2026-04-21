import type { HealthStatus } from '../../types/monitoring.js';

export interface HealthCheckResult {
    service: string;
    status: HealthStatus;
    responseTime?: number;
    message?: string;
    details?: Record<string, unknown>;
}

export type OverallStatus = 'UP' | 'DOWN' | 'DEGRADED';

export interface AggregatedHealthResult {
    overall: OverallStatus;
    services: Array<{
        service: string;
        status: OverallStatus;
        lastCheck: string;
        responseTime?: number;
        message?: string;
    }>;
}

/**
 * Interface that all health probes must implement.
 * Requirements: 5.6
 */
export interface HealthProbe {
    readonly name: string;
    check(): Promise<HealthCheckResult>;
}

function mapStatus(status: HealthStatus): OverallStatus {
    if (status === 'HEALTHY') return 'UP';
    if (status === 'UNHEALTHY') return 'DOWN';
    return 'DEGRADED';
}

/**
 * Aggregates results from multiple HealthProbe instances.
 * Receives probes via constructor injection — no hardcoded list.
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.7
 */
export class HealthAggregator {
    constructor(private readonly probes: HealthProbe[]) { }

    async aggregate(): Promise<AggregatedHealthResult> {
        const now = new Date().toISOString();

        const settled = await Promise.allSettled(
            this.probes.map((p) => p.check()),
        );

        const results: HealthCheckResult[] = settled.map((outcome, i) => {
            if (outcome.status === 'fulfilled') return outcome.value;
            return {
                service: this.probes[i].name,
                status: 'UNHEALTHY' as HealthStatus,
                message: outcome.reason instanceof Error ? outcome.reason.message : 'Probe threw unexpectedly',
            };
        });

        // Determine overall status
        // Requirements 5.4: any UNHEALTHY → DOWN
        // Requirements 5.5: no UNHEALTHY but some DEGRADED → DEGRADED
        // Requirements 5.3: all HEALTHY → UP
        let overall: OverallStatus;
        if (results.some((r) => r.status === 'UNHEALTHY')) {
            overall = 'DOWN';
        } else if (results.some((r) => r.status === 'DEGRADED')) {
            overall = 'DEGRADED';
        } else {
            overall = 'UP';
        }

        return {
            overall,
            services: results.map((r) => ({
                service: r.service,
                status: mapStatus(r.status),
                lastCheck: now,
                responseTime: r.responseTime,
                message: r.message,
            })),
        };
    }
}
