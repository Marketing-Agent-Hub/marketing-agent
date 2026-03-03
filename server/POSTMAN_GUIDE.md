# Postman Collection Guide - News Aggregator API

## 📥 Importing the Collection

1. Open Postman Desktop or Postman Web
2. Click **Import** button (top left)
3. Select the `postman-collection.json` file from this directory
4. The collection will be imported with all endpoints and documentation

## 🔧 Setup and Configuration

### Environment Variables

The collection uses two variables that you need to configure:

| Variable | Description | Default Value | Example |
|----------|-------------|---------------|---------|
| `baseUrl` | API base URL | `http://localhost:3001/api` | `https://api.example.com/api` |
| `authToken` | JWT authentication token | (empty, auto-filled on login) | `eyJhbGciOiJIUzI1...` |

**To set variables:**
1. In Postman, click on the collection name "News Aggregator API"
2. Go to **Variables** tab
3. Update the `baseUrl` value if your server runs on a different URL
4. Save changes

### Authentication Setup

Most endpoints require JWT authentication:

1. **Login first:**
   - Navigate to `Authentication > Login` endpoint
   - Update the request body with your credentials:
     ```json
     {
       "email": "your-admin@example.com",
       "password": "your-password"
     }
     ```
   - Send the request
   - The JWT token will be **automatically saved** to the `authToken` variable

2. **Subsequent requests:**
   - All authenticated endpoints will automatically use the saved token
   - Token is sent in the `Authorization: Bearer {{authToken}}` header

## 📚 API Overview

### Endpoint Categories

| Category | Endpoints | Description |
|----------|-----------|-------------|
| **Health Check** | 1 endpoint | Verify API availability (no auth required) |
| **Authentication** | 2 endpoints | Login and user profile |
| **Sources** | 7 endpoints | Manage RSS feed sources (CRUD + validate + export) |
| **Items** | 4 endpoints | Query content items and ready articles |
| **Admin** | 5 endpoints | Manually trigger processing jobs |
| **Stats** | 3 endpoints | Pipeline statistics and performance |
| **Monitoring** | 14 endpoints | Logs, metrics, traces, health checks |

**Total: 36 endpoints**

## 🚀 Quick Start Workflow

### 1. Verify Server is Running
```http
GET {{baseUrl}}/health
```
No authentication required. Should return `{"status": "ok"}`.

### 2. Authenticate
```http
POST {{baseUrl}}/auth/login
Body: {"email": "admin@example.com", "password": "your_password"}
```
Token is automatically saved for subsequent requests.

### 3. Create an RSS Source
```http
POST {{baseUrl}}/sources
Body: {
  "name": "Example News",
  "rssUrl": "https://example.com/rss",
  "siteUrl": "https://example.com",
  "lang": "EN",
  "trustScore": 80,
  "enabled": true
}
```

### 4. Trigger Content Processing
```http
# Step 1: Ingest RSS feeds
POST {{baseUrl}}/admin/ingest/trigger

# Step 2: Extract full content
POST {{baseUrl}}/admin/extraction/trigger
Body: {"limit": 10}

# Step 3: Filter content
POST {{baseUrl}}/admin/filtering/trigger
Body: {"limit": 20}

# Step 4: AI Stage A (categorization)
POST {{baseUrl}}/admin/ai/stage-a/trigger
Body: {"limit": 5}

# Step 5: AI Stage B (article generation)
POST {{baseUrl}}/admin/ai/stage-b/trigger
Body: {"limit": 3}
```

### 5. View Ready Articles
```http
GET {{baseUrl}}/items/ready?sortBy=importance&limit=20
```
Returns items with AI-generated full articles (300-500 words).

## 📖 Common Use Cases

### Use Case 1: Monitor Pipeline Status
```http
# Get statistics by processing stage
GET {{baseUrl}}/items/stats

# Get pipeline performance metrics
GET {{baseUrl}}/stats/pipeline

# Identify bottlenecks
GET {{baseUrl}}/stats/bottlenecks
```

### Use Case 2: Query Articles by Topic
```http
# Get technology articles sorted by importance
GET {{baseUrl}}/items/ready?topicTag=technology&sortBy=importance&limit=20

# Get education articles from a specific date range
GET {{baseUrl}}/items/ready?topicTag=education&fromDate=2026-03-01&toDate=2026-03-04
```

