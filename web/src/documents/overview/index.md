---
title: "Overview"
description: "Introduction to the Open Campus Vietnam AI RSS Bot system"
order: 1
---

# Open Campus Vietnam - AI RSS Bot

## Introduction

Welcome to the **Open Campus Vietnam AI RSS Bot** documentation. This is an automated content curation system that transforms RSS feeds into high-quality Vietnamese social media content.

### What It Does

The system automatically:
1. **Monitors** RSS feeds from trusted sources about Education, EdTech, Blockchain Tech, and Web3
2. **Filters** content using AI to remove trading/investment noise
3. **Analyzes** articles with GPT-4o to extract key insights
4. **Generates** Vietnamese summaries optimized for social media
5. **Creates** daily digest posts (5 posts/day) for human review
6. **Publishes** approved content to Facebook Page

## Current Status

- ✅ **Phase 1**: Backend API with JWT authentication and source management
- ✅ **Phase 2**: Complete AI pipeline with 2-stage processing
- ✅ **Phase 3**: Frontend dashboard with React + TailwindCSS v4
- ✅ **Phase 4**: Draft review UI and approval workflow
- 🚧 **Phase 5**: Facebook publishing integration (in progress)

## Key Features

### 🎯 Smart Content Curation
- Multi-source RSS monitoring with configurable intervals
- Automatic deduplication using content hashing
- Intelligent topic tagging and categorization
- Source trust scoring (0-100)

### 🤖 AI-Powered Analysis
- **Stage A** (GPT-4o-mini): Fast filtering for relevance and topic extraction
- **Stage B** (GPT-4o): Deep analysis with Vietnamese summaries
- Content hash caching to minimize API costs
- Token optimization with smart truncation

### 🇻🇳 Vietnamese Output
- 100% Vietnamese summaries (technical terms in English)
- Builder vibe tone: educational, professional, no hype
- Contextual "OCVN Take" for community engagement
- Optimized for Vietnamese social media audience

### 👥 Human-in-the-Loop
- Draft review interface with live preview
- Edit hooks, bullets, OCVN take, CTA, and hashtags
- Approve/reject workflow with reasons
- No auto-posting without explicit approval

### 💰 Cost Optimized
- Two-stage AI reduces Stage B calls by 70%+
- Content hash caching prevents duplicate processing
- Batch processing with rate limiting
- Smart token usage (avg. 2.5k tokens per article)

### 🔒 Content Safety
- **Absolute ban** on trading signals and price predictions
- 38 deny keywords (21 EN + 17 VI) for filtering
- Human review before publishing
- Source-level deny keywords support

## Tech Stack

### Backend
- **Runtime**: Node.js 20+ with TypeScript
- **Framework**: Express with strict typing
- **Database**: PostgreSQL 14+ with Prisma ORM
- **Auth**: JWT tokens with bcrypt password hashing
- **AI**: OpenAI API (GPT-4o-mini + GPT-4o)
- **RSS**: fast-xml-parser + @mozilla/readability
- **Jobs**: node-cron for scheduled tasks
- **Monitoring**: OpenTelemetry + Pino + Prometheus

### Frontend
- **Build Tool**: Vite 7.3+
- **Framework**: React 19 with TypeScript
- **Routing**: React Router v7
- **State**: TanStack Query v5 for server state
- **Styling**: TailwindCSS v4 (latest)
- **Forms**: React Hook Form + Zod validation
- **Docs**: react-markdown + remark/rehype plugins

### Infrastructure
- **Containerization**: Docker + Docker Compose
- **Database**: PostgreSQL 16 in Docker
- **Reverse Proxy**: Nginx (Docker frontend)
- **SSL**: Caddy or Certbot + Nginx

## Pipeline Architecture

