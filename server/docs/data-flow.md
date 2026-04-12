# Data Flow

## End-to-End Data Flow Overview

```
External World              System Boundary                   Database
─────────────              ─────────────────                 ────────
RSS/Web Sources ─────────► IngestJob ─────────────────────► items (NEW)
                                                             sources (update lastFetchedAt)

items (NEW) ──────────────► ExtractionJob ─────────────────► articles
                             - Fetch HTML                    items (EXTRACTED)
                             - Readability parse
                             - 5-tier image scoring

items (EXTRACTED) ─────────► FilteringJob ──────────────────► items (READY_FOR_AI)
                              - Keyword deny check             or items (FILTERED_OUT)
                              - Optional: AI embedding

items (READY_FOR_AI) ──────► AI Stage A ────────────────────► ai_results (stage=A)
                              - Classify, tag, score           items (AI_STAGE_A_DONE)

items (AI_STAGE_A_DONE) ──► AI Stage B ────────────────────► ai_results (stage=B)
                             - Generate Vietnamese FB post     items (AI_STAGE_B_DONE)

strategy_slots (PLANNED) ──► DailyContentJob ───────────────► content_briefs
                              - Refresh trends                 content_drafts (IN_REVIEW)
                              - AI brief generation            strategy_slots (DRAFT_READY)
                              - AI post generation             generation_runs (audit)

content_drafts (APPROVED) ──► PublishSchedulerJob ──────────► publish_jobs (update)
                               - Find due publish jobs          published_posts
                               - Call SocialConnector

Tavily API ────────────────► DiscoveryJob ──────────────────► pending_sources (PENDING)
                              - Search for feeds              (after admin approval)
                              - Validate + score feeds         → sources
```

---

## Request Lifecycle (HTTP)

For every incoming HTTP request:

```
Client Request
    │
    ▼
Express CORS middleware
    │
    ▼
express.json() / express.urlencoded() — body parsing
    │
    ▼
requestMonitoring middleware
    ├── Records request start time
    ├── Extracts traceId from OTel context
    └── On response finish: writes SystemLog (level=INFO) and increments metrics
    │
    ▼
Router → (Product or Internal)
    │
    ▼
Auth middleware (requireProductAuth OR requireInternalAuth)
    ├── Validates Bearer JWT
    ├── On failure: returns 401 immediately
    └── On success: attaches user payload to req
    │
    ▼
Resource middleware (requireBrandAccess / requireWorkspaceAccess)
    ├── Queries DB for membership
    ├── Checks role level
    └── On failure: returns 403
    │
    ▼
asyncHandler(controllerFn)
    ├── Controller calls service
    ├── Service performs business logic + DB operations
    └── Controller formats and sends JSON response
    │
    ▼
errorMonitoring middleware
    └── On error: writes SystemLog (level=ERROR)
    │
    ▼
errorHandler middleware
    └── Returns structured { error: { code, message } } JSON
```

Total latency is dominated by either DB queries or external AI API calls (typically 1–5 seconds for AI).

---

## Input → Processing → Output

### Feed Ingestion

```
Input:      Source record (type, rssUrl, config, enabled=true)
            ↓
Processing: getPlugin(type) → plugin.fetch() → plugin.parse()
            → saveItems() — upsert with duplicate detection
            → update Source.lastFetchedAt + lastFetchStatus
Output:     N new Item records (status=NEW) in Postgres
            Metrics recorded: ingest_items_total
```

### Article Extraction

```
Input:      Item (status=NEW, link)
            ↓
Processing: resolveActualUrl() — follow redirects
            fetchFullHtml() — GET with 10s timeout
            extractMainContent() — Mozilla Readability
            extractImagesComprehensive() — 5-tier image scoring
            truncateContent() — cap at 10,000 chars for AI
Output:     Article record (extractedContent, truncatedContent, mainImageUrl, imageList)
            Item status → EXTRACTED
```

### AI Stage A (Classification)