### Use Case 3: Troubleshoot Errors
```http
# Get recent error logs
GET {{baseUrl}}/monitor/logs?level=ERROR&limit=50

# Get health status
GET {{baseUrl}}/monitor/health

# Find slow operations
GET {{baseUrl}}/monitor/traces/slow
```

### Use Case 4: Export and Backup Sources
```http
# Export all sources as JSON for backup
GET {{baseUrl}}/sources/export

# Validate a new RSS feed before adding
POST {{baseUrl}}/sources/validate
Body: {"url": "https://newsite.com/rss"}
```

## 🔍 Understanding the Processing Pipeline

The system processes content in 5 stages:

| Stage | Status | Description | Trigger Endpoint |
|-------|--------|-------------|------------------|
| 1. **Ingest** | `NEW` | Fetch new items from RSS feeds | `/admin/ingest/trigger` |
| 2. **Extract** | `EXTRACTED` | Extract full article content from URLs | `/admin/extraction/trigger` |
| 3. **Filter** | `READY_FOR_AI` or `FILTERED_OUT` | Apply keyword filters | `/admin/filtering/trigger` |
| 4. **AI Stage A** | `AI_STAGE_A_DONE` | AI categorization, tagging, scoring | `/admin/ai/stage-a/trigger` |
| 5. **AI Stage B** | `AI_STAGE_B_DONE` | AI article generation (full 300-500 word articles) | `/admin/ai/stage-b/trigger` |

**Pipeline Flow:**
```
RSS Feed → Ingest (NEW) → Extract (EXTRACTED) → Filter (READY_FOR_AI) 
→ AI Stage A (AI_STAGE_A_DONE) → AI Stage B (AI_STAGE_B_DONE) → Ready to Publish
```

## 📝 Key Endpoints Explained

### `/items/ready` - Get Ready-to-Publish Articles

This is the **main endpoint** for retrieving fully processed articles:

**What it returns:**
- Full AI-generated articles (300-500 words)
- Natural flowing narrative content
- Summary and bullet points
- Why it matters explanations
- Topic tags and importance scores (0-10)
- Risk flags and suggested hashtags

**Filtering options:**
- `sortBy`: importance (default), date, recent
- `topicTag`: Filter by specific topic
- `sourceId`: Filter by source
- `fromDate` / `toDate`: Date range filter
- `limit` / `offset`: Pagination

