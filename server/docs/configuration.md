# Configuration

## Environment Variables

### Required Variables

Defined in `src/config/env.ts` and validated with Zod on startup.

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/newsbot

# Authentication
JWT_SECRET=your-jwt-secret-min-16-chars
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD_HASH=<bcrypt-hash>

# CORS
CORS_ORIGIN=http://localhost:3000

# Server
PORT=3001
NODE_ENV=development|production|test

# HTTP Client
USER_AGENT=NewsAggregatorBot/1.0
```

### Optional Variables

```bash
# OpenAI (required for AI features)
OPENAI_API_KEY=sk-...

# AI Models (optional, defaults provided)
AI_STAGE_A_MODEL=gpt-4o-mini
AI_STAGE_B_MODEL=gpt-4o
```

### Validation

- Zod schemas validate types and constraints
- App exits with error messages if validation fails
- Example:
  ```
  ❌ Invalid environment variables:
    - JWT_SECRET: String must contain at least 16 character(s)
    - DATABASE_URL: Required
  ```

### Generate Password Hash

```bash
npm run build
node dist/scripts/generate-password-hash.js
```

Enter password when prompted, copy bcrypt hash to `ADMIN_PASSWORD_HASH`.

---

## Static Configuration

### Monitor Config (`src/config/monitor.config.ts`)

```typescript
export const monitorConfig = {
  logging: {
    level: 'info' | 'debug',              // Based on NODE_ENV
    logToFile: true,
    logDir: './logs',
    maxFileSize: 10 * 1024 * 1024,        // 10MB
    maxFiles: 30,                          // 30 days
    prettyPrint: env.NODE_ENV !== 'production',
  },

  telemetry: {
    serviceName: 'news-aggregator-server',
    serviceVersion: '1.0.0',
    environment: env.NODE_ENV,
    enabled: true,

    tracing: {
      enabled: true,
      sampleRate: 1.0,                    // 100% sampling
    },

    metrics: {
      enabled: true,
      port: 9464,                         // Prometheus endpoint
      endpoint: '/metrics',
    },
  },

  database: {
    logQueries: env.NODE_ENV !== 'production',
    slowQueryThreshold: 1000,             // ms
    retentionDays: 30,
  },

  healthCheck: {
    interval: 60000,                      // 1 minute
    services: ['database', 'openai', 'filesystem'],
  },

  performance: {
    trackRequests: true,
    trackJobs: true,
    slowRequestThreshold: 5000,           // ms
    slowJobThreshold: 30000,              // ms
  },
};
```

---

## Database Configuration (Prisma)

### Connection

Set via `DATABASE_URL` environment variable.

**Format**:
```
postgresql://user:password@host:port/database?schema=public
```

### Schema Location
```
prisma/schema.prisma
```

### Migration Commands

```bash
# Generate Prisma Client
npm run prisma:generate

# Create migration (development)
npm run prisma:migrate

# Apply migrations (production)
npx prisma migrate deploy

# Open Prisma Studio (database GUI)
npm run prisma:studio
```

### Connection Pooling

Prisma handles connection pooling automatically. Configure in `DATABASE_URL`:
```
postgresql://user:password@host:port/database?connection_limit=10
```

---

## Runtime Configuration (Database)

### Settings Table

Dynamic configuration stored in database, loaded at runtime.

**Schema**:
```prisma
model Setting {
  id          Int      @id @default(autoincrement())
  key         String   @unique
  value       String
  description String?
  updatedAt   DateTime @updatedAt
  createdAt   DateTime @default(now())
}
```

### AI Configuration

Loaded via `loadAISettings()` in `src/config/ai.config.ts`.

**Keys**:
- `ai_stage_a_enabled` - Enable/disable AI categorization
- `ai_stage_b_enabled` - Enable/disable AI post generation
- `ai_stage_a_model` - OpenAI model for Stage A (default: gpt-4o-mini)
- `ai_stage_b_model` - OpenAI model for Stage B (default: gpt-4o)
- `ai_stage_a_max_tokens` - Max tokens for Stage A
- `ai_stage_b_max_tokens` - Max tokens for Stage B

**Management**:
- Update via `PUT /api/settings/:key`
- Changes take effect on next job execution
- No restart required

---

## AI Configuration

### OpenAI Client

Initialized in `src/config/ai.config.ts`:

```typescript
import OpenAI from 'openai';

