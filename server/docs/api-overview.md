# API Overview

## Base URL

```
http://localhost:3001/api
```

## Authentication

**Method**: JWT Bearer Token

```http
Authorization: Bearer <token>
```

### Obtain Token
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "password"
}

Response:
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "email": "admin@example.com"
}
```

## Endpoint Groups

### Health Check (Public)

#### `GET /api/health`
Simple health check endpoint.

**Response**:
```json
{
  "status": "ok",
  "timestamp": "2026-03-10T10:30:00.000Z"
}
```

---

### Authentication

#### `POST /api/auth/login`
Admin login with JWT token issuance.

**Request**:
```json
{
  "email": "string",
  "password": "string"
}
```

**Response** (200):
```json
{
  "token": "string",
  "email": "string"
}
```

**Errors**:
- 401 UNAUTHORIZED - Invalid credentials

---

### Sources (All require auth)

#### `GET /api/sources`
List all RSS sources with pagination, search, and filters.

**Query Parameters**:
- `limit` (number, 1-100, default: 20)
- `offset` (number, default: 0)
- `search` (string) - Search in name, rssUrl, siteUrl, notes
- `enabled` (boolean) - Filter by enabled status
- `lang` (enum: VI | EN | MIXED) - Filter by language
- `minTrustScore` (number, 0-100) - Minimum trust score
- `sortBy` (enum: name | trustScore | createdAt | enabled, default: enabled)
- `sortOrder` (enum: asc | desc, default: desc)

**Response** (200):
```json
{
  "success": true,
  "data": {
    "sources": [/* Source[] */],
    "total": 42,
    "limit": 20,
    "offset": 0
  }
}
```

#### `GET /api/sources/:id`
Get single source by ID.

**Response** (200): Source object
**Errors**: 404 NOT_FOUND

#### `POST /api/sources`
Create new RSS source.

**Request**:
```json
{
  "name": "string",
  "rssUrl": "string (URL)",
  "siteUrl": "string (URL, optional)",
  "lang": "VI | EN | MIXED (default: MIXED)",
  "topicTags": ["string[]"],
  "trustScore": 70,
  "enabled": false,
  "fetchIntervalMinutes": 60,
  "denyKeywords": ["string[]"],
  "notes": "string (optional)"
}
```

**Response** (201): Created Source object

#### `PATCH /api/sources/:id`
Partial update of source.

**Request**: Same as POST, all fields optional

**Response** (200): Updated Source object
**Errors**: 404 NOT_FOUND

#### `DELETE /api/sources/:id`
Delete source (cascades to items).

**Response** (204): No content
**Errors**: 404 NOT_FOUND

#### `POST /api/sources/validate`
Validate RSS feed URL without creating source.

**Request**:
```json
{
  "url": "string (URL)"
}
```

**Response** (200):
```json
{
  "valid": true,
  "itemCount": 25,
  "message": "RSS feed is valid"
}
```

#### `GET /api/sources/export`
Export all sources as JSON.

**Response** (200):
```json
{
  "sources": [/* All sources */],
  "exportedAt": "2026-03-10T10:30:00.000Z",
  "count": 42
}
```

---

### Items (All require auth)

#### `GET /api/items`
Query processed items.

**Query Parameters**:
- `status` (enum: NEW | EXTRACTED | FILTERED_OUT | READY_FOR_AI | AI_STAGE_A_DONE | AI_STAGE_B_DONE | USED)
- `sourceId` (number)
- `limit` (number, default: 50)
- `offset` (number, default: 0)
- `search` (string) - Search in title

**Response** (200):
```json
{
  "items": [/* Item[] with relations */],
  "total": 150,
  "limit": 50,
  "offset": 0
}
```

#### `GET /api/items/:id`
Get single item with all relations.

**Response** (200):
```json
{
  "id": 123,
  "title": "...",
  "link": "...",
  "status": "AI_STAGE_B_DONE",
  "source": {/* Source */},
  "article": {/* Article */},
  "aiResults": [/* AiResult[] */]
}
```

**Errors**: 404 NOT_FOUND

#### `GET /api/items/ready`
Get items ready for consumption (AI_STAGE_B_DONE).

**Query Parameters**:
- `limit` (number, default: 20)
- `offset` (number, default: 0)
- `sortBy` (enum: importance | date | recent, default: importance)
- `sourceId` (number, optional)
- `topicTag` (string, optional)
- `fromDate` (ISO string, optional)
- `toDate` (ISO string, optional)

**Response** (200):
```json
{
  "items": [/* Items with article and AI results */],
  "total": 50,
  "limit": 20,
  "offset": 0
}
```

#### `POST /api/items/delete`
Bulk delete items.

**Request**:
```json
{
  "ids": [1, 2, 3]
}
```

**Response** (200):
```json
{
  "deletedCount": 3
}
```

---

### Admin (All require auth)

Manual job triggers for background processing.

#### `POST /api/admin/ingest/trigger`
Trigger immediate RSS ingestion.

**Response** (200):
```json
{
  "message": "RSS ingestion triggered successfully",
  "note": "Ingestion running in background. Check server logs for progress."
}
```

#### `POST /api/admin/extraction/trigger`
Trigger content extraction.

**Request** (optional):
```json
{
  "limit": 10
}
```

**Response** (200):
```json
{
  "message": "Content extraction triggered for up to 10 items",
  "note": "Extraction running in background. Check server logs for progress."
}
```

#### `POST /api/admin/filtering/trigger`
Trigger content filtering.

**Request** (optional):
```json
{
  "limit": 20
}
```

#### `POST /api/admin/ai/stage-a/trigger`
Trigger AI categorization.

**Request** (optional):
```json
{
  "limit": 5
}
```

#### `POST /api/admin/ai/stage-b/trigger`
Trigger AI post generation.

**Request** (optional):
```json
{
  "limit": 5
}
```

---

### Monitor (All require auth)

Query monitoring data.

#### `GET /api/monitor/logs`
Query system logs.

**Query Parameters**:
- `level` (enum: TRACE | DEBUG | INFO | WARN | ERROR | FATAL)
- `service` (string)
- `limit` (number, default: 100)
- `offset` (number, default: 0)
- `fromDate` (ISO string)
- `toDate` (ISO string)

**Response** (200):
```json
{
  "logs": [/* SystemLog[] */],
  "total": 500,
  "limit": 100,
  "offset": 0
}
```

#### `GET /api/monitor/metrics`
Query system metrics.

**Query Parameters**:
- `name` (string)
- `type` (enum: COUNTER | GAUGE | HISTOGRAM | SUMMARY)
- `limit` (number, default: 100)
- `offset` (number, default: 0)
- `fromDate` (ISO string)
- `toDate` (ISO string)

#### `GET /api/monitor/health`
Query health check history.

**Query Parameters**:
- `service` (string: database | openai | filesystem)
- `status` (enum: HEALTHY | DEGRADED | UNHEALTHY)
- `limit` (number, default: 100)
- `offset` (number, default: 0)

#### `GET /api/monitor/traces`
Query performance traces.

**Query Parameters**:
- `traceId` (string)
- `name` (string)
- `limit` (number, default: 100)
- `offset` (number, default: 0)
- `fromDate` (ISO string)
- `toDate` (ISO string)

---

### Settings (All require auth)

Manage runtime configuration.

#### `GET /api/settings`
Get all settings.

**Response** (200):
```json
{
  "settings": [
    {
      "id": 1,
      "key": "ai_stage_a_enabled",
      "value": "true",
      "description": "Enable AI Stage A processing",
      "updatedAt": "...",
      "createdAt": "..."
    }
  ]
}
```

#### `PUT /api/settings/:key`
Update setting by key.

**Request**:
```json
{
  "value": "string",
  "description": "string (optional)"
}
```

**Response** (200): Updated Setting object
**Errors**: 404 NOT_FOUND

---

## Error Response Format

All errors follow consistent structure:

```json
{
  "error": {
    "code": "VALIDATION_ERROR | UNAUTHORIZED | NOT_FOUND | INTERNAL | FORBIDDEN",
    "message": "Human-readable error message",
    "details": {}  // Optional, present for validation errors
  }
}
```

### HTTP Status Codes
- 200 OK - Success
- 201 Created - Resource created
- 204 No Content - Success with no response body
- 400 Bad Request - Validation error
- 401 Unauthorized - Missing/invalid auth token
- 403 Forbidden - Not allowed
- 404 Not Found - Resource not found
- 500 Internal Server Error - Server error

---

## Prometheus Metrics

Exposed at `http://localhost:9464/metrics`

**Metrics**:
- `job_started_total` - Counter of job starts
- `job_completed_total` - Counter of job completions (labels: status=success|error)
- `job_duration_ms` - Histogram of job durations
- HTTP request metrics (auto-instrumented)
- System metrics (auto-instrumented)
