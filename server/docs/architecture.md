# Architecture

## Style

**Layered Service-Oriented Architecture** with background job processing and scheduled task execution.

## Layers

```
┌─────────────────────────────────────────────┐
│  Entry Point (index.ts)                     │
│  Express App + OpenTelemetry Init           │
└─────────────────────────────────────────────┘
               ↓
┌─────────────────────────────────────────────┐
│  Middleware Layer                           │
│  - CORS, Body Parsing                       │
│  - Request Monitoring                       │
│  - JWT Authentication (requireAuth)         │
│  - Error Handler (must be last)             │
└─────────────────────────────────────────────┘
               ↓
┌─────────────────────────────────────────────┐
│  Routes Layer                               │
│  - auth.routes.ts                           │
│  - source.routes.ts                         │
│  - item.routes.ts                           │
│  - admin.routes.ts                          │
│  - monitor.routes.ts                        │
│  - settings.routes.ts                       │
└─────────────────────────────────────────────┘
               ↓
┌─────────────────────────────────────────────┐
│  Controllers Layer                          │
│  - Request parsing (Zod schemas)            │
│  - Response formatting                      │
│  - Error passing to middleware              │
└─────────────────────────────────────────────┘
               ↓
┌─────────────────────────────────────────────┐
│  Services Layer (Business Logic)            │
│  - ingest.service.ts                        │
│  - extraction.service.ts                    │
│  - filtering.service.ts                     │
│  - ai-stage-a.service.ts                    │
│  - ai-stage-b.service.ts                    │
│  - source.service.ts                        │
│  - auth.service.ts                          │
│  - health.service.ts                        │
│  - log/metric/trace services                │
└─────────────────────────────────────────────┘
               ↓
┌─────────────────────────────────────────────┐
│  Data Layer                                 │
│  - Prisma Client (from db/index.ts)         │
│  - PostgreSQL Database                      │
└─────────────────────────────────────────────┘
```

## Parallel Processing: Background Jobs

```
┌─────────────────────────────────────────────┐
│  Job Schedulers (node-cron)                 │
│  - ingest.job.ts (*/15 * * * *)             │
│  - extraction.job.ts (*/5 * * * *)          │
│  - filtering.job.ts (*/10 * * * *)          │
│  - ai-stage-a.job.ts (*/10 * * * *)         │
│  - ai-stage-b.job.ts (*/15 * * * *)         │
│  - monitoring-cleanup.job.ts (0 2 * * *)    │
└─────────────────────────────────────────────┘
               ↓
┌─────────────────────────────────────────────┐
│  Job Monitoring Wrapper                     │
│  - withJobMonitoring() function             │
│  - Automatic logging, metrics, tracing      │
│  - Error capture and reporting              │
└─────────────────────────────────────────────┘
               ↓
┌─────────────────────────────────────────────┐
│  Service Functions                          │
│  - ingestAllSources()                       │
│  - extractFullContent()                     │
│  - processFiltering()                       │
│  - processAIStageA()                        │
│  - processAIStageB()                        │
└─────────────────────────────────────────────┘
```

## Request Flow (HTTP)

1. **HTTP Request** → Express app
2. **CORS + Body Parsing** → Request object populated
3. **Request Monitoring** → Log request start, generate trace ID
4. **Authentication** → JWT verification (if route requires auth)
5. **Route Handler** → asyncHandler wrapper catches errors
6. **Controller** → Validate with Zod schemas
7. **Service** → Business logic execution
8. **Prisma Client** → Database query/mutation
9. **Response** → JSON formatted response
10. **Error Monitoring** → Log errors if any
11. **Error Handler** → Format error response (if error occurred)

## Processing Flow (Background Jobs)

1. **Cron Trigger** → Job scheduler executes
2. **Job Monitoring Wrapper** → Logs start, records metrics
3. **Service Execution** → Process batch of items
4. **Prisma Transactions** → Update item status, create related records
5. **External API Calls** → OpenAI, RSS feeds, article URLs
6. **Error Handling** → Log to monitoring system, continue processing
7. **Job Completion** → Log duration, success/failure metrics

## Content Pipeline Flow

```
[Source (RSS / Web Scraper / YouTube / ...)]
      ↓
  IngestJob → Plugin.fetch() → Plugin.parse() → Create Item (status: NEW)
      ↓
  ExtractionJob → Fetch URL → Extract content → Create Article (status: EXTRACTED)
      ↓
  FilteringJob → Check keywords → Update status (FILTERED_OUT or READY_FOR_AI)
      ↓
  AIStageAJob → OpenAI categorization → Create AiResult (status: AI_STAGE_A_DONE)
      ↓
  AIStageBJob → OpenAI post generation → Update AiResult (status: AI_STAGE_B_DONE)
      ↓
  [Ready for consumption] (status: USED when consumed)
```

## Module Boundaries

### Controllers
- **Responsibility**: HTTP layer, request/response handling
- **Depends On**: Services, Schemas (Zod)
- **Rules**: No direct database access, no business logic

### Services
- **Responsibility**: Core business logic
- **Depends On**: Prisma Client, External APIs, Lib utilities
- **Rules**: No HTTP concerns (req/res objects), service-to-service calls allowed

### Jobs
- **Responsibility**: Scheduled task orchestration
- **Depends On**: Services, Job monitoring wrapper
- **Rules**: Thin wrappers around service functions

### Middleware
- **Responsibility**: Cross-cutting concerns (auth, logging, errors)
- **Depends On**: Lib utilities, Types
- **Rules**: Must call next() or send response

### Lib
- **Responsibility**: Reusable utilities and plugin implementations
- **Depends On**: Nothing (leaf nodes)
- **Rules**: Pure functions or standalone utilities; plugins live in `src/lib/plugins/`

## Dependency Direction

```
Controllers → Services → Prisma Client
     ↓            ↓
  Schemas      Lib Utilities
     ↓
  Types
```

**Rule**: Dependencies flow downward/inward. Lower layers never import from upper layers.

## Configuration Management

- **Environment Variables** (env.ts) → Validated with Zod at startup
- **Database Settings** (Setting model) → Runtime configuration loaded from DB
- **Monitor Config** (monitor.config.ts) → Static configuration object

## Observability Architecture

### Three Data Stores
1. **Prometheus** (pull-based) - Metrics exposed on /metrics endpoint
2. **Pino Logs** (push-based) - Written to files and console
3. **Database** (push-based) - SystemLog, SystemMetric, HealthCheck, PerformanceTrace tables

### Instrumentation Points
- **HTTP Requests** → Request monitoring middleware
- **Background Jobs** → withJobMonitoring wrapper
- **Service Operations** → withSpan for distributed tracing
- **Health Checks** → Periodic checks stored in database

## Error Handling Architecture

```
Error Thrown
    ↓
asyncHandler catches Promise rejection
    ↓
Passes to Express error middleware (next(error))
    ↓
errorHandler middleware
    ↓
- ZodError → 400 VALIDATION_ERROR
- Custom statusCode → Use provided code
- Unknown → 500 INTERNAL
    ↓
JSON error response sent to client
```

## State Machine (Item Status)

```
NEW → EXTRACTED → READY_FOR_AI → AI_STAGE_A_DONE → AI_STAGE_B_DONE → USED
  ↘                    ↓
     FILTERED_OUT  (terminal state)
```

**Rules**:
- Status transitions are unidirectional
- Each job processes items in specific status
- Jobs update status atomically with business logic
