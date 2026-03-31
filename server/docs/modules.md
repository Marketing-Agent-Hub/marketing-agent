# Modules

## Entry Point

### `src/index.ts`
- Initializes OpenTelemetry before Express app creation
- Configures Express middleware (CORS, body parsing, monitoring)
- Mounts all API routes under `/api`
- Starts 6 background jobs on server startup
- Loads AI settings from database
- Starts health monitoring service
- Handles graceful shutdown (SIGTERM, SIGINT)

## Configuration Modules

### `src/config/env.ts`
- Zod schema for environment variable validation
- Required: DATABASE_URL, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD_HASH, CORS_ORIGIN
- Validates on startup, exits process if invalid
- Exports validated `env` object

### `src/config/ai.config.ts`
- OpenAI client initialization
- Runtime feature toggles (STAGE_A_ENABLED, STAGE_B_ENABLED)
- `loadAISettings()` - Loads config from database Setting table
- Model configuration (gpt-4o-mini for Stage A, gpt-4o for Stage B)

### `src/config/monitor.config.ts`
- Logging configuration (Pino)
- Telemetry configuration (OpenTelemetry, Prometheus)
- Health check intervals
- Retention policies for monitoring data

## Service Modules

### `src/services/ingest.service.ts`
**Purpose**: Fetch and parse RSS feeds

**Key Functions**:
- `fetchEnabledSources()` - Query enabled sources from database
- `fetchRssFeed(url)` - HTTP fetch with timeout and custom User-Agent
- `parseRssItems(xml, sourceId)` - Parse RSS 2.0 / Atom XML, extract items
- `ingestAllSources()` - Main orchestrator function

**Responsibilities**:
- RSS/Atom feed parsing
- Content hash generation for deduplication
- Create Item records with status NEW
- Update source fetch status and timestamps

### `src/services/extraction.service.ts`
**Purpose**: Extract full article content from URLs

**Key Functions**:
- `resolveActualUrl(url)` - Resolve redirects (Google News, bit.ly, etc.)
- `extractFullContent(itemId)` - Main extraction pipeline
- `extractStructuredDataImages()` - Parse JSON-LD for images
- `extractMetadataImages()` - Parse Open Graph / Twitter Card tags
- `extractBodyImages()` - Find images in article body

**Responsibilities**:
- URL redirect resolution
- HTML fetching with JSDOM
- Mozilla Readability content extraction
- Image discovery and scoring
- Content truncation (~10K chars for AI)
- Create Article records, update Item status to EXTRACTED

### `src/services/filtering.service.ts`
**Purpose**: Filter unwanted content

**Key Functions**:
- `hasMarketContent(text)` - Check for banned market/trading keywords
- `matchesDenyKeywords(text, keywords)` - Check per-source deny keywords
- `applyFilters(itemId)` - Apply all filtering rules

**Responsibilities**:
- Global deny keyword matching (EN/VI)
- Per-source deny keyword matching
- Update Item status to FILTERED_OUT or READY_FOR_AI
- Store filter reason

### `src/services/ai-stage-a.service.ts`
**Purpose**: AI-powered content categorization

**Key Functions**:
- `buildStageAPrompt(item)` - Generate OpenAI prompt
- `applyHeuristicFilter(item)` - Fallback when AI disabled
- `processItemStageA(itemId)` - Process single item
- `processAIStageA(limit)` - Batch processing

**Output**:
- `isAllowed` - Boolean approval
- `topicTags` - Array of category tags
- `importanceScore` - 0-100 priority score
- `oneLineSummary` - Brief summary

**Responsibilities**:
- OpenAI API integration
- Prompt engineering
- Response parsing and validation
- Create AiResult records (stage "A")
- Update Item status to AI_STAGE_A_DONE

### `src/services/ai-stage-b.service.ts`
**Purpose**: Generate formatted social media posts

**Key Functions**:
- `getVietnameseInstructions()` - Vietnamese writing style guide
- `buildStageBPrompt(item, article)` - Generate OpenAI prompt with full content
- `processItemStageB(itemId)` - Process single item
- `processAIStageB(limit)` - Batch processing

**Output**:
- `fullArticle` - Complete Facebook post with emojis, separators, hashtags

**Responsibilities**:
- OpenAI API integration for content generation
- Language-specific prompt engineering (VI/EN)
- Format enforcement (headline, separator, body, conclusion, hashtags)
- Create/update AiResult records (stage "B")
- Update Item status to AI_STAGE_B_DONE

### `src/services/source.service.ts`
**Purpose**: Source management CRUD operations

**Key Functions**:
- `getAllSources(params)` - Paginated list with search and filters
- `getSourceById(id)` - Single source retrieval
- `createSource(input)` - Create new source with validation
- `updateSource(id, input)` - Partial update
- `deleteSource(id)` - Delete source (cascades to items)
- `exportSources()` - Export all sources as JSON

**Responsibilities**:
- Prisma database operations
- RSS feed validation integration
- Tag/keyword normalization
- Pagination and search logic

### `src/services/auth.service.ts`
**Purpose**: Authentication

**Key Functions**:
- `login(email, password)` - Validate credentials, issue JWT

