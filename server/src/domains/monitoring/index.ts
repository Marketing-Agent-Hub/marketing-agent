// Public API for the monitoring domain
export { HealthService, healthService } from './health.service.js';
export type { HealthCheckResult } from './health.service.js';
export { HealthAggregator } from './health-aggregator.js';
export type { HealthProbe, AggregatedHealthResult, OverallStatus } from './health-aggregator.js';
export { MetricService, metricService } from './metric.service.js';
export type { MetricEntry } from './metric.service.js';
export { TraceService, traceService } from './trace.service.js';
export type { TraceEntry } from './trace.service.js';