```
Input:      Item (status=READY_FOR_AI, title, snippet, source.name)
            ↓
Processing: If AI enabled:
              buildStageAPrompt() → callStageA() via OpenRouter
              Model: ai.models.stageA (default: gpt-4o-mini)
            If AI disabled:
              applyHeuristicFilter() — keyword-based topic detection
Output:     AiResult record (stage=A, isAllowed, topicTags, importanceScore, oneLineSummary)
            Item status → AI_STAGE_A_DONE
```

### AI Stage B (Post Generation)

```
Input:      Item (status=AI_STAGE_A_DONE)
            AiResult stage=A (isAllowed=true, topicTags, importanceScore, oneLineSummary)
            Article (truncatedContent)
            Source (name)
            ↓
Processing: Check cache by contentHash
            If cached: reuse existing fullArticle
            If not cached:
              buildStageBPrompt() — Vietnamese Facebook post format
              callStageB() via OpenRouter
              Model: ai.models.stageB (default: gpt-4o)
              temperature=0.75, max_tokens=3500
Output:     AiResult record (stage=B, fullArticle — complete Vietnamese FB post)
            Item status → AI_STAGE_B_DONE
```

### Strategy Generation

```
Input:      brandId, { durationDays, postsPerWeek, startDate, channels }
            Brand with profile, pillars
            ↓
Processing: callAIWorkflow('strategy-generation')
              System prompt: "You are a social media strategist..."
              User prompt: brand summary + goals + pillars + parameters
              Model: marketing.models.strategyGeneration (default: gpt-4o)
            Validate output with Zod schema
            Prisma $transaction:
              Create StrategyPlan
              createMany StrategySlots (N = durationDays/7 * postsPerWeek)
Output:     StrategyPlan record (status=DRAFT) + N StrategySlot records (status=PLANNED)
            GenerationRun audit record
```

---

## External Integrations

### OpenRouter (AI Inference)

- **Endpoint**: `https://openrouter.ai/api/v1`
- **Protocol**: OpenAI-compatible REST API
- **Auth**: `Authorization: Bearer $OPENROUTER_API_KEY`
- **Client**: `src/lib/ai-client.ts` — a singleton `AiClient` wrapping the OpenAI SDK
- **Retry logic**: Exponential backoff on HTTP 529 (overloaded), up to 3 attempts
- **Error mapping**:
  - HTTP 402 → `OpenRouterCreditError` (stops the entire batch)
  - HTTP 529 → `OpenRouterOverloadedError` (triggers retry with backoff)
- **Model tracking**: The actual model used is captured from the `x-openrouter-model` response header (models can be auto-routed by OpenRouter)

### Tavily Search API

- **Endpoint**: `https://api.tavily.com/search`
- **Auth**: API key sent in request body as `api_key`
- **Usage**: Source Discovery only — 19 pre-defined queries executed serially
- **Configuration**: Requires `TAVILY_API_KEY` env var; if missing, the discovery job is not scheduled
- **Each query**: `search_depth: "basic"`, `max_results: 5`

### PostgreSQL

- **Access**: Via Prisma Client singleton at `src/db/index.ts`
- **Pool**: Managed by Prisma's connection pooler
- **Migrations**: `prisma migrate dev` for development; schema in `prisma/schema.prisma`
- **Notable**: All JSON fields (`config`, `vectorProfile`, `transcript`, `weeklyThemes`, etc.) are stored as Postgres JSON columns

### Social Platforms (Planned)

- **Current state**: `StubConnector` — all publish calls simulate success without making real API calls
- **Interface**: `SocialConnector.publish(job, draft): { externalPostId?, rawResponse }`
- **Registry**: `connectorRegistry` maps `SocialPlatform` → `SocialConnector`
- **Extension point**: Real connector implementations (Twitter API, Facebook Graph API, etc.) would be registered here and used by the publish scheduler

### Prometheus (Metrics)

- **Endpoint**: Exposed on a separate port (configured in `monitor.config.ts`, typically `:9464/metrics`)
- **SDK**: OpenTelemetry Prometheus exporter
- **Auto-instrumentation**: HTTP requests, DNS, Node.js runtime metrics automatically captured
- **Custom metrics**: `metricService` (src/domains/monitoring/metric.service.ts) writes additional business metrics to `system_metrics` table and increments OTel counters
