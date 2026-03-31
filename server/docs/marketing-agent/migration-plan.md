# Migration Plan

## Objective

Upgrade the current backend incrementally from a news aggregation engine into an AI marketing agent backend without destabilizing the running platform structure.

## Migration Strategy

Use a `parallel domain migration` approach:
- keep legacy models and routes operational
- introduce new V2 models and services side by side
- move new product development to `/api/v2`
- retire legacy modules only after V2 reaches feature completeness

## What Can Be Reused

### Infrastructure
- Express server bootstrap
- middleware composition
- Prisma client and migration workflow
- OpenTelemetry and Pino integration
- health checks and monitoring cleanup

### Engineering patterns
- controller/service/job separation
- Zod request validation
- runtime settings table
- monitored job wrappers

## What Must Change

### Authentication
- from single admin credentials
- to user accounts, workspace membership, and role-based access

### Domain model
- from `Source`, `Item`, `Article`, `AiResult`
- to `Workspace`, `Brand`, `BrandProfile`, `StrategyPlan`, `ContentBrief`, `ContentDraft`, `PublishJob`

### AI orchestration
- from generic stage naming
- to explicit workflow naming and structured contracts

### API surface
- from admin and ingestion-first APIs
- to tenant-aware product APIs

## Recommended Implementation Sequence

### Step 1
- add V2 docs and target architecture agreement

### Step 2
- add new Prisma enums and models
- do not delete legacy tables

### Step 3
- implement new auth and workspace middleware

### Step 4
- add V2 routes and empty controllers/services

### Step 5
- implement onboarding persistence and brand profile generation

### Step 6
- implement strategy generation and daily content generation

### Step 7
- implement approval, scheduling, and publish job execution

### Step 8
- implement analytics sync and recommendations

### Step 9
- deprecate legacy modules after traffic and data migration decisions

## Transitional Settings Strategy

Keep `Setting` table and namespace new keys:
- `marketing.models.businessAnalysis`
- `marketing.models.strategyGeneration`
- `marketing.models.postGeneration`
- `marketing.defaults.reviewRequired`
- `marketing.defaults.postingCadence`
- `social.publish.retryLimit`

## Transitional Folder Strategy

Recommended incremental structure:

```text
src/
  v2/
    controllers/
    routes/
    schemas/
    services/
    jobs/
```

This keeps V2 isolated while the team migrates gradually.

An alternative is to keep shared folders and use new file names, but the isolated `v2` namespace will reduce confusion during migration.

## Data Migration Notes

No direct business data migration is required from legacy `Source` and `Item` records into the V2 customer-facing product model.

Instead:
- legacy data remains for historical or internal use
- V2 starts with fresh tenant-scoped product data

This is safer than attempting to reinterpret news records as customer marketing assets.

## Testing Strategy

### Required test layers
- schema validation tests
- service unit tests
- workflow integration tests
- publish job simulation tests
- auth and authorization tests

### Critical regression checks
- monitoring and logging still work under V2 jobs
- runtime settings still reload correctly
- API error formatting stays consistent

## Definition of Done for Migration

- V2 Prisma schema exists and migrates successfully
- `/api/v2` auth, brand, strategy, content, and publishing endpoints exist
- at least one end-to-end workflow works:
  - onboard brand
  - generate strategy
  - generate draft
  - approve
  - schedule
- legacy routes remain isolated and non-blocking
