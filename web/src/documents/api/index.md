---
title: "API Reference"
order: 1
---

# API Reference

Complete API documentation for the OCVN AI RSS Bot backend.

**Base URL:** `http://localhost:3001/api` (development)

## Authentication

All API endpoints (except `/auth/login`) require JWT authentication.

### Login

**POST** `/auth/login`

Get JWT token for authentication.

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

**Error (401 Unauthorized):**
```json
{
  "error": {
    "message": "Invalid credentials",
    "code": "UNAUTHORIZED"
  }
}
```

### Get Current User

**GET** `/auth/me`

Get authenticated user information.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "email": "admin@opencampus.vn"
}
```

## RSS Sources

### List Sources

**GET** `/sources`

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
    "enabled": true,
    "trustScore": 85,
    "topicTags": ["education", "tech"],
    "denyKeywords": ["trading", "price"],
    "notes": "Official blog",
    "createdAt": "2026-02-28T10:00:00Z",
    "updatedAt": "2026-02-28T10:00:00Z"
  }
]
```

### Get Single Source

**GET** `/sources/:id`

**Response (200 OK):** Same as list format

**Error (404):**
```json
{
  "error": {
    "message": "Source not found",
    "code": "NOT_FOUND"
  }
}
```

### Create Source

**POST** `/sources`

**Request:**
```json
{
  "name": "Example Blog",
  "rssUrl": "https://example.com/feed",
  "siteUrl": "https://example.com",
  "lang": "EN",
  "enabled": true,
  "trustScore": 85,
  "topicTags": ["education", "tech"],
  "denyKeywords": ["trading"],
  "notes": "Official blog"
}
```

**Required fields:** `name`, `rssUrl`, `lang`

**Response (201 Created):** Returns created source object

### Update Source

**PATCH** `/sources/:id`

All fields optional. Only include fields to update.

**Request:**
```json
{
  "enabled": false,
  "trustScore": 90
}
```

**Response (200 OK):** Returns updated source object

### Delete Source

**DELETE** `/sources/:id`

**Response (204 No Content):** Empty response

### Validate RSS Feed

**POST** `/sources/validate`

Test if RSS URL is valid before adding source.

**Request:**
```json
{
  "url": "https://example.com/feed"
}
```

**Response (200 OK) - Valid:**
```json
{
  "ok": true,
  "feedType": "rss",
  "title": "Example Blog",
  "itemsCount": 10
}
```

**Response (200 OK) - Invalid:**
```json
{
  "ok": false,
  "error": "Failed to fetch feed",
  "feedType": null,
  "title": null,
  "itemsCount": 0
}
```

### Export Sources

**GET** `/sources/export`

Download all sources as JSON file.

**Response (200 OK):**
```json
{
  "exportedAt": "2026-02-28T10:00:00Z",
  "version": "1.0",
  "sources": [
    { /* source object */ }
  ]
}
```

Response includes `Content-Disposition` header for file download.

## Admin Pipeline Triggers

### Trigger Ingest

**POST** `/admin/ingest/trigger`

Manually trigger RSS ingestion for all enabled sources.

**Response (200 OK):**
```json
{
  "message": "RSS ingestion triggered successfully",
  "note": "Ingestion running in background. Check logs."
}
```

### Trigger Extraction

**POST** `/admin/extraction/trigger`

Manually trigger content extraction.

**Request (optional):**
```json
{
  "limit": 10
}
```

**Response (200 OK):**
```json
{
  "message": "Content extraction triggered for up to 10 items",
  "note": "Extraction running in background."
}
```

### Trigger Filtering

**POST** `/admin/filtering/trigger`

Manually trigger content filtering.

**Request (optional):**
```json
{
  "limit": 10
}
```

**Response (200 OK):**
```json
{
  "message": "Content filtering triggered for up to 10 items",
  "note": "Filtering running in background."
}
```

### Trigger AI Stage A

**POST** `/admin/ai/stage-a/trigger`

Manually trigger AI Stage A processing.

**Request (optional):**
```json
{
  "limit": 5
}
```

**Response (200 OK):**
```json
{
  "message": "AI Stage A triggered for up to 5 items",
  "note": "Processing in background."
}
```

### Trigger AI Stage B

**POST** `/admin/ai/stage-b/trigger`

Manually trigger AI Stage B processing.

**Request (optional):**
```json
{
  "limit": 3
}
```

**Response (200 OK):**
```json
{
  "message": "AI Stage B triggered for up to 3 items",
  "note": "Processing in background."
}
```

### Trigger Digest Generation

**POST** `/admin/digest/trigger`

Manually trigger daily digest generation.

**Response (200 OK):**
```json
{
  "message": "Digest generation triggered",
  "note": "Generating posts in background."
}
```

## Items

### List Items

**GET** `/items`

