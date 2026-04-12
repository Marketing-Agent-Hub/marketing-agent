# Module: Content Intelligence

## Purpose

The largest and most critical module. Implements the full pipeline from raw feed ingestion to AI-generated social media posts. This is the original "news bot" core of the system.

## Key Files

| File | Role |
|---|---|
| `ingest.service.ts` | Fetches feeds using plugins, deduplicates, saves Items |
| `extraction.service.ts` | Fetches full article HTML, extracts content and images |
| `filtering.service.ts` | Applies deny keywords and AI embedding similarity filter |
| `ai-stage-a.service.ts` | AI classification: tags, importance score, summary |
| `ai-stage-b.service.ts` | AI post generation: full Vietnamese Facebook post |
| `source.service.ts` | CRUD for Source entities |
| `source.controller.ts` | HTTP handlers for admin source management |
| `item.service.ts` | Queries and management of Item records |
| `brand-source.service.ts` | CRUD for BrandSource (many-to-many brand↔source) |
| `filter-profile.service.ts` | CRUD for per-brand FilterProfile |
| `trend-signal.service.ts` | Promotes high-importance AI_STAGE_B_DONE items into TrendSignals |
| `trend-matching.service.ts` | Embeds brand topics and matches against TrendSignals |
| `vector-profile.builder.ts` | Builds a brand's vector profile from its topic tags |
| `filter-engine.ts` | Pure function: runs the filter logic given a profile and article |
| `content-intelligence.controller.ts` | Handles manual triggers and trend endpoints |
| `admin.routes.ts` | Internal routes for pipeline stage triggers |
| `source.routes.ts` | Internal CRUD routes for sources |
| `item.routes.ts` | Internal routes for item inspection |
| `brand-source.routes.ts` | Product routes for brand source association |
| `filter-profile.routes.ts` | Product routes for filter profile management |
| `ai-settings.routes.ts` | Internal routes to read/write AI model settings |

## Responsibilities

1. **Feed Ingestion**: Polls all enabled `Source` records at their configured interval. Dispatches to the correct plugin (`RSS`, `WEB_SCRAPER`). Handles both legacy global sources and multi-tenant `BrandSource` links.

2. **Content Extraction**: For each `NEW` item, fetches the full article page, runs Mozilla Readability to extract clean text, and uses a 5-tier image scoring system to select the best representative image.

3. **Filtering**: Two-layer filter — global keyword deny list (trading/market terms are always blocked) and optional AI embedding similarity against a brand-specific vector profile.

4. **AI Classification (Stage A)**: Uses a lightweight model to tag content topics, assign an importance score (0–100), and produce a one-line summary. Has a heuristic fallback when AI is disabled.

5. **AI Post Generation (Stage B)**: Uses a larger model to write a complete Vietnamese Facebook post with a specific format (headline, separator, body, closing, hashtags). Has a simple template fallback when AI is disabled. Implements content hash caching to avoid duplicate AI calls.

6. **Trend Intelligence**: High-importance items are promoted to `TrendSignal` records. These are then matched to brands using embedding similarity to provide current news context for marketing content generation.

## Interactions With Other Modules

- **Jobs module**: `ingest.job.ts`, `extraction.job.ts`, `filtering.job.ts`, `ai-stage-a.job.ts`, `ai-stage-b.job.ts` all import and call services from this module.
- **Content module**: `content.service.ts` imports `trend-signal.service` and `trend-matching.service` to refresh and use trend context when generating daily content.
- **Strategy module**: `strategy.service.ts` imports `trend-matching.service` to attach trend snippets to strategy data.
- **lib/ai-client**: Used directly by `ai-stage-a.service`, `ai-stage-b.service`, `filtering.service`.
- **lib/plugins**: Used by `ingest.service` to fetch and parse feeds.

## State Machine

```
NEW
 │
 ▼ (ExtractionJob)
EXTRACTED ──────────────────────────► FILTERED_OUT
 │
 ▼ (FilteringJob)
READY_FOR_AI ───────────────────────► (rarely filtered here, currently pass-through in legacy path)
 │
 ▼ (AI Stage A Job)
AI_STAGE_A_DONE ────────────────────► FILTERED_OUT (if isAllowed = false)
 │
 ▼ (AI Stage B Job)
AI_STAGE_B_DONE  ← terminal success state
```

## ⚠ Known Issues / Notes

- **Filtering is currently DISABLED** in `filtering.service.ts`. The keyword deny checks are commented out with `// FILTERING DISABLED FOR TESTING`. Items in the legacy path always pass through.
- **Stage A always forces `isAllowed: true`** in `callStageA()`, regardless of what the AI returns. This is tagged as `// Force allow all items for testing`.
- Multi-tenant ingestion (`ingestAllBrandSources`) and legacy ingestion (`ingestAllSources`) run concurrently. Once all sources migrate to BrandSource, the legacy path should be removed.
