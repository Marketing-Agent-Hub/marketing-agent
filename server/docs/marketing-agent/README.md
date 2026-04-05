# AI Marketing Agent Docs

## Purpose

This document set defines the target-state architecture of `marketing-agent-server` as a multi-tenant SaaS backend for AI-assisted social media marketing operations.

The current system already provides strong foundations:
- Scheduled background jobs
- AI processing stages
- Content ingestion and extraction
- Admin APIs
- Runtime settings
- Observability and health monitoring

The current direction repurposes those strengths into a new product:
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
- [Architecture](./architecture.md)
- [Data Model](./data-model.md)
- [API Specification](./api.md)
- [AI Workflow Spec](./ai-workflows.md)
- [Delivery Roadmap](./delivery-roadmap.md)

## Recommended Reading Order

1. Product Vision
2. PRD
3. Architecture
4. Data Model
5. API Specification
6. AI Workflow Spec
7. Delivery Roadmap

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

Preserve the backend's operational strengths while centering the product on `marketing workflow orchestration`.
