import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { errorHandler } from './middleware/error-handler.js';
import { requestMonitoring, errorMonitoring } from './middleware/monitoring.js';
import routes from './routes/index.js';
import stripeWebhookRoutes from './domains/wallet/stripe-webhook.routes.js';
import { startMonitoringCleanupJob, stopMonitoringCleanupJob } from './jobs/monitoring-cleanup.job.js';
import { startBackgroundJobs, stopBackgroundJobs } from './jobs/bootstrap.js';
import { initTelemetry, shutdownTelemetry } from './lib/telemetry.js';
import { logger } from './lib/logger.js';
import { healthService } from './domains/monitoring/health.service.js';

initTelemetry();

const app = express();

app.use(
    cors({
        origin: env.CORS_ORIGIN,
        credentials: true,
    })
);

// Mount Stripe webhook BEFORE express.json() — Stripe requires raw body for signature verification
app.use('/api', stripeWebhookRoutes);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestMonitoring);
app.use('/api', routes);
app.use(errorMonitoring);
app.use(errorHandler);

const PORT = env.PORT || 3001;
app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
    logger.info(`Environment: ${env.NODE_ENV}`);
    logger.info(`CORS origin: ${env.CORS_ORIGIN}`);

    logger.info('Starting health checks...');
    healthService.startHealthChecks();

    logger.info('Starting background jobs...');
    startBackgroundJobs().catch(err => logger.error({ err }, 'Failed to start background jobs'));

    startMonitoringCleanupJob();
});

async function gracefulShutdown(signal: string) {
    logger.info(`${signal} received, shutting down gracefully...`);
    healthService.stopHealthChecks();
    stopBackgroundJobs();
    stopMonitoringCleanupJob();
    await shutdownTelemetry();
    process.exit(0);
}

process.on('SIGTERM', () => {
    gracefulShutdown('SIGTERM').catch(err => {
        logger.error({ err }, 'Graceful shutdown failed');
        process.exit(1);
    });
});

process.on('SIGINT', () => {
    gracefulShutdown('SIGINT').catch(err => {
        logger.error({ err }, 'Graceful shutdown failed');
        process.exit(1);
    });
});
