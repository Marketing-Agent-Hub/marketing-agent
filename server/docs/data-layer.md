# Data Layer

## ORM

**Prisma 5.22.0** - Type-safe database client with migrations.

## Database

**PostgreSQL** - Primary data store

## Data Models

### Source
RSS feed configuration.

**Fields**:
- `id` - Primary key, auto-increment
- `name` - Display name
- `rssUrl` - Unique RSS feed URL
- `siteUrl` - Optional website URL
- `lang` - Enum: VI | EN | MIXED
- `topicTags` - Array of category tags
- `trustScore` - Integer 0-100, default 70
- `enabled` - Boolean, default false
- `fetchIntervalMinutes` - Integer, default 60
- `denyKeywords` - Array of keywords to filter
- `notes` - Optional notes
- `lastValidatedAt` - Timestamp of last validation
- `lastValidationStatus` - Enum: OK | FAILED
- `lastFetchedAt` - Timestamp of last fetch
- `lastFetchStatus` - String status message
- `itemsCount` - Count of items from this source
- `createdAt`, `updatedAt` - Timestamps

**Relations**:
- `items` - One-to-many with Item

**Indexes**:
- `rssUrl` (unique)
- `enabled`
- `trustScore`
- `name` (search)
- `lang` (filter)
- `createdAt` (sorting)
- `(enabled, trustScore)` (composite)

---

### Item
Individual news article from RSS feed.

**Fields**:
- `id` - Primary key, auto-increment
- `sourceId` - Foreign key to Source
- `guid` - RSS item GUID (optional)
- `title` - Article title
- `link` - Article URL
- `snippet` - RSS description/summary
- `contentHash` - Unique hash for deduplication
- `publishedAt` - Publication timestamp
- `status` - Enum: NEW | EXTRACTED | FILTERED_OUT | READY_FOR_AI | AI_STAGE_A_DONE | AI_STAGE_B_DONE | USED
- `filterReason` - Reason for filtering (if FILTERED_OUT)
- `createdAt`, `updatedAt` - Timestamps

**Relations**:
- `source` - Many-to-one with Source
- `article` - One-to-one with Article
- `aiResults` - One-to-many with AiResult

**Indexes**:
- `contentHash` (unique)
- `(sourceId, link)` (unique composite)
- `status` (pipeline queries)
- `sourceId` (filtering)
- `publishedAt` (sorting)

**Cascade Delete**: Deleting source deletes all items

---

### Article
Extracted full content from article URL.

**Fields**:
- `id` - Primary key, auto-increment
- `itemId` - Unique foreign key to Item
- `fullHtml` - Original HTML (optional)
- `extractedContent` - Readable text via Readability
- `truncatedContent` - Truncated for AI (~10K chars)
- `mainImageUrl` - Primary article image
- `imageList` - Array of discovered image URLs
- `createdAt`, `updatedAt` - Timestamps

**Relations**:
- `item` - One-to-one with Item

**Cascade Delete**: Deleting item deletes article

---

### AiResult
AI processing results (Stage A and B).

**Fields**:
- `id` - Primary key, auto-increment
- `itemId` - Foreign key to Item
- `stage` - String: "A" or "B"

**Stage A fields**:
- `isAllowed` - Boolean approval
- `topicTags` - Array of category tags
- `importanceScore` - Integer 0-100
- `oneLineSummary` - Brief summary

**Stage B fields**:
- `fullArticle` - Complete Facebook post

**Metadata**:
- `model` - OpenAI model used
- `promptTokens` - Token count for prompt
- `completionTokens` - Token count for completion
- `totalTokens` - Total tokens
- `rawResponse` - Full API response (optional)
- `createdAt` - Timestamp

**Relations**:
- `item` - Many-to-one with Item

**Indexes**:
- `itemId` (queries)
- `stage` (filtering)

**Cascade Delete**: Deleting item deletes AI results

---

### SystemLog
Structured application logs.

**Fields**:
- `id` - Primary key, auto-increment
- `level` - Enum: TRACE | DEBUG | INFO | WARN | ERROR | FATAL
- `message` - Log message
- `context` - Context string (e.g., "IngestJob")
- `service` - Service name
- `method` - HTTP method (if request)
- `path` - HTTP path (if request)
- `statusCode` - HTTP status code
- `duration` - Operation duration (ms)
- `traceId` - OpenTelemetry trace ID
- `spanId` - OpenTelemetry span ID
- `userId` - User ID (if authenticated)
- `error` - Error message
- `stack` - Stack trace
- `metadata` - JSON additional data
- `createdAt` - Timestamp

**Indexes**:
- `level` (filtering)
- `service` (filtering)
- `traceId` (trace lookup)
- `createdAt` (time-based queries)

---

### SystemMetric
Application metrics.

**Fields**:
- `id` - Primary key, auto-increment
- `name` - Metric name
- `type` - Enum: COUNTER | GAUGE | HISTOGRAM | SUMMARY
- `value` - Numeric value
- `unit` - Unit of measurement
- `labels` - JSON label dimensions
- `description` - Metric description
- `createdAt` - Timestamp

**Indexes**:
- `name` (filtering)
- `type` (filtering)
- `createdAt` (time-based queries)

