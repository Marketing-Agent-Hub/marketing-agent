---
title: "Overview"
order: 1
---

# Open Campus Vietnam - AI RSS Bot

## Introduction

Welcome to the OCVN AI RSS Bot documentation. This system automatically curates RSS content, analyzes it with AI, and generates Vietnamese digests for publishing on social media.

## Key Features

- **Smart Content Curation**: Automatically fetch and filter content from multiple RSS sources
- **AI-Powered Analysis**: Two-stage AI processing for quality content
- **Vietnamese Output**: Localized summaries optimized for Vietnamese audience  
- **Human Review**: Draft approval workflow before publishing
- **Cost Optimized**: Efficient AI usage with caching and smart filtering

## System Goals

1. **Auto-curate** quality content about Education, EdTech, Blockchain Tech, Web3
2. **Vietnamese output** with builder vibe (educational, no hype)
3. **Strict ban** on trading/price/investment content
4. **Cost-efficient** AI (2-stage filter + caching)
5. **Human approval** required before publishing

## Quick Links

- [Architecture Overview](/docs/architecture)
- [Getting Started Guide](/docs/guides/getting-started)
- [API Reference](/docs/api)
- [Deployment Guide](/docs/guides/deployment)

## Tech Stack

**Backend:** Express + TypeScript + PostgreSQL + Prisma + OpenAI  
**Frontend:** Vite + React 19 + TypeScript + TanStack Query + Tailwind CSS v4  
**AI:** GPT-4o-mini (Stage A) + GPT-4o (Stage B)

## Pipeline Flow

```
RSS Sources → Ingest → Extract → Filter 
  → AI Stage A (filter) → AI Stage B (summarize) 
  → Digest Generation → Draft Review → Publish
```

## Support

For issues or questions:
- Check the [Troubleshooting Guide](/docs/guides/troubleshooting)
- Review API documentation in [API Reference](/docs/api)
- Contact: admin@opencampus.vn
