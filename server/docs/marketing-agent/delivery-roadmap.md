# Delivery Roadmap

## Delivery Strategy

Ship this upgrade in phases so the backend can evolve without forcing an immediate full rewrite.

## Phase 0: Foundations

### Goals
- establish canonical domain model
- preserve current server operability
- prepare migration-safe scaffolding

### Deliverables
- `/api` product route surface
- user and workspace auth model
- new Prisma models for workspace, brand, profile, strategy, draft
- namespaced settings keys
- internal generation run tracking

## Phase 1: MVP

### Goals
- deliver the first usable marketing workflow

### Deliverables
- AI onboarding session
- brand profile generation
- 30-day strategy generation
- daily brief and draft generation
- review queue
- approval actions
- scheduling and publish job model
- one or two social platforms with connector abstraction

### Exit criteria
- one workspace can onboard one brand
- system generates at least one week of content
- user can approve and schedule posts

## Phase 2: Operational Quality

### Goals
- make the system reliable enough for daily usage

### Deliverables
- richer analytics snapshots
- optimization recommendations
- better failure recovery and retries
- content versioning improvements
- audit trail and team collaboration

## Phase 3: Scale and Expansion

### Goals
- prepare for broader market use

### Deliverables
- multi-brand workspace UX
- agency workflows
- more social connectors
- queue workers for async workloads
- quotas and billing hooks

## Technical Milestones

1. Introduce new Prisma models without breaking existing operational data
2. Add tenant-aware auth and middleware
3. Add onboarding and strategy services
4. Add content review and publishing lifecycle
5. Add analytics sync and recommendation jobs
6. Deprecate legacy news-first routes and services

## Suggested Build Order

1. schema and auth
2. workspace and brand CRUD
3. onboarding persistence
4. brand analysis workflow
5. strategy generation
6. brief and draft generation
7. approval and scheduling
8. publishing connectors
9. analytics and recommendations

## Risks

- overbuilding strategy logic before real user feedback
- social API integration complexity
- generic AI output if business memory is weak
- migration complexity if transitional and canonical domains overlap too long

## Mitigations

- keep MVP approval-first
- support one core channel deeply before many channels shallowly
- measure regeneration and approval rates early
- keep canonical route and service boundaries clear
