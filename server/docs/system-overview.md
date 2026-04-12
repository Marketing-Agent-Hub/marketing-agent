# System Overview

## What Problem This System Solves

OC News Bot is a **B2B marketing automation backend** that solves a specific, high-effort problem for content teams: turning a stream of raw news articles into polished, brand-aligned social media posts — fully automatically.

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
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
│  │ Strategy │  │ Content  │  │Publishing│  │Social Account│  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────┘  │
│  ┌─────────────────────────┐  ┌──────────┐  ┌──────────────┐  │
│  │  Content Intelligence   │  │  Source  │  │  Monitoring  │  │
│  │ (Ingest/Extract/AI/Flt) │  │Discovery │  │   / Health   │  │
│  └─────────────────────────┘  └──────────┘  └──────────────┘  │
└────────────────────┬───────────────────────────────────────────┘
                     │
                     ▼
          ┌─────────────────────┐
          │  Background Jobs    │   (node-cron)
          │  source: src/jobs/  │
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

### Workflow 2: Marketing Content Generation (Scheduled, Daily)

This workflow produces brand-aligned social posts based on a content strategy.

```
Strategy Plan (pre-defined slots)
     │
     ▼  [Daily at 6am]
 DailyContentJob
     │
     ├──► Refresh TrendSignals from DB
     ├──► Match trends to brand interests (BrandTrendMatch)
     ├──► For each PLANNED slot due today:
     │       ├──► AI generates ContentBrief
     │       └──► AI generates ContentDraft (status: IN_REVIEW)
     │
     ▼
 Human review in dashboard (APPROVE or REJECT)
     │
     ▼  [Every 5 min]
 PublishSchedulerJob ──► Publish APPROVED, scheduled drafts
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
