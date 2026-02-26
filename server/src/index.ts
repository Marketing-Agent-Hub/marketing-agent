import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { env } from './config/env';
import { errorHandler } from './middleware/error-handler';
import routes from './routes';
import { startIngestJob, stopIngestJob } from './jobs/ingest.job';
import { startExtractionJob, stopExtractionJob } from './jobs/extraction.job';
import { startFilteringJob, stopFilteringJob } from './jobs/filtering.job';

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

// Request logging
app.use((req: Request, _res: Response, next: NextFunction) => {
    console.log(`${req.method} ${req.path}`);
    next();
});

// Routes
app.use('/api', routes);

// Error handler (must be last)
app.use(errorHandler);

// Start server
const PORT = env.PORT;
app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`📝 Environment: ${env.NODE_ENV}`);
    console.log(`🔒 CORS origin: ${env.CORS_ORIGIN}`);

    // Start background jobs
    console.log('🚀 Starting background jobs...');
    startIngestJob();
    startExtractionJob();
    startFilteringJob();
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    stopIngestJob();
    stopExtractionJob();
    stopFilteringJob();
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully...');
    stopIngestJob();
    stopExtractionJob();
    stopFilteringJob();
    process.exit(0);
});