**Responsibilities**:
- Password verification with bcrypt
- JWT token generation
- Single admin user authentication

### `src/services/health.service.ts`
**Purpose**: System health monitoring

**Key Functions**:
- `startHealthChecks()` - Start periodic checks
- `checkDatabase()` - Prisma connection test
- `checkOpenAI()` - OpenAI API availability
- `checkFileSystem()` - File write test

**Responsibilities**:
- Periodic health check execution
- Response time measurement
- Store HealthCheck records in database

### `src/services/log.service.ts`
**Purpose**: Persist structured logs to database

**Key Functions**:
- `log(data)` - Insert SystemLog record

### `src/services/metric.service.ts`
**Purpose**: Persist metrics to database

**Key Functions**:
- `incrementCounter(name, value, labels)`
- `setGauge(name, value, labels)`
- `recordHistogram(name, value, unit, labels)`

### `src/services/trace.service.ts`
**Purpose**: Persist performance traces to database

**Key Functions**:
- `recordTrace(data)` - Insert PerformanceTrace record

## Job Modules

All jobs follow the same pattern:
- Export `start<Name>Job()` - Starts cron scheduler
- Export `stop<Name>Job()` - Stops cron scheduler
- Export `triggerImmediate<Name>()` - Manual trigger

### `src/jobs/ingest.job.ts`
**Schedule**: `*/15 * * * *` (every 15 minutes)
**Calls**: `ingestAllSources()`

### `src/jobs/extraction.job.ts`
**Schedule**: `*/5 * * * *` (every 5 minutes)
**Calls**: `extractFullContent()` for items with status NEW

### `src/jobs/filtering.job.ts`
**Schedule**: `*/10 * * * *` (every 10 minutes)
**Calls**: `applyFilters()` for items with status EXTRACTED

### `src/jobs/ai-stage-a.job.ts`
**Schedule**: `*/10 * * * *` (every 10 minutes)
**Calls**: `processAIStageA()` for items with status READY_FOR_AI

### `src/jobs/ai-stage-b.job.ts`
**Schedule**: `*/15 * * * *` (every 15 minutes)
**Calls**: `processAIStageB()` for items with AI_STAGE_A_DONE and isAllowed=true

### `src/jobs/monitoring-cleanup.job.ts`
**Schedule**: `0 2 * * *` (daily at 2 AM)
**Calls**: Cleanup functions for old logs, metrics, health checks, traces

## Utility Modules

### `src/lib/async-handler.ts`
Wraps async Express route handlers to catch Promise rejections

### `src/lib/logger.ts`
Pino logger configuration with:
- Multi-stream output (console, all.log, error.log)
- Pretty printing in development
- JSON format in production
- Trace ID injection

### `src/lib/telemetry.ts`
OpenTelemetry SDK initialization:
- `initTelemetry()` - Start SDK
- `shutdownTelemetry()` - Graceful shutdown
- `getTracer()` - Get tracer instance
- `withSpan(name, fn)` - Execute function with tracing

### `src/lib/job-monitoring.ts`
Job execution wrapper:
- `withJobMonitoring(jobName, fn)` - Wraps job function
- Automatic logging of start/end
- Metric recording (success/failure, duration)
- Error capture and reporting

### `src/lib/normalizer.ts`
String normalization utilities:
- `normalizeTags(tags)` - Lowercase, trim, dedupe
- `normalizeKeywords(keywords)` - Same as tags
- `normalizeUrl(url)` - Trim, remove trailing slash

### `src/lib/rss-validator.ts`
RSS feed validation:
- `validateRSSFeed(url)` - Fetch and validate RSS structure
- Returns validation status and messages

## Middleware Modules

### `src/middleware/auth.ts`
**Function**: `requireAuth(req, res, next)`
- Extracts Bearer token from Authorization header
- Verifies JWT signature
- Injects `req.user` object
- Returns 401 if invalid/missing

### `src/middleware/error-handler.ts`
**Function**: `errorHandler(err, req, res, next)`
- Catches all errors passed via next(error)
- ZodError → 400 VALIDATION_ERROR
- Custom statusCode → Use provided code
- Unknown → 500 INTERNAL
- Formats consistent error response

### `src/middleware/monitoring.ts`
**Functions**:
- `requestMonitoring` - Logs all HTTP requests with duration
- `errorMonitoring` - Logs HTTP errors before error handler

## Controller Modules

Pattern: All controllers are classes with async methods
- Methods accept (req, res, next)
- Validate with Zod schemas
- Call service functions
- Format responses
- Pass errors to next(error)

### Controllers:
- `AuthController` - Login endpoint
- `SourceController` - CRUD + validate + export
- `ItemController` - Query items, get ready items, delete items
- `MonitorController` - Query logs, metrics, health checks, traces
- `SettingsController` - Get/update settings

## Schema Modules

Zod schemas for runtime validation:
- `auth.schema.ts` - Login input
- `source.schema.ts` - Source CRUD, validation, pagination
- `item.schema.ts` - Item queries, filters
- `monitor.schema.ts` - Monitor queries

Pattern: Export schema object and TypeScript type
```typescript
export const createSourceSchema = z.object({ ... });
export type CreateSourceInput = z.infer<typeof createSourceSchema>;
```
