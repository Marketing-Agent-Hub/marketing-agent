# API Specification

## Base URL

```
http://localhost:3001/api
```

## Authentication

Two separate authentication systems are in use.

### Product Authentication (User-facing)
Used for all `/api/*` routes (excluding `/api/internal/*`).

```
Authorization: Bearer <product_jwt_token>
```

Obtain a token via `POST /api/accounts/login`. The JWT payload contains `{ userId, email, workspaceIds }`.

### Internal Authentication (Admin/System)
Used for all `/api/internal/*` routes.

```
Authorization: Bearer <internal_jwt_token>
```

Obtain a token via `POST /api/internal/auth/login`. The admin credentials are set in environment variables (`ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`).

---

## Standard Error Response

All errors return a consistent JSON structure:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message"
  }
}
```

| HTTP Status | Code | Meaning |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Request body failed validation |
| 401 | `UNAUTHORIZED` | Missing or invalid JWT token |
| 403 | `FORBIDDEN` | Authenticated but insufficient role |
| 404 | `NOT_FOUND` | Resource does not exist |
| 422 | `PRECONDITION_FAILED` | Business precondition not met (e.g., no brand profile) |
| 422 | `INVALID_STATE_TRANSITION` | Entity is not in expected state for operation |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

---

## Health Checks

### `GET /api/health`
Returns server status. No authentication required.

**Response 200:**
```json
{ "status": "ok", "timestamp": "2026-04-12T00:00:00.000Z" }
```

### `GET /api/product-health`
Product API health check.

**Response 200:**
```json
{ "status": "ok", "area": "product", "timestamp": "..." }
```

### `GET /api/internal/health`
Internal API health check.

**Response 200:**
```json
{ "status": "ok", "area": "internal", "timestamp": "..." }
```

---

## Product API — User Authentication

### `POST /api/accounts/register`
Register a new user account.

**Request:**
```json
{ "email": "user@example.com", "password": "secret123", "name": "Alice" }
```

**Response 201:**
```json
{ "user": { "id": 1, "email": "user@example.com", "name": "Alice" }, "token": "jwt..." }
```

---

### `POST /api/accounts/login`
Authenticate and receive a JWT token.

**Request:**
```json
{ "email": "user@example.com", "password": "secret123" }
```

**Response 200:**
```json
{ "token": "jwt...", "user": { "id": 1, "email": "user@example.com" } }
```

---

### `GET /api/accounts/me`
🔒 Requires product auth. Returns the current user's profile.

**Response 200:**
```json
{ "id": 1, "email": "user@example.com", "name": "Alice", "memberships": [...] }
```

---

## Product API — Workspaces

### `GET /api/workspaces`
🔒 Lists all workspaces the current user belongs to.

**Response 200:**
```json
[{ "id": 1, "name": "My Agency", "slug": "my-agency", "role": "OWNER" }]
```

---

### `POST /api/workspaces`
🔒 Creates a new workspace. The creator becomes the `OWNER`.

**Request:**
```json
{ "name": "My Agency", "slug": "my-agency" }
```

**Response 201:** Workspace object.

---

### `GET /api/workspaces/:workspaceId`
🔒 `VIEWER` role required. Returns workspace details.

---

### `POST /api/workspaces/:workspaceId/members`
🔒 `ADMIN` role required. Adds a user to the workspace.

**Request:**
```json
{ "email": "newmember@example.com", "role": "EDITOR" }
```

---

## Product API — Brands

### `GET /api/workspaces/:workspaceId/brands`
🔒 `VIEWER` role required. Lists brands in a workspace.

---

### `POST /api/workspaces/:workspaceId/brands`
🔒 `EDITOR` role required. Creates a new brand.

**Request:**
```json
{
  "name": "AcmeCorp",
  "websiteUrl": "https://acme.com",
  "industry": "Technology",
  "timezone": "Asia/Ho_Chi_Minh",
  "defaultLanguage": "vi"
}
```

---

### `GET /api/brands/:brandId`
🔒 Product auth. Returns brand details including profile.

---

### `PATCH /api/brands/:brandId`
🔒 Product auth. Updates brand settings.

---

### `POST /api/brands/:brandId/knowledge-documents`
🔒 `EDITOR` role required. Adds a reference document to the brand's knowledge base.

**Request:**
```json
{ "title": "Company FAQ", "content": "...", "sourceUrl": "...", "docType": "faq" }
```

---

## Product API — Onboarding

### `POST /api/brands/:brandId/onboarding/sessions`
🔒 Creates a new onboarding session for a brand.

**Response 201:**
```json
{ "id": 1, "brandId": 5, "status": "IN_PROGRESS", "transcript": [] }
```

---

### `POST /api/brands/:brandId/onboarding/sessions/:sessionId/messages`
🔒 Appends a message to the onboarding transcript.

**Request:**
```json
{ "role": "user", "content": "We are a fintech startup focused on retail investors." }
```

---

### `POST /api/brands/:brandId/onboarding/sessions/:sessionId/complete`
🔒 Marks the onboarding complete and triggers async brand profile generation.

**Errors:**
- `422` if transcript is empty
- `422` if session is already completed

---

### `GET /api/brands/:brandId/onboarding/sessions/:sessionId`
🔒 Returns a session with its full transcript.

---

## Product API — Strategies

### `POST /api/brands/:brandId/strategies/generate`
🔒 `EDITOR` role required. Generates a new AI-powered content strategy.

**Request:**
```json
{
  "durationDays": 30,
  "postsPerWeek": 5,
  "startDate": "2026-05-01",
  "channels": ["FACEBOOK", "LINKEDIN"]
}
```

All fields are optional. Defaults: `durationDays=30`, `postsPerWeek` from DB setting, `channels=["FACEBOOK"]`.

**Response 201:** `StrategyPlan` object (status: `DRAFT`).

**Errors:**
- `404` if brand does not exist
- `422` if brand has no profile (must complete onboarding first)

---

### `GET /api/brands/:brandId/strategies`
🔒 `VIEWER` role required. Lists all strategies for a brand.

**Response:** Array of `StrategyPlan` objects, each with `trendSnippets[]` (recent trend context).

---

### `GET /api/strategies/:strategyId`
🔒 Product auth. Returns strategy with all its slots.

---

### `POST /api/strategies/:strategyId/activate`
🔒 Product auth. Activates a DRAFT strategy (supersedes any current ACTIVE strategy).

**Errors:**
- `422 INVALID_STATE_TRANSITION` if strategy is not in `DRAFT` status.

---

### `GET /api/strategies/:strategyId/slots`
🔒 Product auth. Lists all time slots for a strategy, ordered by date.

---

## Product API — Content

### `POST /api/brands/:brandId/content/generate-daily`
🔒 `EDITOR` role required. Manually triggers the daily content generation job for a brand.

**Request (optional):**
```json
{ "daysAhead": 7 }
```

---

### `GET /api/brands/:brandId/briefs`
🔒 `VIEWER` role. Returns paginated list of content briefs.

**Query params:** `page`, `limit`

**Response:**
```json
{
  "briefs": [{
    "id": 1, "title": "...", "status": "READY_FOR_REVIEW",
    "trendSnippets": [...],
    "drafts": [{ "id": 1, "platform": "FACEBOOK", "status": "IN_REVIEW" }],
    "strategySlot": { "scheduledFor": "...", "channel": "FACEBOOK" }
  }],
  "total": 42, "page": 1, "limit": 20
}
```

---

### `GET /api/brands/:brandId/review-queue`
🔒 `VIEWER` role. Returns all drafts currently `IN_REVIEW`, ready for human approval.

**Response:**
```json
[{
  "draftId": 5,
  "platform": "FACEBOOK",
  "status": "IN_REVIEW",
  "brief": { "title": "...", "keyAngle": "...", "trendSignals": [...] },
  "draft": { "hook": "...", "body": "...", "cta": "...", "hashtags": [...], "trendSignals": [...] }
}]
```

---

### `GET /api/briefs/:briefId`
🔒 Product auth. Returns a brief with all its draft versions.

---

### `POST /api/briefs/:briefId/drafts/regenerate`
🔒 Product auth. Archives all current drafts and generates a new version using AI.

---

### `PATCH /api/drafts/:draftId`
🔒 Product auth. Edits a draft (only `IN_REVIEW` or `DRAFT` status allowed).

**Request:** Any subset of `{ hook, body, cta, hashtags }`.

---

### `POST /api/drafts/:draftId/approve`
🔒 Product auth. Approves a draft, moving it to `APPROVED` status.

---

### `POST /api/drafts/:draftId/reject`
🔒 Product auth. Rejects a draft with an optional reason.

**Request:**
```json
{ "comment": "Tone is too formal, needs to be more casual." }
```

---

## Product API — Publishing

### `GET /api/brands/:brandId/publish-jobs`
🔒 `VIEWER` role. Lists all publish jobs for a brand.

---

### `POST /api/drafts/:draftId/schedule`
🔒 Product auth. Schedules an approved draft for publishing.

**Request:**
```json
{ "scheduledFor": "2026-05-10T08:00:00Z", "platform": "FACEBOOK" }
```

**Errors:**
- `422` if draft is not in `APPROVED` status

---

### `POST /api/publish-jobs/:id/retry`
🔒 Product auth. Retries a failed publish job.

---

## Product API — Brand Sources & Filtering

### `GET /api/brands/:brandId/sources`
Returns RSS sources associated with a brand.

### `POST /api/brands/:brandId/sources`
Associates an existing Source with the brand.

### `DELETE /api/brands/:brandId/sources/:sourceId`
Removes a source association from a brand.

### `GET /api/brands/:brandId/filter-profile`
Returns the brand's content filter profile.

### `PUT /api/brands/:brandId/filter-profile`
Creates or replaces the brand's filter profile.

### `PATCH /api/brands/:brandId/filter-profile`
Partially updates the filter profile (mode, threshold, topics).

---

## Product API — Trends

### `GET /api/brands/:brandId/trends`
🔒 `VIEWER` role. Lists recent trend signals matched to a brand.

### `POST /api/brands/:brandId/trends/match`
🔒 `EDITOR` role. Manually triggers trend matching for a brand.

---

## Internal API — Authentication

### `POST /api/internal/auth/login`
Authenticates the system admin. Credentials from environment variables.

**Request:**
```json
{ "email": "admin@example.com", "password": "adminpass" }
```

**Response 200:**
```json
{ "token": "jwt..." }
```

---

## Internal API — Admin (Pipeline Triggers)

All routes require internal authentication. All triggers run **asynchronously** in the background.

### `POST /api/internal/admin/ingest/trigger`
Triggers immediate RSS ingestion for all enabled sources.

### `POST /api/internal/admin/extraction/trigger`
Triggers extraction for NEW items.

**Body (optional):** `{ "limit": 10 }`

### `POST /api/internal/admin/filtering/trigger`
Triggers filtering for EXTRACTED items.

**Body (optional):** `{ "limit": 20 }`

### `POST /api/internal/admin/ai/stage-a/trigger`
Triggers AI Stage A for READY_FOR_AI items.

**Body (optional):** `{ "limit": 5 }`

### `POST /api/internal/admin/ai/stage-b/trigger`
Triggers AI Stage B for AI_STAGE_A_DONE items.

**Body (optional):** `{ "limit": 3 }`

### `POST /api/internal/content-intelligence/jobs/ingest/run`
Alternative trigger for ingest (with job monitoring).

### `POST /api/internal/content-intelligence/trends/refresh`
Refreshes all TrendSignal records from recent processed items.

### `GET /api/internal/brands/:brandId/trends`
Lists trend signals matched to a specific brand. `VIEWER` role required.

### `POST /api/internal/brands/:brandId/trends/match`
Manually triggers trend matching for a brand. `EDITOR` role required.

---

## Internal API — AI Settings

### `GET /api/internal/admin/ai/settings`
Returns current AI model configuration and enabled stages.

**Response:**
```json
{
  "models": {
    "stageA": "openai/gpt-4o-mini",
    "stageB": "openai/gpt-4o",
    "embedding": "openai/text-embedding-3-small",
    "businessAnalysis": "openai/gpt-4o",
    "strategyGeneration": "openai/gpt-4o",
    "postGeneration": "openai/gpt-4o-mini",
    "discovery": "openai/gpt-4o-mini"
  },
  "stages": {
    "stageA": { "enabled": true },
    "stageB": { "enabled": true }
  },
  "stageA": { "enabled": true, "model": "openai/gpt-4o-mini", "description": "AI filtering & categorization" },
  "stageB": { "enabled": false, "model": "openai/gpt-4o", "description": "AI article generation" }
}
```

### `PATCH /api/internal/admin/ai/settings`
Updates AI model settings or enables/disables stages.

**Request:**
```json
{
  "models": { "stageA": "openai/gpt-4o" },
  "stages": { "stageB": { "enabled": true } }
}
```

---

## Internal API — Sources

### `GET /api/internal/sources`
Lists all RSS sources (with filtering/pagination support).

### `POST /api/internal/sources`
Creates a new source.

**Request:**
```json
{
  "name": "TechCrunch",
  "rssUrl": "https://techcrunch.com/feed/",
  "type": "RSS",
  "lang": "EN",
  "topicTags": ["technology", "startups"],
  "trustScore": 85,
  "fetchIntervalMinutes": 60
}
```

### `GET /api/internal/sources/:id`
Returns one source with its recent items count.

### `PATCH /api/internal/sources/:id`
Updates source config (name, trustScore, denyKeywords, enabled, etc.).

### `DELETE /api/internal/sources/:id`
Deletes a source and all of its items (cascade).

### `POST /api/internal/sources/:id/validate`
Fetches and validates the source's RSS feed immediately. Returns validation result and sample items.

---

## Internal API — Items

### `GET /api/internal/items`
Lists content items with filtering by status, sourceId, brandId.

**Query params:** `status`, `sourceId`, `brandId`, `page`, `limit`

---

## Internal API — Source Discovery

### `GET /api/internal/source-discovery/pending`
Lists all `PendingSource` records awaiting review.

**Query params:** `status=PENDING|APPROVED|REJECTED`

### `POST /api/internal/source-discovery/pending/:id/approve`
Approves a pending source, creating a new `Source` record from it.

### `POST /api/internal/source-discovery/pending/:id/reject`
Rejects a pending source with a reason.

**Request:**
```json
{ "reason": "Low quality content, duplicate topics" }
```

### `POST /api/internal/source-discovery/jobs/run`
Manually triggers the source discovery pipeline.

---

## Internal API — Monitoring

All monitoring endpoints require internal authentication.

### `GET /api/internal/monitor/overview`
Returns a dashboard summary: recent logs, metric summaries, health status.

### `GET /api/internal/monitor/logs`
Paginated system logs. **Query params:** `level`, `service`, `from`, `to`, `page`, `limit`

### `GET /api/internal/monitor/logs/stats`
Log counts grouped by level for a time period.

### `GET /api/internal/monitor/metrics`
Paginated metric records. **Query params:** `name`, `type`, `from`, `to`

### `GET /api/internal/monitor/metrics/stats`
Aggregated metric statistics (min, max, avg, sum).

### `GET /api/internal/monitor/metrics/system`
Current system metrics (CPU, memory, uptime).

### `GET /api/internal/monitor/health`
Current health status of all registered service checks (DB, AI API, etc.).

### `GET /api/internal/monitor/health/history`
Historical health check records.

### `GET /api/internal/monitor/traces`
Paginated performance traces.

### `GET /api/internal/monitor/traces/slow`
Traces with duration above a configured threshold.

### `GET /api/internal/monitor/traces/stats`
Trace statistics (p50, p95, p99 latencies by endpoint).

### `GET /api/internal/monitor/traces/:traceId`
Returns a specific trace by ID.
