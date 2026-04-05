# Folder Structure

```
server/
├── prisma/                    # Database schema and migrations
│   ├── schema.prisma          # Prisma schema definition
│   └── migrations/            # SQL migration files
│
├── src/                       # TypeScript source code
│   ├── index.ts               # Application entry point
│   │
│   ├── config/                # Configuration modules
│   │   ├── env.ts             # Environment variable validation (Zod)
│   │   ├── ai.config.ts       # OpenAI client and AI settings
│   │   └── monitor.config.ts  # Monitoring and telemetry config
│   │
│   ├── db/                    # Database client
│   │   └── index.ts           # Prisma client export
│   │
│   ├── types/                 # TypeScript type definitions
│   │   ├── index.ts           # API types (errors, JWT, etc.)
│   │   └── monitoring.ts      # Monitoring types
│   │
│   ├── schemas/               # Zod validation schemas
│   │   ├── auth.schema.ts
│   │   ├── source.schema.ts
│   │   ├── item.schema.ts
│   │   └── monitor.schema.ts
│   │
│   ├── middleware/            # Express middleware
│   │   ├── auth.ts            # JWT authentication (requireAuth)
│   │   ├── error-handler.ts   # Global error handler
│   │   └── monitoring.ts      # Request/error monitoring
│   │
│   ├── routes/                # Express route definitions
│   │   ├── index.ts           # Route aggregator + health check
│   │   ├── auth.routes.ts     # /api/auth/*
│   │   ├── source.routes.ts   # /api/sources/*
│   │   ├── item.routes.ts     # /api/items/*
│   │   ├── admin.routes.ts    # /api/admin/*
│   │   ├── monitor.routes.ts  # /api/monitor/*
│   │   └── settings.routes.ts # /api/settings/*
│   │
│   ├── controllers/           # HTTP request handlers
│   │   ├── auth.controller.ts
│   │   ├── source.controller.ts
│   │   ├── item.controller.ts
│   │   ├── monitor.controller.ts
│   │   └── settings.controller.ts
│   │
│   ├── services/              # Business logic layer
│   │   ├── ingest.service.ts       # RSS feed fetching/parsing
│   │   ├── extraction.service.ts   # Full article extraction
│   │   ├── filtering.service.ts    # Keyword filtering
│   │   ├── ai-stage-a.service.ts   # AI categorization
│   │   ├── ai-stage-b.service.ts   # AI post generation
│   │   ├── source.service.ts       # Source CRUD operations
│   │   ├── auth.service.ts         # Authentication logic
│   │   ├── health.service.ts       # Health check service
│   │   ├── log.service.ts          # Log persistence
│   │   ├── metric.service.ts       # Metric persistence
│   │   └── trace.service.ts        # Trace persistence
│   │
│   ├── jobs/                  # Background job schedulers
│   │   ├── ingest.job.ts            # Cron: */15 * * * *
│   │   ├── extraction.job.ts        # Cron: */5 * * * *
│   │   ├── filtering.job.ts         # Cron: */10 * * * *
│   │   ├── ai-stage-a.job.ts        # Cron: */10 * * * *
│   │   ├── ai-stage-b.job.ts        # Cron: */15 * * * *
│   │   └── monitoring-cleanup.job.ts # Cron: 0 2 * * *
│   │
│   ├── lib/                   # Utility libraries
│   │   ├── async-handler.ts   # Express async route wrapper
│   │   ├── logger.ts          # Pino logger configuration
│   │   ├── telemetry.ts       # OpenTelemetry SDK setup
│   │   ├── job-monitoring.ts  # Job execution wrapper
│   │   ├── normalizer.ts      # String normalization utilities
│   │   ├── rss-validator.ts   # RSS feed validation
│   │   └── plugins/           # Ingestion plugin system
│   │       ├── base.plugin.ts        # BasePlugin interface + NormalizedItem + generateContentHash
│   │       ├── plugin-registry.ts    # Plugin factory/registry
│   │       ├── rss.plugin.ts         # RSS 2.0 / Atom plugin
│   │       └── web-scraper.plugin.ts # HTML scraper plugin (cheerio)
│   │
│   └── __tests__/             # Test files
│       ├── normalizer.test.ts
│       ├── ingest.service.test.ts
│       └── plugins/
│           ├── base.plugin.test.ts
│           ├── rss.plugin.test.ts
│           ├── web-scraper.plugin.test.ts
│           └── plugin-registry.test.ts
│
├── scripts/                   # Utility scripts
│   └── generate-password-hash.ts
│
├── logs/                      # Application logs (gitignored)
│
├── dist/                      # Compiled JavaScript (gitignored)
│
├── docs/                      # Documentation
│
├── package.json               # Dependencies and scripts
├── package-lock.json          # Locked dependency versions
├── tsconfig.json              # TypeScript configuration
├── vitest.config.ts           # Test configuration
├── Dockerfile                 # Docker build instructions
└── test-pipeline.ts           # Pipeline test script
```

## Folder Responsibilities

### `/prisma`
Database schema and migration history. Single source of truth for data models.

### `/src/config`
Configuration loading and validation. Environment variables, external service config.

### `/src/types`
Shared TypeScript interfaces and types. No runtime code.

### `/src/schemas`
Zod validation schemas for runtime validation. Used by controllers.

### `/src/middleware`
Express middleware functions. Cross-cutting concerns (auth, logging, errors).

### `/src/routes`
Route definitions only. Delegates to controllers via asyncHandler.

### `/src/controllers`
HTTP request/response handling. Validates input, calls services, formats output.

### `/src/services`
Core business logic. Database operations, external API calls, data transformations.

### `/src/jobs`
Cron job schedulers. Thin wrappers that call service functions.

### `/src/lib`
Reusable utilities and plugin implementations. Pure functions and standalone helpers. The `plugins/` subdirectory contains the plugin system: interface definitions, registry, and concrete plugin implementations.

### `/scripts`
One-off utility scripts (e.g., password hash generation).

### `/logs`
Runtime log files. Rotated by Pino.

## Import Conventions

All imports use `.js` extensions (ESM requirement):
```typescript
import { prisma } from '../db/index.js';
import { logger } from '../lib/logger.js';
```

Path resolution is relative, not aliased.

## File Naming

- **Kebab-case**: `ai-stage-a.service.ts`, `error-handler.ts`
- **Suffix patterns**:
  - `.service.ts` - Business logic services
  - `.controller.ts` - HTTP controllers
  - `.routes.ts` - Express routers
  - `.schema.ts` - Zod schemas
  - `.job.ts` - Cron jobs
  - `.config.ts` - Configuration modules
  - `.test.ts` - Test files
