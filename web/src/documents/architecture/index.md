---
title: "Architecture"
order: 1
---

# System Architecture

## Overview

The OCVN AI RSS Bot is built on a modern microservices architecture with clear separation of concerns.

## High-Level Diagram

```
┌────────────────────┐
│   Web (Vite)       │
│   - Admin UI       │
│   - Draft Review   │
└─────────┬──────────┘
          │ REST API (JWT)
          ▼
┌────────────────────┐
│   Server (Express) │
│   - Auth           │
│   - Pipeline       │
│   - AI Services    │
└─────────┬──────────┘
          │ Prisma ORM
          ▼
┌────────────────────┐
│   PostgreSQL       │
│   - Sources        │
│   - Items          │
│   - Posts          │
└────────────────────┘
```

## Core Components

### 1. Frontend (Vite + React)

**Responsibilities:**
- Admin authentication
- RSS source management
- Draft review interface
- Monitoring dashboard

**Tech Stack:**
- Vite 7 + React 19
- TypeScript (strict mode)
- TanStack Query v5
- Tailwind CSS v4
- React Router

### 2. Backend (Express + Node.js)

**Responsibilities:**
- RESTful API
- Authentication (JWT)
- Pipeline orchestration
- AI processing
- Job scheduling

**Tech Stack:**
- Express + TypeScript
- Prisma ORM
- PostgreSQL 14+
- OpenAI SDK
- node-cron

### 3. Database (PostgreSQL)

**Schema Overview:**
- `Source`: RSS feed configurations
- `Item`: Individual RSS items
- `Article`: Extracted content
- `AiResult`: AI analysis results
- `DailyPost`: Generated posts
- `PostItem`: Many-to-many relation

## Data Flow

### Content Pipeline

1. **Ingest** (every 15 min)
   - Fetch RSS feeds
   - Parse items
   - Deduplicate by GUID/link

2. **Extract** (every 5 min)
   - Fetch full article HTML
   - Extract main content
   - Store in `Article` table

3. **Filter** (every 3 min)
   - Rule-based filtering
   - Keyword blacklist
   - Mark as `FILTERED_OUT` or `READY_FOR_AI`

4. **AI Stage A** (every 10 min)
   - Quick filter (gpt-4o-mini)
   - Topic tagging
   - Importance scoring

5. **AI Stage B** (every 15 min)
   - Deep analysis (gpt-4o)
   - Vietnamese summaries
   - Bullet points generation

6. **Digest** (daily 00:30)
   - Select top 6-10 items
   - Generate 5 posts/day
   - Create drafts for review

## Security Model

- JWT-based authentication
- Single admin user
- CORS protection
- Rate limiting on AI endpoints
- SQL injection protection (Prisma)
- XSS prevention (sanitized output)

## Scalability Considerations

- Horizontal scaling: Stateless API
- Database connection pooling
- Caching layer (in-memory for now)
- Job queue (ready for Redis)
- CDN for static assets

## Monitoring

- Structured logging (Pino)
- OpenTelemetry traces
- Prometheus metrics
- Health check endpoints
