# Product Requirements Document

## Goal

Transform the current backend into a platform that supports AI-driven social media planning and publishing for multiple customers and brands.

## Product Scope

### In scope for MVP
- multi-tenant workspace model
- AI onboarding interview
- brand profile and business memory
- strategy generation for 30 days
- content pillars and weekly themes
- daily content queue
- approval workflow
- social account connection metadata
- scheduling and publishing jobs
- basic performance analytics
- admin and internal observability

### Out of scope for MVP
- ad campaign management
- visual design editor
- full creative asset generation pipeline
- advanced competitor scraping
- community inbox or comment reply automation
- CRM and email automation

## User Roles

### Workspace owner
- creates workspace
- configures billing and channels
- manages team permissions

### Workspace member
- reviews and approves content
- edits strategy inputs
- views analytics

### Agency operator
- manages multiple client brands under one account or organization

### Platform admin
- monitors platform health
- manages support and manual recovery flows

## Main User Stories

### Onboarding
- As a new customer, I want AI to ask guided questions about my business so I do not have to manually configure every marketing field.
- As a customer, I want to upload website links and docs so the system can build a better understanding of my product.

### Strategy
- As a customer, I want a 30-day social strategy so I know what the system is trying to achieve.
- As a customer, I want content pillars and target personas so the generated content feels intentional.

### Content operations
- As a customer, I want a daily queue of ready-to-review content so I can approve quickly.
- As a customer, I want channel-specific variations so posts fit each platform.
- As a customer, I want to edit or regenerate a post before publishing.

### Automation
- As a customer, I want approved posts to be scheduled automatically.
- As a customer, I want the system to publish to connected social channels on schedule.

### Insight loop
- As a customer, I want to see which themes and formats perform best so I can trust the strategy.
- As a customer, I want the system to improve future suggestions using prior performance.

## Functional Requirements

### 1. Workspace and brand management
- system must support multiple workspaces
- each workspace must support one or more brands
- each brand must have its own voice, audience, goals, and channels

### 2. AI onboarding
- system must support conversational onboarding sessions
- onboarding must persist answers and derived insights
- onboarding output must include at least:
  - brand summary
  - business goals
  - target audience
  - messaging angles
  - content pillars
  - tone guidelines

### 3. Strategy generation
- system must generate a 30-day strategy for each active brand
- strategy must include weekly themes and posting cadence
- strategy must map content to funnel stages where applicable

### 4. Content generation
- system must generate content briefs and full drafts
- drafts must be linked to brand, channel, strategy, and content pillar
- system must support regenerate and manual editing flows

### 5. Approval workflow
- content must have statuses for draft, review, approved, rejected, scheduled, published, failed
- user approvals must be auditable
- system must support optional auto-approval rules in later phases, but default to manual approval

### 6. Publishing
- system must store social connection metadata and permissions
- system must support scheduling posts per channel
- system must execute publish jobs and record results

### 7. Analytics
- system must record publishing outcomes
- system must store post-level performance snapshots
- system must provide basic insight summaries at workspace and brand level

### 8. Settings and feature flags
- system must support runtime configuration for AI models, token limits, cadence defaults, and publishing behavior

## Non-Functional Requirements

### Reliability
- background jobs must be idempotent where practical
- publishing failures must be retryable
- partial failures must not corrupt content lifecycle state

### Scalability
- architecture must support future queue-based execution
- tenant data must be isolated logically

### Security
- credentials and tokens must be encrypted at rest
- workspace data must be access-controlled by tenant membership

### Observability
- all AI, scheduling, and publishing stages must emit structured logs and metrics
- each workflow must be traceable per workspace and brand

### Performance
- dashboard reads should be paginated
- generation jobs should support configurable batch size and concurrency

## MVP Acceptance Criteria

### Business onboarding
- user can complete onboarding and persist a generated brand profile

### Strategy
- user can generate and view a 30-day strategy for one brand

### Daily operations
- system creates daily content suggestions automatically
- user can approve or reject suggestions

### Publishing
- approved content can be scheduled and transition into a publish job

### Traceability
- every generated content item can be traced back to a brand, strategy window, and channel

## KPIs

### Product KPIs
- number of active workspaces
- number of connected channels
- approved posts per week
- published posts per week
- average daily review time

### Quality KPIs
- approval rate
- regeneration rate
- publish success rate
- content reuse rate across channels

### Business KPIs
- trial to paid conversion
- workspace retention
- post consistency over 30 days

## Open Product Decisions

- whether a workspace can own multiple brands in MVP or only one
- whether to support agencies in the initial UI or only in data model
- which social channels to support first
- whether analytics pulls are real-time or snapshot-based
