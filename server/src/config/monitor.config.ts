import { env } from './env.js';
import path from 'path';

export const monitorConfig = {
    // Pino logging configuration
    logging: {
        level: env.NODE_ENV === 'production' ? 'info' : 'debug',
        logToFile: true,
        logDir: path.join(process.cwd(), 'logs'),
        maxFileSize: 10 * 1024 * 1024, // 10MB
        maxFiles: 30, // Keep 30 days of logs
        prettyPrint: env.NODE_ENV !== 'production',
    },

    // OpenTelemetry configuration
    telemetry: {
        serviceName: env.APP_NAME.toLowerCase().replace(/\s+/g, '-'),
        serviceVersion: '1.0.0',
        environment: env.NODE_ENV,
        enabled: true,

        // Trace configuration
        tracing: {
            enabled: true,
            sampleRate: 1.0, // 100% in dev, adjust for production
        },

        // Metrics configuration
        metrics: {
            enabled: true,
            port: 9464, // Prometheus metrics endpoint
            endpoint: '/metrics',
        },
    },

    // Database monitoring configuration
    database: {
        logQueries: env.NODE_ENV !== 'production',
        slowQueryThreshold: 1000, // ms
        retentionDays: 30, // Keep monitoring data for 30 days
    },

    // Health check configuration
    healthCheck: {
        interval: 60000, // 1 minute
        services: ['database', 'openai', 'filesystem'],
    },

    // Performance monitoring
    performance: {
        trackRequests: true,
        trackJobs: true,
        slowRequestThreshold: 5000, // ms
        slowJobThreshold: 30000, // ms
    },
};

