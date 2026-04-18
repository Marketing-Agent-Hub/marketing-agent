# System Overview

## What Problem This System Solves

Marketing Agent is a **B2B marketing automation backend** that solves a specific, high-effort problem for content teams: turning a stream of raw news articles into polished, brand-aligned social media posts — fully automatically.

The system replaces the manual workflow of:
1. Browsing news sources for relevant content
2. Reading and filtering articles
3. Drafting and reviewing social posts
4. Scheduling and publishing

It handles all of this autonomously, using AI at each step, while preserving human oversight through an approval workflow before posts go live.

---

## Who Are the Users

| User Type | Description |
|---|---|
| **Brand Editors** | Marketing staff who manage a brand's strategy, review AI-generated content, and approve/reject drafts before publishing |
| **Brand Owners/Admins** | Run workspaces, invite team members, configure strategies, and connect social accounts |
| **System Admins** (Internal) | Operate the pipeline: manage RSS sources, configure AI settings, monitor health and jobs |
| **Content Viewers** | Read-only access to strategies, briefs, and analytics |

---

## High-Level System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                        Express HTTP Server                      │
│                         Port 3001 (default)                     │
├────────────────────────┬────────────────────────────────────────┤
│   Product API (/api/)  │   Internal API (/api/internal/)        │
│   User-facing routes   │   Admin + system operations            │
└────────────┬───────────┴──────────────┬─────────────────────────┘
             │                          │
             ▼                          ▼
┌────────────────────────────────────────────────────────────────┐
│                     Domain Services Layer                      │
│                                                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
│  │   Auth   │  │ Workspace│  │  Brand   │  │  Onboarding  │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────┘  │
│  ┌──────────┐  ┌────────────────────────┐  ┌──────────────┐  │
│  │ Strategy │  │ Content Pipeline (Agents) │  │Social Account│  │
│  └──────────┘  └────────────────────────┘  └──────────────┘  │
│  ┌─────────────────────────┐  ┌──────────┐  ┌──────────────┐  │
│  │  Content Intelligence   │  │  Source  │  │  Monitoring  │  │
│  │ (Ingest/Extract/AI/Flt) │  │Discovery │  │   / Health   │  │
│  └─────────────────────────┘  └──────────┘  └──────────────┘  │
└────────────────────┬───────────────────────────────────────────┘
                     │
                     ▼
          ┌─────────────────────┐
          │ Tenant Job Scheduler│   (Multi-tenant cron)
          │ source: src/jobs/   │
          └──────────┬──────────┘
                     │
                     ▼
        ┌────────────────────────┐
        │      PostgreSQL DB     │   (via Prisma ORM)
        └────────────────────────┘
```

---

## Core Workflows

### Workflow 1: Content Intelligence Pipeline (Automated)

This is the primary pipeline for turning news into social content.

```
RSS/Web Source
     │
     ▼  [Every 15 min]
 IngestJob ──► Save raw Items (status: NEW)
     │
     ▼  [Continuous]
 ExtractionJob ──► Fetch full HTML + extract text + images (status: EXTRACTED)
     │
     ▼  [Continuous]
 FilteringJob ──► Apply deny keywords + AI embedding similarity (status: READY_FOR_AI)
     │
     ▼  [Continuous]
 AI Stage A ──► Classify, tag, score content (status: AI_STAGE_A_DONE)
     │
     ▼  [Continuous]
 AI Stage B ──► Generate complete Vietnamese Facebook post (status: AI_STAGE_B_DONE)
```

### Workflow 2: Multi-Agent Content Pipeline (Continuous)

This workflow produces brand-aligned social posts from news items.

```
Filtered Item (READY_FOR_AI)
     │
     ▼
 Screenwriter ──► Content Script (Story arc, Points, Tone)
     │
     ├───────────────────┬───────────────────┐
     ▼                   ▼                   ▼
Social Post Agent   Video Script Agent   Long-form Agent
(Draft: PENDING)    (Draft: PENDING)    (Draft: PENDING)
     │                   │                   │
     └───────────────────┴───────────────────┘
                         │
                         ▼
             Human review in dashboard
             (APPROVE or REJECT)
```

### Workflow 3: Tenant-specific Job Scheduling

Jobs run on custom intervals per brand.

```
Brand A (Cron: Every 15m) ──► Ingest / Extract / Pipeline
Brand B (Cron: Daily at 8am) ──► Ingest / Extract / Pipeline
```

### Workflow 3: Source Discovery (Weekly)

Automatically finds and proposes new news sources.

```
[Every Monday at 2am]
     │
     ▼
 DiscoveryJob
     ├──► Execute 19 Tavily search queries
     ├──► For each URL: Extract → Validate → Score feed
     └──► Create PendingSource records for admin review
          │
          ▼  (Admin manually approves/rejects)
     Approved sources become active Sources
```

### Workflow 4: Brand Onboarding (On-Demand)

New brands go through a conversational onboarding to build their brand profile.

```
POST /api/brands/:brandId/onboarding/sessions
     │
     ▼
 Create OnboardingSession (transcript: [])
     │
     ▼  (Add Q&A messages via API)
 Messages accumulate in transcript[]
     │
     ▼
 POST .../complete
     ├──► Validates transcript is non-empty
     ├──► Status → COMPLETED
     └──► setImmediate: runs OnboardingAnalysisJob
          └──► AI reads transcript → generates BrandProfile
```
