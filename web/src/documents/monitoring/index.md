---
title: "Monitoring System"
description: "Complete guide to the monitoring system with OpenTelemetry, Pino, and Prometheus"
order: 1
---

# Hệ thống Monitoring

## Tổng quan

Hệ thống monitoring thông minh cho backend OCVN RSS Bot sử dụng:
- **OpenTelemetry**: Distributed tracing và metrics collection
- **Pino**: High-performance logging với file rotation
- **Prisma**: Lưu trữ monitoring data trong PostgreSQL
- **Prometheus**: Metrics export endpoint

## Cấu trúc

### 1. Configuration
- `src/config/monitor.config.ts`: Cấu hình tổng thể cho monitoring system

### 2. Core Libraries
- `src/lib/logger.ts`: Pino logger với multi-stream output (console + files)
- `src/lib/telemetry.ts`: OpenTelemetry SDK initialization và helpers

### 3. Services
- `src/services/log.service.ts`: Log collection và storage
- `src/services/metric.service.ts`: Metrics recording và aggregation
- `src/services/health.service.ts`: Health checks cho các services
- `src/services/trace.service.ts`: Performance tracing và storage

### 4. Middleware
- `src/middleware/monitoring.ts`: Request/response monitoring và error tracking

### 5. Controller & Routes
- `src/controllers/monitor.controller.ts`: API endpoints cho monitoring data
- `src/routes/monitor.routes.ts`: Monitoring routes (requires authentication)

### 6. Jobs
- `src/jobs/monitoring-cleanup.job.ts`: Daily cleanup of old monitoring data

### 7. Database Schema
Các models trong Prisma:
- `SystemLog`: Application logs
- `SystemMetric`: System và business metrics
- `HealthCheck`: Service health check results
- `PerformanceTrace`: Request/job performance traces

## Tính năng

### 1. Logging (Pino)
```typescript
import { logger } from './lib/logger';

// Basic logging
logger.info('User logged in', { userId: 123 });
logger.error({ error }, 'Failed to process request');

// With trace context
import { logWithTrace } from './lib/logger';
logWithTrace('info', 'Processing started', traceId, spanId, { jobId: 456 });
```

**Log Files:**
- `logs/all.log`: Tất cả logs
- `logs/error.log`: Chỉ errors
- Auto-rotation: 10MB per file, giữ 30 files

### 2. Distributed Tracing (OpenTelemetry)
```typescript
import { withSpan } from './lib/telemetry';

// Wrap async operations
await withSpan('process-article', async (span) => {
    span.setAttribute('articleId', id);
    // Your code here
    return result;
}, { category: 'processing' });
```

### 3. Metrics Collection
```typescript
import { metricService } from './services/metric.service';

// Counter
await metricService.incrementCounter('articles_processed', 1, { status: 'success' });

// Gauge
await metricService.recordGauge('queue_size', 42, 'items');

// Histogram (for durations, sizes, etc.)
await metricService.recordHistogram('processing_time', duration, 'ms', { type: 'article' });
```

**Prometheus Metrics Endpoint:**
- URL: `http://localhost:9464/metrics`
- Format: Prometheus-compatible

### 4. Health Checks
```typescript
import { healthService } from './services/health.service';

// Start periodic health checks
healthService.startHealthChecks();

// Get current status
const status = await healthService.getHealthStatus();
```

**Monitored Services:**
- Database (PostgreSQL)
- OpenAI API
- Filesystem

### 5. Performance Monitoring

Tự động track:
- HTTP request duration
- Response status codes
- Error rates
- Slow requests (threshold: 5000ms)

## API Endpoints

Tất cả endpoints yêu cầu authentication (Bearer token).

### Dashboard
```
GET /api/monitor/overview
```
Trả về tổng quan về health, logs, metrics, traces trong 24h qua.

### Logs
```
GET /api/monitor/logs?level=ERROR&limit=100&offset=0
GET /api/monitor/logs/stats?startDate=2026-02-01&endDate=2026-02-28
```

### Metrics
```
GET /api/monitor/metrics?name=http_requests_total&limit=100
GET /api/monitor/metrics/stats?name=http_request_duration_ms
GET /api/monitor/metrics/system
```

