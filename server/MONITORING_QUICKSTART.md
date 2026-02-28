# Monitoring System - Quick Reference

## 🚀 Quick Start

```bash
# Install dependencies (already done)
npm install

# Run migration (already done)
npm run prisma:migrate

# Start server
npm run dev
```

## 📊 Access Points

### Prometheus Metrics
```
http://localhost:9464/metrics
```

### Monitoring Dashboard API
```
GET http://localhost:3000/api/monitor/overview
Authorization: Bearer YOUR_JWT_TOKEN
```

### Log Files
```
logs/all.log    - All logs
logs/error.log  - Error logs only
```

## 🔧 Quick Configuration

Edit `src/config/monitor.config.ts`:
```typescript
{
    logging: { level: 'info' },
    telemetry: { enabled: true },
    database: { retentionDays: 30 }
}
```

## 📝 Basic Usage

### In your code
```typescript
import { logger } from './lib/logger';
import { metricService } from './services/metric.service';
import { withSpan } from './lib/telemetry';

// Log
logger.info({ userId: 123 }, 'User action');

// Metric
await metricService.incrementCounter('my_counter', 1);

// Trace
await withSpan('my-operation', async (span) => {
    // Your code
});
```

## 📖 Full Documentation

See [MONITORING.md](./MONITORING.md) for complete documentation.

## 🎯 Architecture

```
Request → Middleware (monitoring.ts)
          ↓
       OpenTelemetry (tracing)
       Pino Logger (logs)
       Metric Service (metrics)
          ↓
       Database Storage (Prisma)
          ↓
       API Endpoints (monitor.routes.ts)
          ↓
       Prometheus Export (:9464/metrics)
```

## 📦 Module Structure

```
src/
├── config/
│   └── monitor.config.ts          # Configuration
├── lib/
│   ├── logger.ts                  # Pino logger
│   └── telemetry.ts              # OpenTelemetry SDK
├── services/
│   ├── log.service.ts            # Log storage
│   ├── metric.service.ts         # Metrics
│   ├── health.service.ts         # Health checks
│   └── trace.service.ts          # Performance traces
├── middleware/
│   └── monitoring.ts             # Request monitoring
├── controllers/
│   └── monitor.controller.ts     # API handlers
├── routes/
│   └── monitor.routes.ts         # API routes
├── jobs/
│   └── monitoring-cleanup.job.ts # Data cleanup
└── schemas/
    └── monitor.schema.ts         # Validation schemas
```

## 🔐 Security

All monitoring endpoints require authentication:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

## 🧹 Maintenance

- Logs automatically rotate at 10MB
- Old data cleaned daily at 2:00 AM
- Retention: 30 days (logs/metrics), 7 days (traces/health)

## 🆘 Support

For issues or questions, check the full documentation in [MONITORING.md](./MONITORING.md).
