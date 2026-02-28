// Type definitions for Prisma monitoring models
// These will be available at runtime after migration

export type LogLevel = 'TRACE' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';
export type MetricType = 'COUNTER' | 'GAUGE' | 'HISTOGRAM' | 'SUMMARY';
export type HealthStatus = 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';

export interface SystemLog {
    id: number;
    level: LogLevel;
    message: string;
    context?: string | null;
    service?: string | null;
    method?: string | null;
    path?: string | null;
    statusCode?: number | null;
    duration?: number | null;
    traceId?: string | null;
    spanId?: string | null;
    userId?: number | null;
    error?: string | null;
    stack?: string | null;
    metadata?: any;
    createdAt: Date;
}

export interface SystemMetric {
    id: number;
    name: string;
    type: MetricType;
    value: number;
    unit?: string | null;
    labels?: any;
    description?: string | null;
    createdAt: Date;
}

export interface HealthCheck {
    id: number;
    service: string;
    status: HealthStatus;
    responseTime?: number | null;
    message?: string | null;
    details?: any;
    checkedAt: Date;
}

export interface PerformanceTrace {
    id: number;
    traceId: string;
    spanId?: string | null;
    parentSpanId?: string | null;
    name: string;
    kind?: string | null;
    startTime: Date;
    endTime?: Date | null;
    duration?: number | null;
    statusCode?: number | null;
    method?: string | null;
    path?: string | null;
    attributes?: any;
    events?: any;
    createdAt: Date;
}