### Health
```
GET /api/monitor/health
GET /api/monitor/health/history?service=database&limit=100
```

### Traces
```
GET /api/monitor/traces?minDuration=1000&limit=50
GET /api/monitor/traces/slow?threshold=5000
GET /api/monitor/traces/stats?name=GET%20/api/articles
GET /api/monitor/traces/:traceId
```

## Cấu hình

Edit `src/config/monitor.config.ts`:

```typescript
export const monitorConfig = {
    logging: {
        level: 'info',              // trace, debug, info, warn, error, fatal
        logToFile: true,
        logDir: './logs',
        maxFileSize: 10 * 1024 * 1024,  // 10MB
        maxFiles: 30,               // Keep 30 days
        prettyPrint: false,         // Pretty print in dev only
    },
    
    telemetry: {
        enabled: true,
        tracing: {
            enabled: true,
            sampleRate: 1.0,        // 100% - adjust for production
        },
        metrics: {
            port: 9464,             // Prometheus endpoint port
        },
    },
    
    database: {
        retentionDays: 30,          // Keep monitoring data for 30 days
    },
    
    healthCheck: {
        interval: 60000,            // Check every 1 minute
    },
    
    performance: {
        slowRequestThreshold: 5000,  // 5 seconds
        slowJobThreshold: 30000,     // 30 seconds
    },
};
```

## Data Retention

Monitoring data được tự động cleanup:
- **Logs**: 30 days (configurable)
- **Metrics**: 30 days (configurable)
- **Health Checks**: 7 days
- **Traces**: 7 days

Cleanup job chạy daily lúc 2:00 AM.

## Sử dụng với Prometheus + Grafana

### 1. Scrape Configuration (prometheus.yml)
```yaml
scrape_configs:
  - job_name: 'ocvn-rss-bot'
    scrape_interval: 15s
    static_configs:
      - targets: ['localhost:9464']
```

### 2. Grafana Dashboard
Import hoặc tạo dashboard với các panels:
- Request rate (http_requests_total)
- Request duration (http_request_duration_ms)
- Error rate (http_errors_total)
- System metrics (memory, uptime)
- Custom business metrics

## Migration

Chạy migration để tạo tables:
```bash
npm run prisma:migrate
```

Hoặc:
```bash
npx prisma migrate dev --name add_monitoring_tables
```

## Development vs Production

**Development:**
- Pretty-printed console logs
- 100% trace sampling
- Verbose logging

**Production:**
- JSON logs to files
- Reduced trace sampling (adjust sampleRate)
- Info-level logging
- Consider external trace collector (Jaeger, Zipkin)
- Consider external log aggregation (ELK, Loki)

## Best Practices

1. **Logging**: Sử dụng structured logging với context
   ```typescript
   logger.info({ userId, action: 'login' }, 'User logged in');
   ```

2. **Metrics**: Label metrics appropriately
   ```typescript
   metricService.incrementCounter('api_calls', 1, { 
       endpoint: '/api/articles',
       method: 'GET',
       status: '200' 
   });
   ```

3. **Tracing**: Wrap expensive operations
   ```typescript
   await withSpan('database-query', async (span) => {
       span.setAttribute('query', 'findMany');
       return await db.article.findMany();
   });
   ```

4. **Health Checks**: Monitor critical dependencies
   - Database connection
   - External APIs
   - File system access

5. **Alerts**: Set up alerts dựa trên metrics
   - Error rate > threshold
   - Response time > threshold
   - Health check failures

## Troubleshooting

### Logs không xuất ra file
- Check logs directory có tồn tại và có write permission
- Check `monitorConfig.logging.logToFile = true`

### Metrics endpoint không hoạt động
- Check port 9464 không bị conflict
- Check firewall rules
- Check `monitorConfig.telemetry.metrics.enabled = true`

### Performance issues
- Reduce trace sampling rate trong production
- Increase cleanup frequency
- Consider external storage cho traces/logs

## Future Enhancements

- [ ] Integration với external tracing systems (Jaeger, Zipkin)
- [ ] Custom alerting rules engine
- [ ] Real-time monitoring dashboard
- [ ] Anomaly detection using ML
- [ ] Distributed metrics aggregation
