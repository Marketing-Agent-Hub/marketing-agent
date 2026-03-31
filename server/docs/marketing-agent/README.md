# AI Marketing Agent V2 Docs

## Purpose

This document set defines the target-state upgrade of the current `news-aggregator-server` into a multi-tenant SaaS product for AI-assisted social media marketing operations.

The current system already provides strong foundations:
- Scheduled background jobs
- AI processing stages
- Content ingestion and extraction
- Admin APIs
- Runtime settings
- Observability and health monitoring

The V2 direction repurposes those strengths into a new product:
- AI onboarding interview for a business
- Persistent brand and audience memory
- Marketing strategy generation
- Daily content brief and post generation
- Approval-first publishing workflow
- Social channel connection and scheduling
- Performance feedback loop

## Document Map

- [Product Vision](./product-vision.md)
- [PRD](./prd.md)
- [Architecture V2](./architecture-v2.md)
- [Data Model V2](./data-model-v2.md)
- [API Specification V2](./api-v2.md)
- [AI Workflow Spec](./ai-workflows.md)
- [Delivery Roadmap](./delivery-roadmap.md)
- [Migration Plan](./migration-plan.md)

## Recommended Reading Order

1. Product Vision
2. PRD
3. Architecture V2
4. Data Model V2
5. API Specification V2
6. AI Workflow Spec
7. Migration Plan
8. Delivery Roadmap

## As-Is to To-Be Summary

### Current product
- Single-tenant admin-oriented backend
- News/content ingestion pipeline
- AI classification and post generation
- Cron-based job execution

### Target product
- Multi-tenant SaaS for businesses and agencies
- Business-aware content strategy engine
- Social media planning, approval, and publishing
- Human-in-the-loop automation with analytics feedback

## Reuse Strategy

### Reuse with moderate refactor
- Express app structure
- Controller/service/job layering
- Prisma + PostgreSQL
- OpenAI integration patterns
- Monitoring, health checks, telemetry
- Settings and feature flags

### Replace or heavily redesign
- `Source` and `Item` domain as the main product surface
- News-centric filtering heuristics
- Stage A / Stage B naming and prompts
- Admin-only authentication model
- News-only API surface

## Delivery Principle

Preserve the current backend's operational strengths, but change the core domain from `news pipeline` to `marketing workflow orchestration`.