**Query Parameters:**
- `status` (optional): Filter by status (NEW, EXTRACTED, etc.)
- `search` (optional): Search in title/snippet
- `limit` (optional, default 50): Items per page
- `offset` (optional, default 0): Pagination offset

**Example:** `/items?status=AI_STAGE_B_DONE&limit=20&offset=0`

**Response (200 OK):**
```json
{
  "items": [
    {
      "id": 1,
      "sourceId": 1,
      "guid": "https://example.com/post-1",
      "title": "Article Title",
      "link": "https://example.com/post-1",
      "snippet": "Article excerpt...",
      "pubDate": "2026-02-28T10:00:00Z",
      "status": "AI_STAGE_B_DONE",
      "createdAt": "2026-02-28T10:05:00Z",
      "source": {
        "name": "Example Blog"
      }
    }
  ],
  "total": 150
}
```

### Get Item Details

**GET** `/items/:id`

**Response (200 OK):**
```json
{
  "id": 1,
  /* ... basic item fields ... */
  "article": {
    "content": "Full article text...",
    "mainImageUrl": "https://example.com/image.jpg"
  },
  "aiResults": [
    {
      "stage": "A",
      "result": {
        "isAllowed": true,
        "topicTags": ["education"],
        "importanceScore": 85
      }
    },
    {
      "stage": "B",
      "result": {
        "summary": "Vietnamese summary...",
        "bullets": ["Point 1", "Point 2"]
      }
    }
  ]
}
```

### Get Items Stats

**GET** `/items/stats`

**Response (200 OK):**
```json
{
  "total": 1500,
  "byStatus": {
    "NEW": 50,
    "EXTRACTED": 30,
    "READY_FOR_AI": 20,
    "AI_STAGE_A_DONE": 10,
    "AI_STAGE_B_DONE": 40,
    "USED_IN_POST": 800,
    "FILTERED_OUT": 400,
    "REJECTED": 150
  },
  "recentCount": 120,
  "filteredCount": 400,
  "rejectedCount": 150
}
```

## Drafts (Daily Posts)

### List Drafts

**GET** `/drafts`

**Query Parameters:**
- `status` (optional): DRAFT, APPROVED, REJECTED, POSTED
- `targetDate` (optional): Filter by date (YYYY-MM-DD)

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "targetDate": "2026-03-01",
    "timeSlot": "MORNING_1",
    "content": "📚 Tin tức...",
    "editedContent": null,
    "status": "DRAFT",
    "createdAt": "2026-02-28T10:00:00Z",
    "postItems": [
      {
        "item": {
          "id": 1,
          "title": "Article Title"
        }
      }
    ]
  }
]
```

### Get Single Draft

**GET** `/drafts/:id`

**Response (200 OK):** Same as list format with full details

### Update Draft

**PATCH** `/drafts/:id`

**Request:**
```json
{
  "targetDate": "2026-03-02",
  "timeSlot": "NOON",
  "editedContent": "Modified content...",
  "editorNotes": "Changed intro",
  "feedbackNotes": "Looks good"
}
```

All fields optional.

**Response (200 OK):** Returns updated draft

### Approve Draft

**POST** `/drafts/:id/approve`

**Response (200 OK):**
```json
{
  "message": "Draft approved successfully"
}
```

### Reject Draft

**POST** `/drafts/:id/reject`

**Request:**
```json
{
  "reason": "Content not relevant"
}
```

**Response (200 OK):**
```json
{
  "message": "Draft rejected successfully"
}
```

## Health & Stats

### Health Check

**GET** `/health`

**Response (200 OK):**
```json
{
  "status": "healthy",
  "timestamp": "2026-02-28T10:00:00Z"
}
```

### Pipeline Stats

**GET** `/stats/pipeline`

**Response (200 OK):**
```json
{
  "sources": {
    "total": 25,
    "enabled": 20
  },
  "items": {
    "total": 1500,
    "recent24h": 120,
    "byStatus": { /* ... */ }
  },
  "posts": {
    "today": 5,
    "recent7days": 35,
    "byStatus": { /* ... */ }
  }
}
```

## Error Responses

All errors follow this format:

```json
{
  "error": {
    "message": "Human-readable error message",
    "code": "ERROR_CODE",
    "details": { /* optional additional context */ }
  }
}
```

**Common HTTP Status Codes:**
- `400` - Bad Request (validation error)
- `401` - Unauthorized (missing/invalid token)
- `404` - Not Found
- `409` - Conflict (duplicate resource)
- `500` - Internal Server Error

## Rate Limits

- General API: 100 requests/minute
- AI triggers: 10 requests/minute
- Authentication: 5 requests/minute

Exceeded rate limits return `429 Too Many Requests`.

## Webhooks

Coming soon! Webhook support for:
- New items ingested
- Drafts created
- Posts approved/rejected

Stay tuned for updates.
