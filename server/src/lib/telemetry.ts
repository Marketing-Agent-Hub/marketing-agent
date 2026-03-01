import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { defaultResource, resourceFromAttributes } from '@opentelemetry/resources';
import { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { monitorConfig } from '../config/monitor.config.js';
import { trace, context, SpanStatusCode, Span } from '@opentelemetry/api';
import { logger } from './logger.js';

let sdk: NodeSDK | null = null;

/**
 * Initialize OpenTelemetry SDK
 */
export function initTelemetry() {
    if (!monitorConfig.telemetry.enabled) {
        logger.info('OpenTelemetry is disabled');
        return;
    }

    try {
        const resource = defaultResource().merge(
            resourceFromAttributes({
                [SEMRESATTRS_SERVICE_NAME]: monitorConfig.telemetry.serviceName,
                [SEMRESATTRS_SERVICE_VERSION]: monitorConfig.telemetry.serviceVersion,
            })
        );

        // Configure Prometheus exporter for metrics
        const prometheusExporter = new PrometheusExporter(
            {
                port: monitorConfig.telemetry.metrics.port,
                endpoint: monitorConfig.telemetry.metrics.endpoint,
            },
            () => {
                logger.info(
                    `Prometheus metrics available at http://localhost:${monitorConfig.telemetry.metrics.port}${monitorConfig.telemetry.metrics.endpoint}`
                );
            }
        );

        sdk = new NodeSDK({
            resource,
            traceExporter: undefined, // Console exporter by default in dev
            metricReader: prometheusExporter,
            instrumentations: [
                getNodeAutoInstrumentations({
                    '@opentelemetry/instrumentation-fs': {
                        enabled: false, // Too noisy
                    },
                }),
            ],
        });

        sdk.start();
        logger.info('OpenTelemetry SDK initialized successfully');
    } catch (error) {
        logger.error({ error }, 'Failed to initialize OpenTelemetry');
    }
}

/**
 * Shutdown telemetry
 */
export async function shutdownTelemetry() {
    if (sdk) {
        try {
            await sdk.shutdown();
            logger.info('OpenTelemetry SDK shutdown successfully');
        } catch (error) {
            logger.error({ error }, 'Error shutting down OpenTelemetry');
        }
    }
}

/**
 * Get the tracer for creating spans
 */
export function getTracer() {
    return trace.getTracer(
        monitorConfig.telemetry.serviceName,
        monitorConfig.telemetry.serviceVersion
    );
}

/**
 * Create a span and execute a function within it
 */
export async function withSpan<T>(
    name: string,
    fn: (span: Span) => Promise<T>,
    attributes?: Record<string, any>
): Promise<T> {
    const tracer = getTracer();
    return tracer.startActiveSpan(name, async (span) => {
        try {
            if (attributes) {
                span.setAttributes(attributes);
            }

            const result = await fn(span);
            span.setStatus({ code: SpanStatusCode.OK });
            return result;
        } catch (error) {
            span.setStatus({
                code: SpanStatusCode.ERROR,
                message: error instanceof Error ? error.message : 'Unknown error',
            });
            span.recordException(error as Error);
            throw error;
        } finally {
            span.end();
        }
    });
}

/**
 * Get current trace context
 */
export function getCurrentTraceContext() {
    const span = trace.getSpan(context.active());
    if (!span) {
        return { traceId: undefined, spanId: undefined };
    }

    const spanContext = span.spanContext();
    return {
        traceId: spanContext.traceId,
        spanId: spanContext.spanId,
    };
}

/**
 * Create a span wrapper for synchronous functions
 */
export function withSpanSync<T>(
    name: string,
    fn: (span: Span) => T,
    attributes?: Record<string, any>
): T {
    const tracer = getTracer();
    return tracer.startActiveSpan(name, (span) => {
        try {
            if (attributes) {
                span.setAttributes(attributes);
            }

            const result = fn(span);
            span.setStatus({ code: SpanStatusCode.OK });
            return result;
        } catch (error) {
            span.setStatus({
                code: SpanStatusCode.ERROR,
                message: error instanceof Error ? error.message : 'Unknown error',
            });
            span.recordException(error as Error);
            throw error;
        } finally {
            span.end();
        }
    });
}

