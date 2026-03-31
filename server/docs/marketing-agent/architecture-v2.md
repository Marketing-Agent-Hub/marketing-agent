# Architecture V2

## Target Architecture

The V2 platform remains a layered Express + Prisma backend, but the domain shifts from `news processing` to `marketing workflow orchestration`.

## Architectural Style

- layered service-oriented application
- job-driven asynchronous processing
- AI workflow orchestration through explicit stages
- multi-tenant SaaS domain model

## Core Subsystems

### Identity and tenancy
- authentication
- workspace membership
- role-based authorization

### Brand intelligence
- onboarding sessions
- brand profile memory
- persona and messaging storage

### Strategy engine
- strategy generation
- content pillar generation
- calendar planning

### Content operations
- brief generation
- post generation
- approval workflow
- versioning and regeneration

### Social distribution
- channel connections
- schedule creation
- publish execution
- result tracking

### Analytics and optimization
- performance ingestion
- recommendation generation
- content and strategy feedback loop

## Proposed Service Layout

```text
src/
  services/
    auth.service.ts
    workspace.service.ts
    brand.service.ts
    onboarding.service.ts
    strategy.service.ts
    content-brief.service.ts
    content-draft.service.ts
    approval.service.ts
    social-account.service.ts
    publishing.service.ts
    analytics.service.ts
    recommendation.service.ts
    setting.service.ts
```

## Proposed Job Layout

```text
src/jobs/
  onboarding-analysis.job.ts
  strategy-generation.job.ts
  daily-content-generation.job.ts
  publish-scheduler.job.ts
  publish-dispatch.job.ts
  analytics-sync.job.ts
  optimization.job.ts
  monitoring-cleanup.job.ts
```

## Domain Workflow

### 1. Onboarding workflow
- user creates workspace and brand
- AI interview collects inputs
- uploaded references and website content are analyzed
- system generates structured brand memory

### 2. Strategy workflow
- strategy job uses brand memory and goals
- system creates campaign window, cadence, pillars, and channel recommendations
- strategy becomes the source of truth for future content generation

### 3. Content workflow
- daily job selects strategy slots for upcoming days
- AI creates brief first, then draft variants per channel
- outputs enter review queue

### 4. Publishing workflow
- approved content becomes schedulable
- scheduler allocates posts to exact channel slots
- dispatcher publishes and records success or failure

### 5. Optimization workflow
- analytics snapshots are ingested
- recommendation engine proposes strategy or content adjustments

## Current-to-V2 Mapping

### Direct reuse candidates
- Express bootstrap and middleware stack
- Prisma database access
- settings loader pattern
- OpenAI service integration
- cron jobs and monitoring wrapper
- logs, metrics, traces, health checks

### Refactor candidates
- `Source` becomes part of external input/reference ingestion, not the primary domain
- `Item` and `Article` patterns become useful templates for `ContentDraft` and `BrandKnowledgeDocument`
- `AiResult` pattern evolves into more explicit workflow artifacts and generation metadata

## API Layer Evolution

### Current
- admin-first operational routes
- single admin JWT auth

### V2
- tenant-aware auth
- brand and content management routes
- onboarding and strategy routes
- publishing and analytics routes
- internal admin routes retained separately

## State Machines

### Content lifecycle
```text
DRAFT -> IN_REVIEW -> APPROVED -> SCHEDULED -> PUBLISHING -> PUBLISHED
   |         |            |            |            |
   v         v            v            v            v
REJECTED  REGENERATED   ARCHIVED     FAILED      FAILED
```

### Strategy lifecycle
```text
DRAFT -> ACTIVE -> SUPERSEDED -> ARCHIVED
```

### Social connection lifecycle
```text
PENDING -> CONNECTED -> EXPIRED -> REVOKED
```

## AI Execution Pattern

Replace the old `Stage A / Stage B` naming with explicit workflows:
- business-analysis
- strategy-generation
- brief-generation
- post-generation
- quality-review
- optimization-recommendation

Each workflow should:
- use a dedicated prompt contract
- validate structured output
- store model and token metadata
- emit metrics and logs

## Scaling Notes

### MVP
- cron jobs are acceptable
- DB-backed polling is acceptable

### Next stage
- move long-running AI and publishing work to queue workers
- isolate connector execution from API process
- add per-tenant rate limiting and quotas

## Recommended Boundaries

### Keep synchronous
- auth
- CRUD operations
- approval actions
- schedule editing

### Make asynchronous
- onboarding analysis
- strategy generation
- content batch generation
- publish dispatch
- analytics sync

## Security Notes

- replace single admin login with user accounts and workspace memberships
- encrypt social tokens and secrets
- add audit logs for approvals, publishing, and settings changes