```
RSS Sources (enabled=true)
  ↓ [Every 15 min]
[Ingest Job] → items (status: NEW)
  ↓ [Every 5 min]
[Extract Job] → items (status: EXTRACTED) + articles
  ↓ [Every 3 min]
[Filter Job] → items (status: READY_FOR_AI or FILTERED_OUT)
  ↓ [Every 10 min - batch 5]
[AI Stage A] → items (status: AI_STAGE_A_DONE) + ai_results
  ├─ Output: isAllowed, topicTags, importanceScore, oneLineSummary
  └─ If rejected → FILTERED_OUT
  ↓ [Every 15 min - batch 3]
[AI Stage B] → items (status: AI_STAGE_B_DONE) + ai_results
  └─ Output: summary (VN), bullets (VN), whyItMatters (VN), hashtags
  ↓ [Daily at 00:30]
[Digest Job] → daily_posts (status: DRAFT)
  └─ Generates 5 posts for next day (MORNING_1, MORNING_2, NOON, EVENING_1, EVENING_2)
  ↓ [Human Review]
[Draft Review UI] → Approve/Reject/Edit
  ↓ [Scheduled]
[Facebook Publishing] → Posted to page
```

## System Goals

1. **Quality Content**: Auto-curate trusted sources about Education, EdTech, Blockchain Tech, Web3
2. **Vietnamese First**: All output in Vietnamese with builder vibe (educational, no hype)
3. **Safety First**: Absolute ban on trading/price/investment content
4. **Cost Efficient**: 2-stage AI filter + content caching + token optimization
5. **Human Control**: Mandatory approval before publishing

## Quick Navigation

### 📚 Getting Started
- [Development Guide](./guides/development) - Local setup with Node.js + PostgreSQL
- [Docker Deployment](./deployment/docker) - Production deployment with Docker Compose
- [VPS Deployment](./deployment/vps) - Step-by-step VPS setup with HTTPS

### 🏗️ Architecture
- [System Design](./architecture/system-design) - Technical architecture and principles
- [Pipeline Overview](./architecture/pipeline) - Content processing pipeline
- [Digest Generation](./architecture/digest) - Daily post generation algorithm

### 📖 Guides
- [AI Pipeline Setup](./guides/ai-setup) - Configure OpenAI and test AI pipeline
- [Pipeline Testing](./guides/testing) - Test RSS ingestion and processing
- [Draft Testing](./guides/testing-drafts) - Test the draft review UI

### 🚀 Deployment
- [Environment Variables](./deployment/environment) - Complete configuration reference
- [Docker Guide](./deployment/docker) - Docker Compose setup
- [VPS Guide](./deployment/vps) - Ubuntu/Debian deployment

### 📊 Monitoring
- [Monitoring System](./monitoring/index) - OpenTelemetry + Pino + Prometheus
- [Quick Start](./monitoring/quickstart) - Quick monitoring reference
- [UI Guide](./monitoring/ui-guide) - Web monitoring dashboard

### 🔌 API Reference
- [REST API](./api/index) - Complete API documentation

### 📋 Reference
- [SRS Document](./reference/srs) - Software Requirements Specification

## Project Principles

### Content Safety (Non-negotiable)
- Absolute ban on trading signals, price predictions, buy/sell calls
- No technical analysis, futures/leverage content
- Every post bullet MUST include source link
- NO financial advice or investment recommendations

### Quality Over Quantity
- Trust score system (0-100) for sources
- Diversity penalty in selection algorithm
- Human review required before publishing
- Focus on educational, builder-focused content

### Cost Optimization
- Two-stage AI: cheap filter (Stage A $0.15/1M tokens) + expensive summary (Stage B $2.50/1M tokens)
- Content hash caching prevents duplicate processing
- Token truncation keeps articles under 10k chars (~2.5k tokens)
- Batch processing with rate limiting (500ms Stage A, 1000ms Stage B)

### Developer Experience
- TypeScript strict mode everywhere
- Zod validation for all inputs
- Comprehensive error handling
- Detailed logging with trace IDs
- Auto-generated Prisma types

## License

MIT License - Free to use and modify

## Support

- **Issues**: Report bugs via GitHub issues
- **Docs**: This documentation site
- **Code**: [GitHub Repository](https://github.com/your-org/ocNewsBot)

For issues or questions:
- Check the [Troubleshooting Guide](/docs/guides/troubleshooting)
- Review API documentation in [API Reference](/docs/api)
- Contact: admin@opencampus.vn
