# API Documentation - News Aggregator

> Tài liệu API chi tiết cho Frontend Developers

## 📋 Mục lục

- [Base URL & Authentication](#base-url--authentication)
- [Authentication APIs](#authentication-apis)
- [Source Management APIs](#source-management-apis)
- [Item APIs](#item-apis)
- [Admin/Pipeline Control APIs](#adminpipeline-control-apis)
- [Monitoring APIs](#monitoring-apis)
- [Error Handling](#error-handling)
- [Common Workflows](#common-workflows)

---

## Base URL & Authentication

### Base URL
```
Development: http://localhost:3000/api
Production: https://your-domain.com/api
```

### Authentication

Hệ thống sử dụng **JWT Bearer Token**. Sau khi login thành công, frontend cần:

1. Lưu token từ response
2. Gửi token trong header của mỗi request

**Header format:**
```
Authorization: Bearer <your-jwt-token>
```

**Token expiration:** Token có thời hạn (kiểm tra `expiresIn` trong response). Khi hết hạn, cần login lại.

---

## Authentication APIs

### 1. Login

**POST** `/api/auth/login`

Đăng nhập và nhận JWT token.

**Request Body:**
```json
{
  "email": "admin@example.com",
  "password": "your-password"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "admin@example.com",
    "role": "ADMIN",
    "createdAt": "2026-03-04T10:00:00.000Z"
  }
}
```

**Error (401):**
```json
{
  "error": "Invalid credentials"
}
```

**Example (JavaScript):**
```javascript
async function login(email, password) {
  const response = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });
  
  if (!response.ok) {
    throw new Error('Login failed');
  }
  
  const data = await response.json();
  // Save token to localStorage or state management
  localStorage.setItem('token', data.token);
  return data;
}
```

### 2. Get Current User

**GET** `/api/auth/me`

Lấy thông tin user hiện tại (yêu cầu auth).

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "id": 1,
  "email": "admin@example.com",
  "role": "ADMIN",
  "createdAt": "2026-03-04T10:00:00.000Z"
}
```

**Example (JavaScript):**
```javascript
async function getCurrentUser() {
  const token = localStorage.getItem('token');
  const response = await fetch('http://localhost:3000/api/auth/me', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to get user info');
  }
  
  return await response.json();
}
```

---

## Source Management APIs

Tất cả endpoints yêu cầu authentication.

### 1. Get All Sources

**GET** `/api/sources`

Lấy danh sách tất cả RSS sources.

**Query Parameters:**
- Không có

**Response (200):**
```json
{
  "sources": [
    {
      "id": 1,
      "name": "VnExpress",
      "rssUrl": "https://vnexpress.net/rss/tin-moi-nhat.rss",
      "siteUrl": "https://vnexpress.net",
      "lang": "VI",
      "topicTags": ["news", "vietnam"],
      "trustScore": 80,
      "enabled": true,
      "fetchIntervalMinutes": 60,
      "denyKeywords": ["ad", "sponsored"],
      "notes": "Báo VnExpress",
      "createdAt": "2026-03-01T00:00:00.000Z",
      "updatedAt": "2026-03-04T00:00:00.000Z",
      "lastFetchedAt": "2026-03-04T09:00:00.000Z"
    }
  ]
}
```

**Example (JavaScript):**
```javascript
async function getSources() {
  const token = localStorage.getItem('token');
  const response = await fetch('http://localhost:3000/api/sources', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  return await response.json();
}
```

### 2. Get Source by ID

**GET** `/api/sources/:id`

Lấy chi tiết 1 source.

**Response (200):**
```json
{
  "id": 1,
  "name": "VnExpress",
  "rssUrl": "https://vnexpress.net/rss/tin-moi-nhat.rss",
  "siteUrl": "https://vnexpress.net",
  "lang": "VI",
  "topicTags": ["news", "vietnam"],
  "trustScore": 80,
  "enabled": true,
  "fetchIntervalMinutes": 60,
  "denyKeywords": [],
  "notes": "Báo VnExpress",
  "createdAt": "2026-03-01T00:00:00.000Z",
  "updatedAt": "2026-03-04T00:00:00.000Z",
  "lastFetchedAt": "2026-03-04T09:00:00.000Z"
}
```

**Error (404):**
```json
{
  "error": "Source not found"
}
```

### 3. Create Source

**POST** `/api/sources`

Tạo RSS source mới.

**Request Body:**
```json
{
  "name": "Tuổi Trẻ",
  "rssUrl": "https://tuoitre.vn/rss/tin-moi-nhat.rss",
  "siteUrl": "https://tuoitre.vn",
  "lang": "VI",
  "topicTags": ["news", "vietnam"],
  "trustScore": 75,
  "enabled": true,
  "fetchIntervalMinutes": 60,
  "denyKeywords": ["quảng cáo"],
  "notes": "Báo Tuổi Trẻ"
}
```

**Field Descriptions:**
- `name` (required): Tên nguồn tin
- `rssUrl` (required): URL của RSS feed
- `siteUrl` (optional): URL trang web chính
- `lang` (optional): `VI`, `EN`, hoặc `MIXED` (default: `MIXED`)
- `topicTags` (optional): Mảng các tag chủ đề (default: `[]`)
- `trustScore` (optional): Điểm tin cậy 0-100 (default: `70`)
- `enabled` (optional): Bật/tắt source (default: `false`)
- `fetchIntervalMinutes` (optional): Khoảng thời gian fetch (5-1440, default: `60`)
- `denyKeywords` (optional): Từ khóa loại trừ (default: `[]`)
- `notes` (optional): Ghi chú

**Response (201):**
```json
{
  "id": 2,
  "name": "Tuổi Trẻ",
  "rssUrl": "https://tuoitre.vn/rss/tin-moi-nhat.rss",
  "siteUrl": "https://tuoitre.vn",
  "lang": "VI",
  "topicTags": ["news", "vietnam"],
  "trustScore": 75,
  "enabled": true,
  "fetchIntervalMinutes": 60,
  "denyKeywords": ["quảng cáo"],
  "notes": "Báo Tuổi Trẻ",
  "createdAt": "2026-03-04T10:00:00.000Z",
  "updatedAt": "2026-03-04T10:00:00.000Z",
  "lastFetchedAt": null
}
```

**Example (JavaScript):**
```javascript
async function createSource(sourceData) {
  const token = localStorage.getItem('token');
  const response = await fetch('http://localhost:3000/api/sources', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(sourceData),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create source');
  }
  
  return await response.json();
}
```

### 4. Update Source

**PATCH** `/api/sources/:id`

Cập nhật source (partial update - chỉ gửi fields cần thay đổi).

**Request Body (example):**
```json
{
  "enabled": false,
  "trustScore": 85,
  "notes": "Tạm dừng để kiểm tra"
}
```

**Response (200):**
```json
{
  "id": 1,
  "name": "VnExpress",
  "enabled": false,
  "trustScore": 85,
  "notes": "Tạm dừng để kiểm tra",
  "updatedAt": "2026-03-04T10:30:00.000Z"
}
```

### 5. Delete Source

**DELETE** `/api/sources/:id`

Xóa source.

**Response (200):**
```json
{
  "message": "Source deleted successfully"
}
```

**Error (404):**
```json
{
  "error": "Source not found"
}
```

### 6. Validate RSS URL

**POST** `/api/sources/validate`

Kiểm tra RSS URL có hợp lệ không (trước khi tạo source).

**Request Body:**
```json
{
  "url": "https://vnexpress.net/rss/tin-moi-nhat.rss"
}
```

**Response (200) - Valid:**
```json
{
  "valid": true,
  "metadata": {
    "title": "VnExpress",
    "description": "Tin tức mới nhất",
    "itemCount": 50,
    "link": "https://vnexpress.net"
  }
}
```

**Response (200) - Invalid:**
```json
{
  "valid": false,
  "error": "Invalid RSS feed format"
}
```

### 7. Export Sources

**GET** `/api/sources/export`

Export tất cả sources dưới dạng JSON.

**Response (200):**
```json
{
  "sources": [
    {
      "id": 1,
      "name": "VnExpress",
      "rssUrl": "https://vnexpress.net/rss/tin-moi-nhat.rss",
      "..."
    }
  ],
  "exportedAt": "2026-03-04T10:00:00.000Z",
  "count": 5
}
```

---

## Item APIs

Tất cả endpoints yêu cầu authentication.

### 1. Get Items with Filtering

**GET** `/api/items`

Lấy danh sách items với filter và pagination.

**Query Parameters:**
- `status` (optional): `NEW`, `EXTRACTED`, `FILTERED_OUT`, `READY_FOR_AI`, `AI_STAGE_A_DONE`, `AI_STAGE_B_DONE`, `USED`
- `sourceId` (optional): Filter theo source ID
- `limit` (optional): Số lượng items (default: `50`)
- `offset` (optional): Offset cho pagination (default: `0`)
- `search` (optional): Tìm kiếm trong title/content

**Example URL:**
```
/api/items?status=AI_STAGE_B_DONE&limit=20&offset=0
/api/items?sourceId=1&limit=10
/api/items?search=blockchain&status=READY_FOR_AI
```

**Response (200):**
```json
{
  "items": [
    {
      "id": 100,
      "sourceId": 1,
      "guid": "https://vnexpress.net/article-123",
      "title": "Tin công nghệ mới nhất",
      "link": "https://vnexpress.net/article-123",
      "publishedAt": "2026-03-04T09:00:00.000Z",
      "status": "AI_STAGE_B_DONE",
      "rawContent": "Nội dung gốc...",
      "fullArticle": "Bài viết đã qua AI...",
      "createdAt": "2026-03-04T09:15:00.000Z",
      "updatedAt": "2026-03-04T09:30:00.000Z",
      "source": {
        "id": 1,
        "name": "VnExpress"
      },
      "article": {
        "id": 1,
        "mainImageUrl": "https://vnexpress.net/images/article-image.jpg",
        "imageList": [
          "https://vnexpress.net/images/article-image.jpg",
          "https://vnexpress.net/images/chart-1.png",
          "https://vnexpress.net/images/photo-2.jpg"
        ]
      },
      "aiResults": [
        {
          "stage": "STAGE_B",
          "importanceScore": 85,
          "topicTags": ["technology", "ai"],
          "fullArticle": "Bài viết Facebook hoàn chỉnh...",
          "createdAt": "2026-03-04T09:30:00.000Z"
        }
      ]
    }
  ],
  "total": 156,
  "limit": 20,
  "offset": 0
}
```

**Example (JavaScript):**
```javascript
async function getItems({ status, sourceId, limit = 50, offset = 0, search }) {
  const token = localStorage.getItem('token');
  
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (sourceId) params.append('sourceId', sourceId);
  if (limit) params.append('limit', limit);
  if (offset) params.append('offset', offset);
  if (search) params.append('search', search);
  
  const response = await fetch(
    `http://localhost:3000/api/items?${params.toString()}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );
  
  return await response.json();
}
```

### 2. Get Ready-to-Publish Items

**GET** `/api/items/ready`

Lấy các items đã qua AI Stage B, sẵn sàng publish lên Facebook.

**Query Parameters:**
- `limit` (optional): Số lượng items (default: `20`)
- `offset` (optional): Offset (default: `0`)
- `sortBy` (optional): `importance`, `date`, `recent` (default: `importance`)
- `sourceId` (optional): Filter theo source
- `topicTag` (optional): Filter theo topic tag
- `fromDate` (optional): Từ ngày (ISO string)
- `toDate` (optional): Đến ngày (ISO string)

**Example URL:**
```
/api/items/ready?sortBy=importance&limit=10
/api/items/ready?topicTag=technology&fromDate=2026-03-01
```

**Response (200):**
```json
{
  "items": [
    {
      "id": 100,
      "title": "Tin công nghệ mới nhất",
      "link": "https://vnexpress.net/article-123",
      "publishedAt": "2026-03-04T09:00:00.000Z",
      "importanceScore": 85,
      "topicTags": ["technology", "ai"],
      "fullArticle": "📱 AI mới nhất đang thay đổi cuộc sống...\n______________\nBối cảnh...",
      "mainImageUrl": "https://vnexpress.net/images/ai-feature.jpg",
      "imageList": [
        "https://vnexpress.net/images/ai-feature.jpg",
        "https://vnexpress.net/images/tech-chart.png"
      ],
      "source": {
        "id": 1,
        "name": "VnExpress",
        "trustScore": 80
      }
    }
  ],
  "total": 45,
  "limit": 10,
  "offset": 0
}
```

**Example (JavaScript):**
```javascript
async function getReadyItems({ sortBy = 'importance', limit = 20, topicTag }) {
  const token = localStorage.getItem('token');
  
  const params = new URLSearchParams({ sortBy, limit });
  if (topicTag) params.append('topicTag', topicTag);
  
  const response = await fetch(
    `http://localhost:3000/api/items/ready?${params.toString()}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );
  
  return await response.json();
}
```

### 3. Get Item by ID

**GET** `/api/items/:id`

Lấy chi tiết 1 item.

**Response (200):**
```json
{
  "id": 100,
  "sourceId": 1,
  "guid": "https://vnexpress.net/article-123",
  "title": "Tin công nghệ mới nhất",
  "link": "https://vnexpress.net/article-123",
  "publishedAt": "2026-03-04T09:00:00.000Z",
  "status": "AI_STAGE_B_DONE",
  "rawContent": "Nội dung gốc từ RSS...",
  "fullArticle": "Bài viết Facebook hoàn chỉnh...",
  "createdAt": "2026-03-04T09:15:00.000Z",
  "updatedAt": "2026-03-04T09:30:00.000Z",
  "source": {
    "id": 1,
    "name": "VnExpress",
    "rssUrl": "https://vnexpress.net/rss/...",
    "trustScore": 80
  },
  "article": {
    "id": 1,
    "fullHtml": "<html>...</html>",
    "extractedContent": "Full text content...",
    "truncatedContent": "Truncated for AI...",
    "mainImageUrl": "https://vnexpress.net/images/main.jpg",
    "imageList": [
      "https://vnexpress.net/images/main.jpg",
      "https://vnexpress.net/images/diagram.png",
      "https://vnexpress.net/images/photo-1.jpg",
      "https://vnexpress.net/images/photo-2.jpg"
    ],
    "createdAt": "2026-03-04T09:16:00.000Z"
  },
  "aiResults": [
    {
      "id": 50,
      "stage": "STAGE_A",
      "accept": true,
      "reasoning": "Tin tức công nghệ phù hợp",
      "importanceScore": 85,
      "topicTags": ["technology"],
      "createdAt": "2026-03-04T09:20:00.000Z"
    },
    {
      "id": 51,
      "stage": "STAGE_B",
      "importanceScore": 85,
      "topicTags": ["technology", "ai"],
      "fullArticle": "📱 AI mới nhất...\n______________\n...",
      "createdAt": "2026-03-04T09:30:00.000Z"
    }
  ]
}
```

### 4. Get Items Statistics

**GET** `/api/items/stats`

Lấy thống kê tổng quan về items.

**Response (200):**
```json
{
  "totalItems": 1250,
  "byStatus": {
    "NEW": 45,
    "EXTRACTED": 30,
    "FILTERED_OUT": 120,
    "READY_FOR_AI": 25,
    "AI_STAGE_A_DONE": 15,
    "AI_STAGE_B_DONE": 80,
    "USED": 850
  },
  "last24Hours": {
    "ingested": 120,
    "processed": 95,
    "published": 45
  },
  "avgProcessingTime": {
    "extraction": 5.2,
    "filtering": 2.1,
    "aiStageA": 8.5,
    "aiStageB": 15.3
  }
}
```

---

## Admin/Pipeline Control APIs

Tất cả endpoints yêu cầu authentication. Dành cho trigger thủ công các bước trong pipeline.

### 1. Trigger RSS Ingestion

**POST** `/api/admin/ingest/trigger`

Trigger việc fetch RSS từ tất cả sources đang enabled.

**Request Body:**
```json
{}
```

**Response (200):**
```json
{
  "message": "RSS ingestion triggered successfully",
  "note": "Ingestion running in background. Check server logs for progress."
}
```

**Example (JavaScript):**
```javascript
async function triggerIngestion() {
  const token = localStorage.getItem('token');
  const response = await fetch('http://localhost:3000/api/admin/ingest/trigger', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });
  
  return await response.json();
}
```

### 2. Trigger Content Extraction

**POST** `/api/admin/extraction/trigger`

Extract full content cho items có status = `NEW`.

**Request Body:**
```json
{
  "limit": 10
}
```

**Response (200):**
```json
{
  "message": "Content extraction triggered for up to 10 items",
  "note": "Extraction running in background. Check server logs for progress."
}
```

### 3. Trigger Content Filtering

**POST** `/api/admin/filtering/trigger`

Filter nội dung cho items có status = `EXTRACTED`.

**Request Body:**
```json
{
  "limit": 20
}
```

**Response (200):**
```json
{
  "message": "Content filtering triggered for up to 20 items",
  "note": "Filtering running in background. Check server logs for progress."
}
```

### 4. Trigger AI Stage A

**POST** `/api/admin/ai/stage-a/trigger`

Chạy AI Stage A cho items có status = `READY_FOR_AI`.

**Request Body:**
```json
{
  "limit": 5
}
```

**Response (200):**
```json
{
  "message": "AI Stage A processing triggered for up to 5 items",
  "note": "AI processing running in background. Check server logs for progress."
}
```

### 5. Trigger AI Stage B

**POST** `/api/admin/ai/stage-b/trigger`

Chạy AI Stage B cho items có status = `AI_STAGE_A_DONE`.

**Request Body:**
```json
{
  "limit": 5
}
```

**Response (200):**
```json
{
  "message": "AI Stage B processing triggered for up to 5 items",
  "note": "AI processing running in background. Check server logs for progress."
}
```

---

## Monitoring APIs

Tất cả endpoints yêu cầu authentication. Dành cho system monitoring và debugging.

### 1. Get Monitoring Overview

**GET** `/api/monitor/overview`

Dashboard overview của system.

**Response (200):**
```json
{
  "systemHealth": "HEALTHY",
  "lastUpdated": "2026-03-04T10:35:00.000Z",
  "metrics": {
    "totalRequests": 15420,
    "avgResponseTime": 245,
    "errorRate": 0.8
  },
  "recentLogs": [
    {
      "level": "INFO",
      "message": "RSS ingestion completed",
      "timestamp": "2026-03-04T10:30:00.000Z"
    }
  ],
  "activeJobs": [
    {
      "name": "ai-stage-b",
      "status": "RUNNING",
      "progress": "3/5"
    }
  ]
}
```

### 2. Get Logs

**GET** `/api/monitor/logs`

Lấy system logs.

**Query Parameters:**
- `level` (optional): `DEBUG`, `INFO`, `WARN`, `ERROR`
- `limit` (optional): Số lượng logs (default: `100`)
- `offset` (optional): Offset (default: `0`)
- `search` (optional): Tìm kiếm trong message

**Response (200):**
```json
{
  "logs": [
    {
      "id": 12345,
      "level": "INFO",
      "message": "RSS ingestion started for source: VnExpress",
      "metadata": {
        "sourceId": 1,
        "sourceName": "VnExpress"
      },
      "timestamp": "2026-03-04T10:30:00.000Z"
    }
  ],
  "total": 5420,
  "limit": 100,
  "offset": 0
}
```

### 3. Get Metrics

**GET** `/api/monitor/metrics`

Lấy performance metrics.

**Query Parameters:**
- `from` (optional): ISO date string
- `to` (optional): ISO date string
- `metric` (optional): Tên metric cụ thể

**Response (200):**
```json
{
  "metrics": [
    {
      "name": "api_response_time",
      "value": 245.5,
      "unit": "ms",
      "timestamp": "2026-03-04T10:35:00.000Z"
    },
    {
      "name": "database_connections",
      "value": 15,
      "unit": "count",
      "timestamp": "2026-03-04T10:35:00.000Z"
    }
  ]
}
```

### 4. Get System Metrics

**GET** `/api/monitor/metrics/system`

Lấy system-level metrics (CPU, memory, etc.).

**Response (200):**
```json
{
  "cpu": {
    "usage": 45.2,
    "cores": 8
  },
  "memory": {
    "used": 2048,
    "total": 8192,
    "percentage": 25
  },
  "disk": {
    "used": 50000,
    "total": 256000,
    "percentage": 19.5
  },
  "uptime": 86400,
  "timestamp": "2026-03-04T10:35:00.000Z"
}
```

### 5. Get Health Status

**GET** `/api/monitor/health`

Kiểm tra health của system và dependencies.

**Response (200):**
```json
{
  "status": "HEALTHY",
  "timestamp": "2026-03-04T10:35:00.000Z",
  "services": {
    "database": {
      "status": "HEALTHY",
      "responseTime": 12
    },
    "openai": {
      "status": "HEALTHY",
      "responseTime": 456
    },
    "redis": {
      "status": "DEGRADED",
      "responseTime": 850,
      "message": "High latency detected"
    }
  }
}
```

### 6. Get Traces

**GET** `/api/monitor/traces`

Lấy request traces cho debugging.

**Query Parameters:**
- `limit` (optional): Số lượng traces (default: `50`)
- `minDuration` (optional): Lọc traces >= minDuration (ms)

**Response (200):**
```json
{
  "traces": [
    {
      "traceId": "trace-12345",
      "operation": "POST /api/sources",
      "duration": 1250,
      "startTime": "2026-03-04T10:30:00.000Z",
      "status": "SUCCESS"
    }
  ]
}
```

### 7. Get Slow Traces

**GET** `/api/monitor/traces/slow`

Lấy các traces chậm (> threshold).

**Query Parameters:**
- `threshold` (optional): Duration threshold in ms (default: `1000`)
- `limit` (optional): Số lượng traces (default: `50`)

**Response (200):**
```json
{
  "traces": [
    {
      "traceId": "trace-12345",
      "operation": "POST /api/admin/ai/stage-b/trigger",
      "duration": 15230,
      "startTime": "2026-03-04T10:30:00.000Z"
    }
  ]
}
```

---

## Error Handling

Tất cả errors đều trả về JSON với format chuẩn:

### Error Response Format

```json
{
  "error": "Error message description",
  "details": "Optional additional details",
  "code": "ERROR_CODE"
}
```

### HTTP Status Codes

| Status | Meaning | Example |
|--------|---------|---------|
| `200` | Success | Request thành công |
| `201` | Created | Tạo resource thành công |
| `400` | Bad Request | Validation error, thiếu fields |
| `401` | Unauthorized | Token invalid hoặc hết hạn |
| `403` | Forbidden | Không có quyền truy cập |
| `404` | Not Found | Resource không tồn tại |
| `409` | Conflict | Resource đã tồn tại (duplicate) |
| `500` | Internal Server Error | Lỗi server |

### Common Error Responses

**401 Unauthorized:**
```json
{
  "error": "Authentication required"
}
```

**401 Token Expired:**
```json
{
  "error": "Token expired"
}
```

**400 Validation Error:**
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "email",
      "message": "Invalid email format"
    },
    {
      "field": "rssUrl",
      "message": "RSS URL must be a valid URL"
    }
  ]
}
```

**404 Not Found:**
```json
{
  "error": "Source not found"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Internal server error",
  "details": "Please contact support if this persists"
}
```

### Error Handling in JavaScript

```javascript
async function fetchWithErrorHandling(url, options = {}) {
  try {
    const response = await fetch(url, options);
    
    // Check if response is ok
    if (!response.ok) {
      const error = await response.json();
      
      // Handle specific status codes
      if (response.status === 401) {
        // Token expired or invalid - redirect to login
        localStorage.removeItem('token');
        window.location.href = '/login';
        throw new Error('Session expired. Please login again.');
      }
      
      if (response.status === 400) {
        // Validation error
        const validationErrors = error.details || [];
        throw new Error(
          validationErrors.map(e => `${e.field}: ${e.message}`).join(', ')
        );
      }
      
      throw new Error(error.error || 'Request failed');
    }
    
    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

// Usage
try {
  const data = await fetchWithErrorHandling('http://localhost:3000/api/sources', {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
    },
  });
  console.log('Data:', data);
} catch (error) {
  alert(`Error: ${error.message}`);
}
```

---

## Common Workflows

### Workflow 1: Login và Fetch Sources

```javascript
// 1. Login
const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'admin@example.com',
    password: 'your-password',
  }),
});

const { token } = await loginResponse.json();
localStorage.setItem('token', token);

// 2. Get sources
const sourcesResponse = await fetch('http://localhost:3000/api/sources', {
  headers: {
    'Authorization': `Bearer ${token}`,
  },
});

const { sources } = await sourcesResponse.json();
console.log('Sources:', sources);
```

### Workflow 2: Create Source và Trigger Ingestion

```javascript
const token = localStorage.getItem('token');

// 1. Validate RSS URL trước
const validateResponse = await fetch('http://localhost:3000/api/sources/validate', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    url: 'https://vnexpress.net/rss/tin-moi-nhat.rss',
  }),
});

const validation = await validateResponse.json();

if (!validation.valid) {
  alert('RSS URL không hợp lệ!');
  return;
}

// 2. Create source
const createResponse = await fetch('http://localhost:3000/api/sources', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: 'VnExpress',
    rssUrl: 'https://vnexpress.net/rss/tin-moi-nhat.rss',
    siteUrl: 'https://vnexpress.net',
    lang: 'VI',
    enabled: true,
    trustScore: 80,
  }),
});

const newSource = await createResponse.json();
console.log('Created source:', newSource);

// 3. Trigger ingestion ngay
const triggerResponse = await fetch('http://localhost:3000/api/admin/ingest/trigger', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({}),
});

const result = await triggerResponse.json();
console.log(result.message);
```

### Workflow 3: Get Ready-to-Publish Items

```javascript
const token = localStorage.getItem('token');

// Get top 10 items sẵn sàng publish, sorted by importance
const response = await fetch(
  'http://localhost:3000/api/items/ready?sortBy=importance&limit=10',
  {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  }
);

const { items } = await response.json();

items.forEach(item => {
  console.log(`[${item.importanceScore}] ${item.title}`);
  console.log(`Topics: ${item.topicTags.join(', ')}`);
  console.log('Facebook Post:');
  console.log(item.fullArticle);
  console.log('---');
});
```

### Workflow 4: Search và Filter Items

```javascript
const token = localStorage.getItem('token');

// Search for items about "blockchain" that are ready
const response = await fetch(
  'http://localhost:3000/api/items?search=blockchain&status=AI_STAGE_B_DONE&limit=20',
  {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  }
);

const { items, total } = await response.json();

console.log(`Found ${total} items matching "blockchain"`);

items.forEach(item => {
  console.log(`- ${item.title}`);
  console.log(`  Source: ${item.source.name}`);
  console.log(`  Published: ${new Date(item.publishedAt).toLocaleDateString('vi-VN')}`);
});
```

---

## TypeScript Types

Nếu dùng TypeScript, có thể define types như sau:

```typescript
// Auth types
interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  token: string;
  user: User;
}

interface User {
  id: number;
  email: string;
  role: 'ADMIN' | 'USER';
  createdAt: string;
}

// Source types
type SourceLang = 'VI' | 'EN' | 'MIXED';

interface Source {
  id: number;
  name: string;
  rssUrl: string;
  siteUrl?: string;
  lang: SourceLang;
  topicTags: string[];
  trustScore: number;
  enabled: boolean;
  fetchIntervalMinutes: number;
  denyKeywords: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
  lastFetchedAt?: string;
}

interface CreateSourceRequest {
  name: string;
  rssUrl: string;
  siteUrl?: string;
  lang?: SourceLang;
  topicTags?: string[];
  trustScore?: number;
  enabled?: boolean;
  fetchIntervalMinutes?: number;
  denyKeywords?: string[];
  notes?: string;
}

// Item types
type ItemStatus = 
  | 'NEW'
  | 'EXTRACTED'
  | 'FILTERED_OUT'
  | 'READY_FOR_AI'
  | 'AI_STAGE_A_DONE'
  | 'AI_STAGE_B_DONE'
  | 'USED';

interface Item {
  id: number;
  sourceId: number;
  guid: string;
  title: string;
  link: string;
  publishedAt: string;
  status: ItemStatus;
  rawContent?: string;
  fullArticle?: string;
  createdAt: string;
  updatedAt: string;
  source: {
    id: number;
    name: string;
    trustScore?: number;
  };
  aiResults?: AiResult[];
}

interface AiResult {
  id: number;
  stage: 'STAGE_A' | 'STAGE_B';
  accept?: boolean;
  reasoning?: string;
  importanceScore?: number;
  topicTags?: string[];
  fullArticle?: string;
  createdAt: string;
}

// API Response types
interface GetItemsResponse {
  items: Item[];
  total: number;
  limit: number;
  offset: number;
}

interface GetSourcesResponse {
  sources: Source[];
}

// Error type
interface ApiError {
  error: string;
  details?: string | Array<{ field: string; message: string }>;
  code?: string;
}
```

---

## React Hook Examples

### useAuth Hook

```typescript
import { useState, useEffect } from 'react';

interface AuthState {
  token: string | null;
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    token: localStorage.getItem('token'),
    user: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    if (state.token) {
      // Fetch current user
      fetch('http://localhost:3000/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${state.token}`,
        },
      })
        .then(res => res.json())
        .then(user => setState(prev => ({ ...prev, user, isLoading: false })))
        .catch(error => {
          console.error('Auth error:', error);
          localStorage.removeItem('token');
          setState({ token: null, user: null, isLoading: false, error: error.message });
        });
    } else {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [state.token]);

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      const { token, user } = await response.json();
      localStorage.setItem('token', token);
      setState({ token, user, isLoading: false, error: null });
    } catch (error: any) {
      setState(prev => ({ ...prev, error: error.message }));
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setState({ token: null, user: null, isLoading: false, error: null });
  };

  return { ...state, login, logout };
}
```

### useSources Hook

```typescript
import { useState, useEffect } from 'react';

export function useSources() {
  const [sources, setSources] = useState<Source[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSources = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3000/api/sources', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch sources');
      }

      const { sources } = await response.json();
      setSources(sources);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSources();
  }, []);

  const createSource = async (data: CreateSourceRequest) => {
    const token = localStorage.getItem('token');
    const response = await fetch('http://localhost:3000/api/sources', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to create source');
    }

    const newSource = await response.json();
    setSources(prev => [...prev, newSource]);
    return newSource;
  };

  const updateSource = async (id: number, data: Partial<Source>) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`http://localhost:3000/api/sources/${id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to update source');
    }

    const updatedSource = await response.json();
    setSources(prev => prev.map(s => s.id === id ? updatedSource : s));
    return updatedSource;
  };

  const deleteSource = async (id: number) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`http://localhost:3000/api/sources/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to delete source');
    }

    setSources(prev => prev.filter(s => s.id !== id));
  };

  return {
    sources,
    isLoading,
    error,
    refresh: fetchSources,
    createSource,
    updateSource,
    deleteSource,
  };
}
```

---

## Notes

### CORS Configuration

Server đã cấu hình CORS, frontend có thể gọi API từ bất kỳ origin nào (hoặc theo cấu hình trong `CORS_ORIGIN` environment variable).

### Rate Limiting

Hiện tại chưa có rate limiting. Nếu cần thiết, sẽ được thêm vào sau.

### WebSocket Support

Hiện tại API chỉ hỗ trợ REST. Nếu cần real-time updates (như pipeline progress), có thể:
1. Polling với `setInterval`
2. Sử dụng Server-Sent Events (planned)
3. WebSocket (planned)

### API Versioning

Hiện tại: `/api/...`
Trong tương lai nếu có breaking changes: `/api/v2/...`

---

## Support

Nếu có vấn đề với API:
1. Kiểm tra server logs
2. Sử dụng monitoring endpoints (`/api/monitor/*`)
3. Kiểm tra database connection
4. Verify token chưa hết hạn

**Health Check:**
```bash
GET http://localhost:3000/api/health
```

Trả về `{"status": "ok"}` nếu server đang chạy.
