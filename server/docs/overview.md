# Overview

## Purpose

AI-powered news aggregation system with plugin-based ingestion and multi-stage content processing pipeline. Ingests content from multiple source types (RSS, Web Scraper, YouTube, Social Media, Custom APIs), extracts full article content, applies filtering rules, and uses OpenAI for intelligent categorization and social media post generation.

## Problem Domain

- Aggregate news from multiple source types (RSS, Web Scraper, YouTube, Social Media, Custom APIs)
- Remove market/trading content (banned per requirements)
- Categorize and score content importance using AI
- Generate formatted social media posts (Facebook-optimized)
- Support Vietnamese and English content
- Track content through processing lifecycle

## Key Capabilities

- **Plugin-based Ingestion**: Extensible plugin architecture supporting RSS 2.0/Atom, Web Scraper (CSS selectors), YouTube, Social Media, and Custom APIs
- **Content Extraction**: Mozilla Readability-based full article extraction
- **Multi-Stage Filtering**: Keyword-based filtering + AI categorization
- **AI Processing**: Two-stage pipeline (Stage A: categorization, Stage B: post generation)
- **Monitoring**: OpenTelemetry instrumentation, Prometheus metrics with `sourceType` labels, health checks
- **Admin API**: Manual job triggering, source management, plugin config validation

## Processing Pipeline

```
RSS Feed → Ingest (NEW) → Extract (EXTRACTED) → Filter (READY_FOR_AI)
          → AI Stage A (AI_STAGE_A_DONE) → AI Stage B (AI_STAGE_B_DONE) → USED
          ↓
       FILTERED_OUT (rejected)
```

## System Characteristics

- **Type**: Backend REST API + background job processor
- **Deployment**: Docker containerized, PostgreSQL database
- **Language**: TypeScript (ES2022 modules)
- **Runtime**: Node.js 24+
- **Architecture**: Layered service-oriented with scheduled jobs
- **Data Flow**: Status-driven state machine for items

## Core Entities

- **Source**: Feed/scraper configuration with type, plugin config, trust scores, language, keywords
- **Item**: Individual news article with processing status
- **Article**: Extracted full content and images
- **AiResult**: AI analysis results (categorization + generated posts)
- **Monitoring**: Logs, metrics, health checks, traces

## Operational Model

6 background jobs run on cron schedules:
- Ingest (every 15 min)
- Extraction (every 5 min)
- Filtering (every 10 min)
- AI Stage A (every 10 min)
- AI Stage B (every 15 min)
- Monitoring Cleanup (daily at 2 AM)

Jobs can be manually triggered via admin API endpoints.
