# Technical Logic

## How Logic Is Implemented

### 1. Plugin System (Source Ingestion)

The system uses a **Strategy pattern** for handling different source types. Each source type (`RSS`, `WEB_SCRAPER`) has a plugin that implements:

```typescript
// src/lib/plugins/base.plugin.ts
interface SourcePlugin {
    fetch(source: Source): Promise<string>;     // Returns raw content
    parse(raw: string, source: Source): Promise<NormalizedItem[]>;
    validateConfig(config: unknown): boolean;
}
```

The `PluginRegistry` maps `SourceType` enum values to plugin instances. When the ingest service runs, it calls `getPlugin(source.type)` to retrieve the correct implementation — allowing new source types to be added without modifying ingest logic.

**Current plugins:**
- `RssPlugin`: Uses `fast-xml-parser` to parse RSS/Atom XML. Normalizes all fields (title, link, snippet, GUID, publishedAt, contentHash) into a uniform `NormalizedItem`.
- `WebScraperPlugin`: Uses `cheerio` for HTML parsing and CSS selector-based content extraction.

### 2. AI Workflow Wrapper (`callAIWorkflow`)

All marketing AI calls go through `src/shared/marketing/ai-workflow.ts`:

```typescript
async function callAIWorkflow<T>(params: AIWorkflowParams<T>): Promise<T> {
    // 1. Creates a GenerationRun record (status: RUNNING)
    // 2. Calls params.callFn() — the actual AI API call
    // 3. On success: updates GenerationRun with tokens/output, status: COMPLETED
    // 4. On failure: updates GenerationRun status: FAILED, rethrows
}
```

This creates a complete audit trail of every AI inference call — what went in (`inputSnapshot`), what came out (`outputSnapshot`), which model executed it, and how many tokens were used. This is stored in the `generation_runs` table.

### 3. Content Hash Deduplication

When items are parsed from a feed, a `contentHash` is computed from the article content. Before calling AI Stage B, the system performs a cache lookup:

```typescript
async function checkStageBCache(contentHash: string): Promise<StageBOutput | null> {
    return prisma.aiResult.findFirst({
        where: { stage: 'B', item: { contentHash } },
        select: { fullArticle: true },
    });
}
```

If the same article appears in multiple brand feeds (or is re-ingested), the AI generation is skipped and the cached Vietnamese post is reused. This prevents redundant AI costs.

### 4. Image Selection: 5-Tier Architecture

The `extraction.service.ts` implements a scoring-based image selection system:

| Tier | Source | Base Score |
|---|---|---|
| 1 | RSS `<enclosure>` tags | 80–90 pts |
| 2 | OG/Twitter/Schema.org meta tags | 85–100 pts |
| 3 | JSON-LD structured data | 95 pts |
| 4 | Body `<img>` elements | 50–55 pts |
| 5 | `<picture>` responsive elements | 55 pts |

Scores are then adjusted with bonuses/penalties for:
- Domain match (same domain as article = +25)
- Image dimensions (HD = +35, tiny = -25)
- Aspect ratio (16:9ish = +10, extreme = -15)
- Filename patterns (date-based = +10, "placeholder" = -35)
- Alt text quality (+3 to +15)
- Format (.webp = +5, .gif = -10)
- Logo/icon path detection (filtered out entirely)

The highest-scoring image is selected as `mainImageUrl`. The top 10 become `imageList`.

### 5. AI Model Configuration (Runtime Settings)

AI models are **not hardcoded**. They are stored in the `settings` table as key-value pairs and loaded at runtime via `SettingService`. This allows changing the AI model for any workflow without a deployment.

```
ai.models.stageA        → default: openai/gpt-4o-mini
ai.models.stageB        → default: openai/gpt-4o
ai.models.embedding     → default: openai/text-embedding-3-small
marketing.models.*      → default: openai/gpt-4o
ai.models.discovery     → default: openai/gpt-4o-mini

ai_stage_a_enabled      → "true" / "false"
ai_stage_b_enabled      → "true" / "false"
```

The `AiClient` sends all requests to `https://openrouter.ai/api/v1` using the OpenAI SDK with a custom `baseURL`. This means any OpenRouter-supported model string works.

### 6. Dual Authentication System

Two parallel JWT-based auth systems exist:

**Product Auth** (`requireProductAuth`):
- For end-users (brand managers, editors)
- Token issued by `authService` (src/domains/auth/auth.service.ts)
- Validated with `JWT_SECRET`; attaches `req.v2User` (contains userId, email)

