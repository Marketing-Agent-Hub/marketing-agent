# Architecture

## Architecture Style

**Modular Monolith** with Domain-Driven Design (DDD) organization.

All code runs in a single Node.js process. Logic is organized by business domain into `src/domains/`, each domain having its own routes, controller, and service. There are no microservices or network calls between internal components — only direct function imports.

**Why this is the right choice here:**
- The team is small; microservices would add operational overhead without benefit
- All domains share a single PostgreSQL database and Prisma client
- Background jobs and API handlers run in the same process, making coordination simple
- The codebase is still growing; a monolith is easier to refactor as boundaries clarify

---

## Component Diagram

```
                         ┌─────────────────────────────┐
                         │       Client / Frontend      │
                         └─────────────┬───────────────┘
                                       │ HTTP
                         ┌─────────────▼───────────────┐
                         │     Express HTTP Server      │
                         │   - CORS (configured origin) │
                         │   - JSON body parser         │
                         │   - Request monitoring mdw   │
                         │   - Error handler mdw        │
                         └──────┬──────────────┬────────┘
                                │              │
              ┌─────────────────▼──┐    ┌──────▼──────────────────┐
              │  Product Router    │    │  Internal Router         │
              │  /api/*            │    │  /api/internal/*         │
              │  (JWT user auth)   │    │  (JWT admin auth)        │
              └────────┬───────────┘    └──────┬───────────────────┘
                       │                       │
       ┌───────────────┼───────────────────────┼────────────────┐
       │               │       Domain Layer     │                │
       │               │                       │                │
       ▼               ▼                       ▼                ▼
  ┌─────────┐   ┌────────────┐   ┌──────────────────┐   ┌────────────┐
  │  Auth   │   │ Workspace/ │   │Content Intelligence│  │  Monitor   │
  │ Service │   │   Brand    │   │ Ingest/Extract     │  │  Service   │
  └────┬────┘   └─────┬──────┘   │ Filter/AI-A/AI-B  │  └─────┬──────┘
       │              │          └─────────┬──────────┘        │
       │              │                   │                     │
       └──────────────┴────────────────┬──┘─────────────────────┘
                                       │
                         ┌─────────────▼───────────────┐
                         │      src/lib/ Utilities      │
                         │  - AiClient (OpenRouter)     │
                         │  - SettingService (DB cfg)   │
                         │  - Logger (Pino)             │
                         │  - Telemetry (OTel)          │
                         │  - Plugin Registry (RSS/Web) │
                         └─────────────┬───────────────┘
                                       │
                         ┌─────────────▼───────────────┐
                         │         Prisma ORM           │
                         └─────────────┬───────────────┘
                                       │
                         ┌─────────────▼───────────────┐
                         │        PostgreSQL DB         │
                         └─────────────────────────────┘
              
                         ┌─────────────────────────────┐
                         │     Background Jobs          │
                         │   (node-cron + function)     │
                         │  Call same domain services   │
                         └─────────────────────────────┘
              
              ┌────────────────────────────────────────┐
              │       External Services                │
              │  - OpenRouter API (AI inference)       │
              │  - Tavily API (web search)             │
              │  - Social Platforms (stub only)        │
              │  - Prometheus (metrics scrape)         │
              └────────────────────────────────────────┘
```

---

## Tech Stack

| Technology | Role | Why Chosen |
|---|---|---|
| **Node.js + TypeScript** | Runtime & language | Strong async model for I/O-heavy workloads (feed fetching, AI calls). TypeScript adds type safety for a complex domain. |
| **Express** | HTTP framework | Minimal, well-understood, easy to compose middleware. Not Fastify because the team was already familiar. |
| **Prisma ORM** | Database access | Type-safe queries, migration tooling, excellent developer experience with PostgreSQL. |
| **PostgreSQL** | Primary database | Relational integrity needed for the multi-tenant hierarchy (Workspace → Brand → Strategy → Slot → Brief → Draft). |
| **OpenRouter** | AI inference gateway | Single API key to access multiple models (gpt-4o, gpt-4o-mini), easy model switching via DB settings. |
| **node-cron** | Job scheduling | Lightweight, in-process cron. No need for a queue system at current scale. |
| **Zod** | Validation | Used for both env schema validation (`config/env.ts`) and AI output validation to ensure structured JSON from LLMs. |
| **Pino** | Logging | Structured JSON logging with minimal performance overhead. `pino-http` integrates with Express. |
| **OpenTelemetry** | Observability | Vendor-neutral tracing and metrics. Prometheus exporter for metrics; traces stored in DB via `PerformanceTrace` model. |
| **JSDOM + Readability** | Web scraping | Mozilla Readability (as used in Firefox Reader Mode) for reliable article extraction from complex HTML. |
| **Tavily API** | Source discovery | AI-powered search API that returns structured web results, ideal for finding RSS feed URLs programmatically. |

---

## Dependency Relationships

```
src/index.ts
└─► src/routes/                   (HTTP entry points)
    ├─► src/domains/*/             (business logic)
    │   ├─► src/lib/               (shared utilities)
    │   │   ├─► AiClient           (OpenRouter)
    │   │   ├─► SettingService     (DB-driven config)
    │   │   ├─► Logger             (Pino)
    │   │   └─► PluginRegistry     (RSS/Web parsers)
    │   └─► src/db/index.ts        (Prisma client singleton)
    └─► src/middleware/            (auth, monitoring, error)

src/jobs/bootstrap.ts
└─► src/jobs/*.job.ts              (scheduler wrappers)
    └─► src/domains/               (same domain services)

src/shared/marketing/
└─► Schemas, AIWorkflow helper, Connector interface
    (used by: content, strategy, publishing domains)
```

**Key Rule:** Domains do NOT import from each other's `*.routes.ts` or `*.controller.ts`. Controllers only import their own service. Services may import from `src/lib/` and `src/db/`. Cross-domain imports happen at the service level only (e.g., `content.service` imports from `trend-signal.service`).

---

## Layered Architecture (within each domain)

```
routes.ts        ← Defines HTTP paths and applies middleware
    │
    ▼
controller.ts    ← Handles req/res, calls service, formats responses
    │
    ▼
service.ts       ← All business logic; no HTTP concerns
    │
    ▼
db/prisma        ← Data access only
```

This strict layering keeps business logic testable and HTTP concerns isolated.
