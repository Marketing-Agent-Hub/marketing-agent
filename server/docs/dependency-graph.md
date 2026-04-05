# Dependency Graph

## Module Dependencies

### Layer 1: Infrastructure (No Dependencies)

```
src/config/env.ts
src/types/index.ts
src/types/monitoring.ts
```

### Layer 2: External Client Configuration

```
src/config/monitor.config.ts → env.ts

src/db/index.ts → (Prisma Client)

src/lib/logger.ts → monitor.config.ts

src/lib/normalizer.ts → (none)

src/lib/rss-validator.ts → env.ts
```

### Layer 2b: Plugin System

```
src/lib/plugins/base.plugin.ts → (crypto, @prisma/client types)

src/lib/plugins/rss.plugin.ts → plugins/base.plugin.ts, config/env.ts

src/lib/plugins/web-scraper.plugin.ts → plugins/base.plugin.ts, config/env.ts, (cheerio, zod)

src/lib/plugins/plugin-registry.ts → plugins/base.plugin.ts, plugins/rss.plugin.ts, plugins/web-scraper.plugin.ts
```

### Layer 3: Utilities & Middleware

```
src/lib/telemetry.ts → monitor.config.ts, logger.ts

src/lib/async-handler.ts → types/index.ts

src/lib/job-monitoring.ts → logger.ts, telemetry.ts

src/config/ai.config.ts → db/index.ts, env.ts

src/middleware/auth.ts → env.ts, types/index.ts

src/middleware/error-handler.ts → types/index.ts

src/middleware/monitoring.ts → logger.ts, telemetry.ts
```

### Layer 4: Schemas

```
src/schemas/auth.schema.ts → (Zod)

src/schemas/source.schema.ts → (Zod)

src/schemas/item.schema.ts → (Zod)

src/schemas/monitor.schema.ts → (Zod)
```

### Layer 5: Services (Business Logic)

```
src/services/auth.service.ts
  → db/index.ts
  → env.ts (JWT_SECRET, ADMIN credentials)

src/services/source.service.ts
  → db/index.ts
  → schemas/source.schema.ts
  → lib/normalizer.ts
  → lib/rss-validator.ts
  → lib/plugins/plugin-registry.ts

src/services/ingest.service.ts
  → db/index.ts
  → lib/plugins/plugin-registry.ts
  → lib/plugins/base.plugin.ts (NormalizedItem type)
  → lib/job-monitoring.ts
  → services/metric.service.ts
  → lib/logger.ts

src/services/extraction.service.ts
  → db/index.ts
  → env.ts (USER_AGENT)
  → (Mozilla Readability, JSDOM)

src/services/filtering.service.ts
  → db/index.ts

src/services/ai-stage-a.service.ts
  → db/index.ts
  → config/ai.config.ts

src/services/ai-stage-b.service.ts
  → db/index.ts
  → config/ai.config.ts

src/services/health.service.ts
  → db/index.ts
  → config/monitor.config.ts
  → env.ts
  → logger.ts

src/services/log.service.ts
  → db/index.ts

src/services/metric.service.ts
  → db/index.ts

src/services/trace.service.ts
  → db/index.ts
```

### Layer 6: Controllers

```
src/controllers/auth.controller.ts
  → services/auth.service.ts
  → schemas/auth.schema.ts
  → types/index.ts

src/controllers/source.controller.ts
  → services/source.service.ts
  → schemas/source.schema.ts
  → types/index.ts

src/controllers/item.controller.ts
  → db/index.ts (direct access for queries)
  → schemas/item.schema.ts
  → types/index.ts

src/controllers/monitor.controller.ts
  → services/log.service.ts
  → services/metric.service.ts
  → db/index.ts
  → schemas/monitor.schema.ts

src/controllers/settings.controller.ts
  → db/index.ts
  → config/ai.config.ts
```

### Layer 7: Jobs

