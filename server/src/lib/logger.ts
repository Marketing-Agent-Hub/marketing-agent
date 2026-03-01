import pino from 'pino';
import { monitorConfig } from '../config/monitor.config.js';
import fs from 'fs';
import path from 'path';

// Ensure logs directory exists
if (monitorConfig.logging.logToFile && !fs.existsSync(monitorConfig.logging.logDir)) {
    fs.mkdirSync(monitorConfig.logging.logDir, { recursive: true });
}

// Create rotating file streams
const streams: pino.StreamEntry[] = [];

// Console stream with pretty printing in development
if (monitorConfig.logging.prettyPrint) {
    streams.push({
        level: monitorConfig.logging.level as pino.Level,
        stream: pino.transport({
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'yyyy-mm-dd HH:MM:ss',
                ignore: 'pid,hostname',
            },
        }),
    });
} else {
    streams.push({
        level: monitorConfig.logging.level as pino.Level,
        stream: process.stdout,
    });
}

// File stream for all logs
if (monitorConfig.logging.logToFile) {
    const allLogsPath = path.join(monitorConfig.logging.logDir, 'all.log');
    streams.push({
        level: 'trace',
        stream: pino.destination({
            dest: allLogsPath,
            sync: false,
            mkdir: true,
        }),
    });

    // Error logs in separate file
    const errorLogsPath = path.join(monitorConfig.logging.logDir, 'error.log');
    streams.push({
        level: 'error',
        stream: pino.destination({
            dest: errorLogsPath,
            sync: false,
            mkdir: true,
        }),
    });
}

// Create the logger
export const logger = pino(
    {
        level: monitorConfig.logging.level,
        formatters: {
            level: (label) => {
                return { level: label.toUpperCase() };
            },
            bindings: (bindings) => {
                return {
                    pid: bindings.pid,
                    host: bindings.hostname,
                    node: process.version,
                };
            },
        },
        timestamp: pino.stdTimeFunctions.isoTime,
        base: {
            service: monitorConfig.telemetry.serviceName,
            environment: monitorConfig.telemetry.environment,
        },
    },
    pino.multistream(streams)
);

/**
 * Create a child logger with additional context
 */
export function createChildLogger(context: Record<string, any>) {
    return logger.child(context);
}

/**
 * Log with trace context
 */
export function logWithTrace(
    level: pino.Level,
    message: string,
    traceId?: string,
    spanId?: string,
    metadata?: Record<string, any>
) {
    logger[level]({
        ...metadata,
        traceId,
        spanId,
        msg: message,
    });
}

export default logger;

