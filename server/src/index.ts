import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { errorHandler } from './middleware/error-handler.js';
import { requestMonitoring, errorMonitoring } from './middleware/monitoring.js';
import routes from './routes/index.js';
import { startIngestJob, stopIngestJob } from './jobs/ingest.job.js';
import { startExtractionJob, stopExtractionJob } from './jobs/extraction.job.js';
import { startFilteringJob, stopFilteringJob } from './jobs/filtering.job.js';
import { startAIStageAJob, stopAIStageAJob } from './jobs/ai-stage-a.job.js';
import { startAIStageBJob, stopAIStageBJob } from './jobs/ai-stage-b.job.js';
import { startMonitoringCleanupJob, stopMonitoringCleanupJob } from './jobs/monitoring-cleanup.job.js';
import { initTelemetry, shutdownTelemetry } from './lib/telemetry.js';
import { logger } from './lib/logger.js';
import { healthService } from './services/health.service.js';

// Initialize OpenTelemetry before creating Express app
initTelemetry();

const app = express();

// Middleware
app.use(
    cors({
        origin: env.CORS_ORIGIN,
        credentials: true,
    })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Monitoring middleware
app.use(requestMonitoring);

// Routes
app.use('/api', routes);

// Error monitoring (before error handler)
app.use(errorMonitoring);

// Error handler (must be last)
app.use(errorHandler);

// Start server
const PORT = env.PORT;
app.listen(PORT, () => {
    logger.info(`✅ Server running on port ${PORT}`);
    logger.info(`📝 Environment: ${env.NODE_ENV}`);
    logger.info(`🔒 CORS origin: ${env.CORS_ORIGIN}`);

    // Start health monitoring
    logger.info('🏥 Starting health checks...');
    healthService.startHealthChecks();

    // Start background jobs
    logger.info('🚀 Starting background jobs...');
    startIngestJob();
    startExtractionJob();
    startFilteringJob();

    // Start AI jobs (if OpenAI is configured)
    try {
        startAIStageAJob();
        startAIStageBJob();
    } catch (error) {
        logger.warn('⚠️  AI jobs not started (OpenAI not configured)');
        logger.warn('   Set OPENAI_API_KEY in .env to enable AI processing');
    }

    // Start monitoring cleanup job
    startMonitoringCleanupJob();
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully...');
    healthService.stopHealthChecks();
    stopIngestJob();
    stopExtractionJob();
    stopFilteringJob();
    stopAIStageAJob();
    stopAIStageBJob();
    stopMonitoringCleanupJob();
    await shutdownTelemetry();
    process.exit(0);
});

process.on('SIGINT', async () => {
    logger.info('SIGINT received, shutting down gracefully...');
    healthService.stopHealthChecks();
    stopIngestJob();
    stopExtractionJob();
    stopFilteringJob();
    stopAIStageAJob();
    stopAIStageBJob();
    stopMonitoringCleanupJob();
    await shutdownTelemetry();
    process.exit(0);
});