---

### HealthCheck
Service health check results.

**Fields**:
- `id` - Primary key, auto-increment
- `service` - Service name (database, openai, filesystem)
- `status` - Enum: HEALTHY | DEGRADED | UNHEALTHY
- `responseTime` - Check duration (ms)
- `message` - Status message
- `details` - JSON additional details
- `checkedAt` - Timestamp (default now())

**Indexes**:
- `service` (filtering)
- `status` (filtering)
- `checkedAt` (time-based queries)

---

### PerformanceTrace
Distributed tracing data.

**Fields**:
- `id` - Primary key, auto-increment
- `traceId` - Unique trace ID
- `spanId` - Span ID
- `parentSpanId` - Parent span ID (for hierarchy)
- `name` - Span name
- `kind` - Span kind
- `startTime` - Start timestamp
- `endTime` - End timestamp
- `duration` - Duration (ms)
- `statusCode` - HTTP status code
- `method` - HTTP method
- `path` - HTTP path
- `attributes` - JSON span attributes
- `events` - JSON span events
- `createdAt` - Timestamp

**Indexes**:
- `traceId` (unique, trace lookup)
- `name` (filtering)
- `startTime` (time-based queries)

---

### Setting
Runtime configuration key-value store.

**Fields**:
- `id` - Primary key, auto-increment
- `key` - Unique setting key
- `value` - String value
- `description` - Setting description
- `updatedAt` - Last update timestamp
- `createdAt` - Creation timestamp

**Indexes**:
- `key` (unique)

---

## Query Patterns

### Service Layer Access

```typescript
import { prisma } from '../db/index.js';

// Single centralized Prisma client instance
export const prisma = new PrismaClient();
```

### Pagination

```typescript
const [items, total] = await Promise.all([
  prisma.item.findMany({
    where: { status: 'AI_STAGE_B_DONE' },
    orderBy: { publishedAt: 'desc' },
    take: limit,
    skip: offset,
    include: { source: true, article: true },
  }),
  prisma.item.count({
    where: { status: 'AI_STAGE_B_DONE' },
  }),
]);
```

### Relations

```typescript
// Include relations
const item = await prisma.item.findUnique({
  where: { id },
  include: {
    source: true,
    article: true,
    aiResults: {
      orderBy: { createdAt: 'desc' },
    },
  },
});
```

### Transactions

```typescript
await prisma.$transaction([
  prisma.item.update({
    where: { id },
    data: { status: 'EXTRACTED' },
  }),
  prisma.article.create({
    data: {
      itemId: id,
      extractedContent: content,
    },
  }),
]);
```

### Batch Operations

```typescript
// Batch create
await prisma.item.createMany({
  data: items,
  skipDuplicates: true,  // Ignore unique constraint violations
});

// Batch update
await prisma.item.updateMany({
  where: { status: 'NEW' },
  data: { status: 'EXTRACTED' },
});
```

### Search

```typescript
// Case-insensitive search
const sources = await prisma.source.findMany({
  where: {
    OR: [
      { name: { contains: search, mode: 'insensitive' } },
      { rssUrl: { contains: search, mode: 'insensitive' } },
    ],
  },
});
```

### Aggregations

```typescript
// Count by status
const counts = await prisma.item.groupBy({
  by: ['status'],
  _count: true,
});
```

---

## Migrations

### Migration Workflow

1. **Modify schema**: Edit `prisma/schema.prisma`
2. **Create migration**: `npm run prisma:migrate`
3. **Name migration**: e.g., "add_image_list_to_articles"
4. **Apply migration**: Automatically applied in dev
5. **Generate client**: `npm run prisma:generate`

### Production Deployment

```bash
# Apply migrations
npx prisma migrate deploy

# Generate client
npx prisma generate
```

### Migration History

```
prisma/migrations/
  migration_lock.toml
  20260226061848_rss_bot/migration.sql
  20260226223835_rss_bot/migration.sql
  20260228094716_add_monitoring_tables/migration.sql
  ...
```

---

## Data Integrity

### Unique Constraints

- Source.rssUrl
- Item.contentHash
- Item (sourceId, link) composite
- PerformanceTrace.traceId
- Setting.key

### Cascade Deletes

- Source delete → Cascade to Item → Cascade to Article, AiResult

### Default Values

- Source.lang = MIXED
- Source.trustScore = 70
- Source.enabled = false
- Source.fetchIntervalMinutes = 60
- Item.status = NEW
- Arrays default to []

### Timestamps

- All models have `createdAt` (auto-set on creation)
- Most models have `updatedAt` (auto-updated)

---

## Performance Optimizations

### Indexes

Strategic indexes on:
- Foreign keys (automatic)
- Status fields (pipeline queries)
- Timestamp fields (sorting, filtering)
- Composite indexes (common query patterns)

### Query Optimization

- Select only needed fields: `select: { id: true, name: true }`
- Limit relations: Only include when needed
- Pagination: Always use `take` and `skip`
- Connection pooling: Handled by Prisma

### Monitoring

- Slow query logging (threshold: 1000ms)
- Query performance tracked in SystemMetric table
- OpenTelemetry instrumentation for Prisma queries