export const openai = new OpenAI({
  apiKey: AI_CONFIG.OPENAI_API_KEY,
});
```

### Feature Toggles

```typescript
export const AI_CONFIG = {
  OPENAI_API_KEY: string,
  STAGE_A_MODEL: string,          // Default: gpt-4o-mini
  STAGE_B_MODEL: string,          // Default: gpt-4o
  
  get STAGE_A_ENABLED() {
    return stageAEnabled;         // Loaded from database
  },
  
  get STAGE_B_ENABLED() {
    return stageBEnabled;         // Loaded from database
  },
};
```

### Default Behavior

- **AI disabled**: Jobs use heuristic filtering fallback
- **OpenAI unavailable**: Health checks detect, jobs continue with heuristics
- **Token limits**: Configurable per stage via database settings

---

## Job Schedules

Configured in job files using cron syntax:

```typescript
// Ingest: Every 15 minutes
cron.schedule('*/15 * * * *', handler);

// Extraction: Every 5 minutes
cron.schedule('*/5 * * * *', handler);

// Filtering: Every 10 minutes
cron.schedule('*/10 * * * *', handler);

// AI Stage A: Every 10 minutes
cron.schedule('*/10 * * * *', handler);

// AI Stage B: Every 15 minutes
cron.schedule('*/15 * * * *', handler);

// Cleanup: Daily at 2 AM
cron.schedule('0 2 * * *', handler);
```

**Cron Format**: `minute hour day month weekday`

---

## Content Processing Configuration

### Extraction Service

```typescript
// Max content length for AI processing
const MAX_CONTENT_LENGTH_CHARS = 10000;  // ~2500 tokens

// URL resolution timeout
const TIMEOUT_MS = 10000;  // 10 seconds

// Redirect domains (auto-detected)
const REDIRECT_DOMAINS = [
  'news.google.com',
  'feedproxy.google.com',
  'bit.ly',
  // ... more
];
```

### Filtering Service

```typescript
// Global deny keywords
const DENY_KEYWORDS_EN = ['price', 'trading', 'pump', 'dump', ...];
const DENY_KEYWORDS_VI = ['giá', 'giao dịch', 'bơm', 'xả', ...];
```

Per-source keywords configured via `denyKeywords` field in Source model.

---

## CORS Configuration

Set via `CORS_ORIGIN` environment variable:

```typescript
app.use(cors({
  origin: env.CORS_ORIGIN,  // e.g., http://localhost:3000
  credentials: true,
}));
```

---

## Logging Configuration

### File Rotation

- Location: `./logs/`
- Files: `all.log`, `error.log`
- Max size: 10MB per file
- Retention: 30 files (30 days)

### Log Levels

Development: `debug`
Production: `info`

### Format

Development: Pretty-printed with colors
Production: JSON lines

### Context Injection

- `service` - Service name
- `environment` - NODE_ENV
- `pid` - Process ID
- `host` - Hostname
- `traceId` - OpenTelemetry trace ID (when available)

---

## Telemetry Configuration

### OpenTelemetry

- **SDK**: Initialized in `src/lib/telemetry.ts`
- **Instrumentation**: Auto-instrumentation for Express, HTTP, Prisma
- **Sampling**: 100% in development (adjust for production)

### Prometheus

- **Port**: 9464
- **Endpoint**: `http://localhost:9464/metrics`
- **Exporter**: OpenTelemetry Prometheus Exporter

### Custom Metrics

Defined in services:
- `job_started_total` - Job execution counter
- `job_completed_total` - Job completion counter (with status label)
- `job_duration_ms` - Job duration histogram

---

## Docker Configuration

### Multi-Stage Build

```dockerfile
# Build stage
FROM node:24-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y openssl ca-certificates
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

# Production stage
FROM node:24-slim
WORKDIR /app
# ... copy from builder
```

### Environment Variables in Docker

Pass via `-e` flag or `.env` file:
```bash
docker run -e DATABASE_URL=... -e JWT_SECRET=... image-name
```

Or mount `.env` file:
```bash
docker run -v ./.env:/app/.env image-name
```

---

## Security Configuration

### JWT

- **Secret**: Minimum 16 characters (validated by Zod)
- **Algorithm**: HS256 (default for jsonwebtoken)
- **Expiration**: Set in auth service (default: 7 days)

### Password Hashing

- **Algorithm**: bcrypt
- **Rounds**: 10 (bcrypt default)
- **Storage**: Only hash stored, plaintext never persisted

### CORS

- **Origin**: Explicitly configured, no wildcards
- **Credentials**: Enabled for cookie support

---

## Performance Tuning

### Database

- Indexes defined in Prisma schema for common queries
- Connection pooling via Prisma (default: 10 connections)
- Slow query threshold: 1000ms

### Job Batching

Configurable in job files:
```typescript
const BATCH_SIZE = 10;  // Process 10 items per job run
```

### API Rate Limiting

Not implemented (add express-rate-limit if needed).

### Content Truncation

- Article content: 10,000 characters
- Prevents excessive token usage in AI processing