**Example Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 123,
        "title": "Original Article Title",
        "fullArticle": "A complete 300-500 word article...",
        "summary": "Brief summary...",
        "bullets": ["Key point 1", "Key point 2", "Key point 3"],
        "whyItMatters": "Impact explanation...",
        "importanceScore": 8,
        "topicTags": ["technology", "education"],
        "suggestedHashtags": ["#EdTech", "#Innovation"],
        "riskFlags": [],
        "source": {
          "id": 1,
          "name": "Example News",
          "trustScore": 80
        },
        "publishedAt": "2026-03-04T10:30:00Z",
        "mainImageUrl": "https://..."
      }
    ],
    "total": 45,
    "limit": 20,
    "offset": 0
  }
}
```

### Admin Job Triggers

All admin endpoints trigger background jobs and return immediately:

**Limits (default):**
- Ingest: Process all enabled sources
- Extraction: 10 items
- Filtering: 20 items
- AI Stage A: 5 items (uses GPT-4o-mini)
- AI Stage B: 3 items (uses GPT-4o - more expensive)

**How to use:**
1. Send POST request with optional `{"limit": N}` body
2. Job runs in background
3. Check logs or stats endpoints to monitor progress
4. View processed items via `/items` or `/items/ready` endpoints

## 🔐 Security Notes

1. **Authentication Required:**
   - All endpoints except `/health` and `/auth/login` require JWT authentication
   - Token expires after configured duration (check server `JWT_EXPIRES_IN` env var)
   - Re-login if you receive `401 Unauthorized` responses

2. **API Key Management:**
   - Never commit `.env` files with API credentials
   - OpenAI API key is required for AI processing
   - Use environment variables for sensitive configuration

## 🌐 Multi-Language Support

The system supports multiple languages via environment variables:

| Variable | Description | Values |
|----------|-------------|--------|
| `CONTENT_LANGUAGE` | Target language for AI-generated content | `vi` (Vietnamese), `en` (English), `es` (Spanish) |
| `TARGET_AUDIENCE` | Who the content is for | e.g., "students", "professionals", "general public" |
| `FOCUS_TOPICS` | Topics of interest | Comma-separated list, e.g., "education,technology,innovation" |
| `APP_NAME` | Organization name | e.g., "Tech News Daily" |

**Example AI-generated output adapts to language:**
- **Vietnamese**: Natural Vietnamese tone with appropriate cultural context
- **English**: Clear, professional English writing
- **Spanish**: Natural Spanish with appropriate formality

## 📊 Monitoring and Observability

The `/monitor` endpoints provide comprehensive observability:

| Feature | Endpoints | Use Case |
|---------|-----------|----------|
| **Logs** | `/monitor/logs`, `/monitor/logs/stats` | Debug issues, view errors |
| **Metrics** | `/monitor/metrics`, `/monitor/metrics/stats`, `/monitor/metrics/system` | Performance monitoring, resource usage |
| **Traces** | `/monitor/traces`, `/monitor/traces/slow`, `/monitor/traces/:traceId` | Request tracking, find bottlenecks |
| **Health** | `/monitor/health`, `/monitor/health/history` | System status, uptime monitoring |
| **Overview** | `/monitor/overview` | Dashboard view of all metrics |

**Common Filters:**
- `level`: TRACE, DEBUG, INFO, WARN, ERROR, FATAL
- `startDate` / `endDate`: ISO format (e.g., `2026-03-01T00:00:00Z`)
- `limit` / `offset`: Pagination (max 500 per request)

## ⚡ Performance Optimization Tips

1. **Use appropriate limits:**
   - Start with small limits for AI processing (3-5 items)
   - Monitor processing time and costs
   - Increase gradually based on capacity

2. **Pagination best practices:**
   - Use `limit` and `offset` for large result sets
   - Default limits are optimized for most use cases
   - Maximum 500 items per request for monitoring endpoints

3. **Filtering strategies:**
   - Use `topicTag` filter to narrow results
   - Apply date ranges to limit data volume
   - Use `status` filter on `/items` to query specific pipeline stages

4. **Caching considerations:**
   - Ready articles (`/items/ready`) change only when new items complete Stage B
   - Stats endpoints can be cached for 1-5 minutes
   - Health checks should not be cached

## 🐛 Troubleshooting

### Problem: "401 Unauthorized" on all requests
**Solution:** Login again via `/auth/login` to refresh your JWT token.

### Problem: "No items found" in `/items/ready`
**Solution:** 
1. Check if sources are enabled: `GET /sources`
2. Trigger the pipeline manually: POST to `/admin/ingest/trigger`, then each stage
3. Check item statuses: `GET /items/stats`
4. View processing logs: `GET /monitor/logs?level=ERROR`

### Problem: AI processing not working
**Solution:**
1. Verify OpenAI API key is configured in server `.env`
2. Check error logs: `GET /monitor/logs?service=ai-stage-a` or `?service=ai-stage-b`
3. Check if items are in correct status: `GET /items?status=READY_FOR_AI` (for Stage A) or `?status=AI_STAGE_A_DONE` (for Stage B)

### Problem: "EPERM" error during Prisma generation
**Solution:** Stop development server first, then run `npx prisma generate`, then restart server.

## 📞 Support and Documentation

- **Swagger/OpenAPI:** Available at `http://localhost:3001/api/docs` (if configured)
- **Server Logs:** Check console output of the server process
- **Monitoring Dashboard:** Use `/monitor/overview` for real-time status
- **Environment Configuration:** See `CONFIGURATION.md` for all environment variables

## 🔄 Updates and Versioning

This collection matches the server API as of **March 4, 2026**.

**Recent Updates:**
- ✅ Added `/items/ready` endpoint for full AI-generated articles
- ✅ Enhanced AI Stage B with 300-500 word article generation
- ✅ Removed digest/drafts functionality
- ✅ Generalized from OCVN-specific to universal news aggregator
- ✅ Multi-language support (Vietnamese, English, Spanish)

**Migration Notes:**
- Legacy `/drafts` endpoints have been removed
- Use `/items/ready` instead for publication-ready content
- `fullArticle` field added to AI Stage B results

---

**Happy API Testing! 🚀**

Need help? Check the `/monitor/health` endpoint and logs first!