```
src/jobs/ingest.job.ts
  → services/ingest.service.ts
  → lib/job-monitoring.ts
  → logger.ts

src/jobs/extraction.job.ts
  → services/extraction.service.ts
  → lib/job-monitoring.ts
  → logger.ts

src/jobs/filtering.job.ts
  → services/filtering.service.ts
  → lib/job-monitoring.ts
  → logger.ts

src/jobs/ai-stage-a.job.ts
  → services/ai-stage-a.service.ts
  → lib/job-monitoring.ts
  → logger.ts

src/jobs/ai-stage-b.job.ts
  → services/ai-stage-b.service.ts
  → lib/job-monitoring.ts
  → logger.ts

src/jobs/monitoring-cleanup.job.ts
  → db/index.ts
  → config/monitor.config.ts
  → logger.ts
```

### Layer 8: Routes

```
src/routes/auth.routes.ts
  → controllers/auth.controller.ts
  → lib/async-handler.ts

src/routes/source.routes.ts
  → controllers/source.controller.ts
  → middleware/auth.ts
  → lib/async-handler.ts

src/routes/item.routes.ts
  → controllers/item.controller.ts
  → middleware/auth.ts
  → lib/async-handler.ts

src/routes/admin.routes.ts
  → jobs/*.job.ts (triggerImmediate functions)
  → middleware/auth.ts
  → lib/async-handler.ts

src/routes/monitor.routes.ts
  → controllers/monitor.controller.ts
  → middleware/auth.ts
  → lib/async-handler.ts

src/routes/settings.routes.ts
  → controllers/settings.controller.ts
  → middleware/auth.ts
  → lib/async-handler.ts

src/routes/index.ts
  → All route modules above
```

### Layer 9: Entry Point

```
src/index.ts
  → config/env.ts
  → config/ai.config.ts
  → middleware/error-handler.ts
  → middleware/monitoring.ts
  → routes/index.ts
  → jobs/*.job.ts
  → lib/telemetry.ts
  → lib/logger.ts
  → services/health.service.ts
```

## Service Interdependencies

```
ingest.service → (no service deps)

extraction.service → (no service deps)

filtering.service → (no service deps)

ai-stage-a.service → (no service deps)

ai-stage-b.service → (no service deps)

source.service → (no service deps)

auth.service → (no service deps)

health.service → (no service deps)

log.service → (no service deps)

metric.service → (no service deps)

trace.service → (no service deps)
```

**Note**: Services do not call each other. Jobs orchestrate service execution.

## External Dependencies

### Database
```
All services → Prisma Client → PostgreSQL
```

### External APIs
```
ingest.service → RSS Feed URLs (HTTP)

extraction.service → Article URLs (HTTP)

ai-stage-a.service → OpenAI API

ai-stage-b.service → OpenAI API

health.service → OpenAI API (health check)
```

### Static Libraries
```
extraction.service → @mozilla/readability, jsdom

ingest.service → fast-xml-parser

auth.service → bcrypt, jsonwebtoken

telemetry.ts → @opentelemetry/* packages

logger.ts → pino, pino-http, pino-pretty
```

## Circular Dependency Checks

**Status**: ✅ No circular dependencies detected

**Rules Enforced**:
- Controllers never import from controllers
- Services never import from controllers or routes
- Jobs never import from routes
- Lib utilities never import from upper layers
- Config modules never import from business logic

## Import Pattern

All imports use explicit `.js` extensions (ES modules):
```typescript
import { prisma } from '../db/index.js';
import { logger } from '../lib/logger.js';
import { asyncHandler } from '../lib/async-handler.js';
```

## Critical Paths

### HTTP Request Path
```
Express → Middleware → Routes → Controllers → Services → Prisma → PostgreSQL
```

### Background Job Path
```
Cron Scheduler → Job → Job Monitoring → Service → Prisma → PostgreSQL
```

### External API Path (AI)
```
Job → Service → OpenAI Client → OpenAI API
```

### Observability Path
```
Any Module → Logger/Telemetry → Pino/OpenTelemetry → Files/Prometheus
Any Module → Log/Metric/Trace Service → Prisma → PostgreSQL
```
