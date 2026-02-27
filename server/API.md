# API Documentation

> For complete setup and testing instructions, see [DEV_GUIDE.md](../DEV_GUIDE.md)

Base URL: `http://localhost:3001/api`

## Authentication

### POST /auth/login

Login with admin credentials.

**Request:**
```json
{
  "email": "admin@opencampus.vn",
  "password": "your-password"
}
```

**Response (200 OK):**
```json
{
  "token": "eyJhbGci...",
  "email": "admin@opencampus.vn"
}
```

**Response (401 Unauthorized):**
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid email or password"
  }
}
```

### GET /auth/me

Get current authenticated user information. Requires `Authorization: Bearer <token>` header.

**Response (200 OK):**
```json
{
  "email": "admin@opencampus.vn"
}
```

**Response (401 Unauthorized):**
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Missing or invalid authorization header"
  }
}
```

---

## Sources Management

All source endpoints require authentication (`Authorization: Bearer <token>`).

### GET /sources

Get all RSS sources.

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "name": "Example Blog",
    "rssUrl": "https://example.com/feed",
    "siteUrl": "https://example.com",
    "lang": "EN",
    "topicTags": ["education", "edtech"],
    "trustScore": 75,
    "enabled": true,
    "fetchIntervalMinutes": 60,
    "denyKeywords": ["price", "trading"],
    "notes": "Official blog",
    "lastValidatedAt": "2026-02-26T10:00:00.000Z",
    "lastValidationStatus": "OK",
    "createdAt": "2026-02-26T09:00:00.000Z",
    "updatedAt": "2026-02-26T10:00:00.000Z"
  }
]
```

### GET /sources/:id

Get a single source by ID.

**Response (200 OK):**
```json
{
  "id": 1,
  "name": "Example Blog",
  ...
}
```

**Response (404 Not Found):**
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Source not found"
  }
}
```

### POST /sources

Create a new RSS source.

**Request:**
```json
{
  "name": "Example Blog",
  "rssUrl": "https://example.com/feed",
  "siteUrl": "https://example.com",
  "lang": "EN",
  "topicTags": ["education", "edtech"],
  "trustScore": 75,
  "enabled": false,
  "fetchIntervalMinutes": 60,
  "denyKeywords": ["price", "trading"],
  "notes": "Official blog"
}
```

**Response (201 Created):**
```json
{
  "id": 1,
  "name": "Example Blog",
  ...
}
```

### PATCH /sources/:id

Update an existing source. All fields are optional.

**Request:**
```json
{
  "enabled": true,
  "trustScore": 80
}
```

**Response (200 OK):**
```json
{
  "id": 1,
  "name": "Example Blog",
  "enabled": true,
  "trustScore": 80,
  ...
}
```

### DELETE /sources/:id

Delete a source.

**Response (204 No Content)**

**Response (404 Not Found):**
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Source not found"
  }
}
```

### POST /sources/validate

Validate an RSS feed URL.

**Request:**
```json
{
  "url": "https://example.com/feed"
}
```

**Response (200 OK) - Valid Feed:**
```json
{
  "ok": true,
  "type": "RSS",
  "title": "Example Blog",
  "itemsCount": 10
}
```

---

## Admin Pipeline Triggers

All admin endpoints require authentication (`Authorization: Bearer <token>`).

### POST /admin/ingest/trigger

Manually trigger RSS ingestion for all enabled sources.

**Request:** Empty body or `{}`

**Response (200 OK):**
```json
{
  "message": "RSS ingestion triggered successfully",
  "note": "Ingestion running in background. Check server logs for progress."
}
```

### POST /admin/extraction/trigger

Manually trigger content extraction for NEW items.

**Request:**
```json
{
  "limit": 10  // Optional, default: 10
}
```

**Response (200 OK):**
```json
{
  "message": "Content extraction triggered for up to 10 items",
  "note": "Extraction running in background. Check server logs for progress."
}
```

### POST /admin/filtering/trigger

Manually trigger content filtering for EXTRACTED items.

**Request:**
```json
{
  "limit": 20  // Optional, default: 20
}
```

**Response (200 OK):**
```json
{
  "message": "Content filtering triggered for up to 20 items",
  "note": "Filtering running in background. Check server logs for progress."
}
```

### POST /admin/ai/stage-a/trigger

Manually trigger AI Stage A processing for READY_FOR_AI items.

**Request:**
```json
{
  "limit": 5  // Optional, default: 5
}
```

**Response (200 OK):**
```json
{
  "message": "AI Stage A processing triggered for up to 5 items",
  "note": "AI processing running in background. Check server logs for progress."
}
```

### POST /admin/ai/stage-b/trigger

Manually trigger AI Stage B processing for AI_STAGE_A_DONE items.

**Request:**
```json
{
  "limit": 3  // Optional, default: 3
}
```

**Response (200 OK):**
```json
{
  "message": "AI Stage B processing triggered for up to 3 items",
  "note": "AI processing running in background. Check server logs for progress."
}
```

### POST /admin/digest/trigger

Manually trigger digest generation for a specific date.

**Request:**
```json
{
  "date": "2026-02-28"  // Optional, defaults to tomorrow
}
```

**Response (200 OK):**
```json
{
  "message": "Digest generation triggered for 2026-02-28",
  "note": "Digest generation running in background. Check server logs for progress."
}
```

---

## Error Codes

- `VALIDATION_ERROR`: Request validation failed
- `UNAUTHORIZED`: Authentication required or failed
- `NOT_FOUND`: Resource not found
- `FORBIDDEN`: Access denied
- `INTERNAL`: Internal server error

---

## Source Fields

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| name | string | Yes | - | Source display name |
| rssUrl | string (URL) | Yes | - | RSS/Atom feed URL (unique) |
| siteUrl | string (URL) | No | - | Website URL |
| lang | enum | No | MIXED | Language: VI, EN, or MIXED |
| topicTags | string[] | No | [] | Topic tags (lowercase) |
| trustScore | number (0-100) | No | 70 | Trust score |
| enabled | boolean | No | false | Whether to fetch this source |
| fetchIntervalMinutes | number (5-1440) | No | 60 | Fetch interval in minutes |
| denyKeywords | string[] | No | [] | Keywords to filter out |
| notes | string | No | - | Admin notes (max 1000 chars) |

---

## Validation Rules

### Source
- `name`: 1-255 characters
- `rssUrl`: Valid URL, must be unique
- `siteUrl`: Valid URL if provided
- `lang`: One of VI, EN, MIXED
- `topicTags`: Array of strings, auto-lowercase and deduped
- `trustScore`: Integer between 0-100
- `fetchIntervalMinutes`: Integer between 5-1440 (1 day)
- `denyKeywords`: Array of strings, auto-lowercase and deduped
- `notes`: Max 1000 characters