**Internal Auth** (`requireInternalAuth`):
- For system admins/operators
- Token issued by `internalAuthService` (src/domains/auth/internal-auth.service.ts)
- Validated with same `JWT_SECRET` but separate issuer; attaches `req.user` and `req.internalUser`
- Admin email/password stored as env vars (`ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`)

**Authorization (RBAC):**
- `requireWorkspaceAccess(role)`: Verifies the user is a `WorkspaceMember` with at least the specified role
- `requireBrandAccess(role)`: Verifies the user has access to the brand's workspace at the specified role level

### 7. Error Handling Strategy

**Service-level errors**: Services throw plain `Error` objects with additional properties added at runtime:

```typescript
const err = new Error('...') as any;
err.statusCode = 404;
err.code = 'NOT_FOUND';
throw err;
```

**Error handler middleware** (`middleware/error-handler.ts`):
- Reads `err.statusCode` (falls back to 500)
- Reads `err.code` (falls back to `'INTERNAL_ERROR'`)
- Returns structured `{ error: { code, message } }` JSON
- In production, strips stack traces

**Async route handling**: All async route handlers are wrapped with `asyncHandler()`:

```typescript
export function asyncHandler(fn) {
    return (req, res, next) => {
        fn(req, res, next).catch(next); // All unhandled rejections go to error middleware
    };
}
```

This prevents unhandled promise rejections from crashing the server.

### 8. Tenant-Specific Job Scheduling

The system has moved from global cron jobs to a per-tenant (per-brand) scheduling model:

- **Job Types**: `ingest`, `extract`, `filter`, `pipeline`, `source_discovery`, etc.
- **Scheduler**: `TenantJobScheduler` manages a fleet of `node-cron` tasks in-memory.
- **Customization**: Brands can override the global default cron expression via the `JobSchedule` table.
- **Concurrency Guard**: A `Map<TaskKey, boolean>` ensures that if a job tick is already running for a specific (brand + jobType), the new tick is skipped to prevent overlapping executions.
- **Fault Isolation**: Each job execution is wrapped in a try/catch; failure in one brand's ingestion does not affect others.

### 9. Multi-Agent Content Production

The content pipeline follows a two-stage generative process:

1. **Screenwriter Service**: Distills raw news and brand context into a structured `ContentScript`. This is the single source of truth for the story.
2. **Specialized Agents**: 
   - `SocialPostAgent`: Facebook/Twitter style posts.
   - `VideoAgent`: Script for short-form video (TikTok/Reels).
   - `LongformAgent`: Detailed blog articles.
   
Agents run in parallel using `Promise.allSettled`. If the brand config disables an agent, it is not executed.

### 10. State Management

There is no in-memory application state beyond:
- `isRunning` boolean in `source-discovery.job.ts` — a naive concurrency guard
- AI config flags (`stageAEnabled`, `stageBEnabled`) loaded from DB at startup

All other state lives in PostgreSQL. The application is effectively **stateless** from a horizontal scaling perspective, except for the in-memory cron task registrations.

### 10. Embedding-Based Similarity Filtering

When `FilterProfile.mode = 'AI_EMBEDDING'`:

1. The brand's `vectorProfile` (a float array stored as `Json`) was pre-computed when the filter profile was created.
2. For each extracted item, its content is embedded using the configured embedding model.
3. **Cosine similarity** is computed between the item's embedding and the brand's vector profile:
   ```typescript
   function cosineSimilarity(a: number[], b: number[]): number {
       const dot = a.reduce((sum, ai, i) => sum + ai * b[i], 0);
       const normA = Math.sqrt(a.reduce((sum, ai) => sum + ai * ai, 0));
       const normB = Math.sqrt(b.reduce((sum, bi) => sum + bi * bi, 0));
       return dot / (normA * normB);
   }
   ```
4. If score ≥ `similarityThreshold` (default: 0.7), item passes. Otherwise, `FILTERED_OUT`.
5. If the embedding API call fails, the item advances to `READY_FOR_AI` (fail-open) to avoid blocking the pipeline.

### 11. Generation Run Audit Trail

Every marketing AI call (not content intelligence) creates a `GenerationRun` record:
- `workflow`: One of `business-analysis`, `strategy-generation`, `brief-generation`, `post-generation`
- `promptVersion`: A semver string (e.g., `"1.0.0"`) to track prompt changes over time
- `inputSnapshot`: The data sent to the AI (for replay/debugging)
- `outputSnapshot`: The parsed AI output
- `rawResponse`: The raw string from the LLM (for debugging malformed JSON)
- `promptTokens`, `completionTokens`, `totalTokens`: For cost tracking

This table is the primary tool for debugging AI quality issues and auditing token spend.
