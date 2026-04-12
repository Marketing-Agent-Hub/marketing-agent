# Module: Monitoring

## Purpose

Provides full observability into the system — structured logs, custom metrics, distributed traces, and service health checks — all queryable via an authenticated internal API and also exportable to Prometheus/Grafana.

## Key Files

| File | Role |
|---|---|
| `health.service.ts` | Periodic health checks for DB, AI API, and other services |
| `log.service.ts` | Queries and management of `SystemLog` records |
| `metric.service.ts` | Recording custom business metrics to DB + OTel counters |
| `trace.service.ts` | Queries and analysis of `PerformanceTrace` records |
| `monitoring.controller.ts` | HTTP handlers for all monitoring endpoints |
| `monitoring.routes.ts` | Internal route definitions |
| `monitoring.schemas.ts` | Zod request schemas for query filters |

## Responsibilities

### Health Checks (`health.service.ts`)
- **Startup**: `healthService.startHealthChecks()` is called when the server starts.
- **Checks**: Periodically pings known services (PostgreSQL via Prisma, AI API via test request) and records `HealthCheck` records with `HEALTHY`, `DEGRADED`, or `UNHEALTHY` status.
- **Shutdown**: `healthService.stopHealthChecks()` stops the interval on SIGTERM/SIGINT.

### Logging (`log.service.ts`)
- The `SystemLog` table captures: log level (TRACE through FATAL), message, service, HTTP method/path/status, duration, traceId, userId, error details, and arbitrary metadata JSON.
- Logs are written by:
  - `requestMonitoring` middleware (one log per request)
  - `job-monitoring.ts` wrapper (job start/end/error)
  - `logProcessingError` utility (explicit error logging in services)
- Queryable by: level, service, traceId, time range.

### Metrics (`metric.service.ts`)
- Custom business metrics are recorded both in the `SystemMetric` DB table and as OTel instruments (counters, histograms, gauges).
- Key metrics: `ingest_items_total`, `job_completed_total`, `job_duration_ms`, `job_failed_total`, `ai_tokens_total`.
- OTel auto-instrumentation captures HTTP, Node.js, and DNS metrics automatically.

### Traces (`trace.service.ts`)
- `PerformanceTrace` records HTTP request traces with: traceId, method, path, statusCode, start/end time, duration, and span attributes.
- Trace data is written by OpenTelemetry's auto-instrumentation.
- Queryable by: name, slow threshold, time range.

### Cleanup Job (`monitoring-cleanup.job.ts`)
- Runs daily to purge old monitoring records — logs, metrics, and traces older than a configured retention policy.
- Prevents unbounded table growth.

## Interactions With Other Modules

- **All jobs** call `withJobMonitoring()` from `lib/job-monitoring.ts`, which writes to `SystemLog` and `SystemMetric`.
- **Ingest service** calls `metricService.incrementCounter()` after successful ingestion.
- **Middleware** (`middleware/monitoring.ts`) hooks into every Express request/response.

## OTel Integration

OpenTelemetry is initialized before the Express server starts (`initTelemetry()` in `src/index.ts`). A Prometheus exporter listens on a separate port (default `:9464`). All OTel spans and metrics are vendor-neutral and can be wired to any compatible backend (Jaeger, Tempo, Grafana Cloud, etc.).

## API Endpoints

All under `/api/internal/monitor/` — see `api-spec.md` for full details.

Key endpoints:
- `GET /overview` — dashboard summary
- `GET /logs` — paginated logs with filters
- `GET /health` — current health snapshot
- `GET /traces/slow` — latency outliers
