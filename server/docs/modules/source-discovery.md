# Module: Source Discovery

## Purpose

Automatically discovers new RSS feeds using the Tavily web search API, validates them, scores their quality, and queues them for admin review. Reduces the manual work of finding relevant news sources.

## Key Files

| File | Role |
|---|---|
| `search.service.ts` | Executes predefined Tavily search queries to find feed candidates |
| `feed-extractor.service.ts` | Extracts the actual RSS/Atom URL from a web page URL |
| `feed-validator.service.ts` | Fetches and parses a candidate feed to verify it is valid |
| `feed-scorer.service.ts` | Uses AI to score a feed's quality and assign topic tags |
| `pending-source.repository.ts` | CRUD for `PendingSource` table |
| `source-discovery.controller.ts` | HTTP handlers for admin management of pending sources |
| `source-discovery.routes.ts` | Internal routes |

## Responsibilities

1. **Search**: Executes 19 hard-coded Tavily search queries spanning EdTech, Blockchain/Web3, and Vietnamese language variants. Deduplicates and filters URLs already in the `sources` table.

2. **Feed Extraction**: For each URL returned by search, attempts to identify the actual RSS/Atom feed URL. May fetch the page and look for `<link rel="alternate" type="application/rss+xml">` tags.

3. **Feed Validation**: Fetches the candidate feed URL and attempts to parse it as RSS or Atom. Extracts metadata (title, feed type, item count).

4. **Feed Scoring**: Calls the AI discovery model to analyze the feed's content quality, assign a `trustScore` (0–100), infer topic tags, and suggest deny keywords. Feeds scoring below threshold are discarded.

5. **Duplicate Prevention**: Before creating a `PendingSource`, checks if the `feedUrl` already exists in `pending_sources`. Maintains an in-memory list during a single run to prevent duplicates within the same job execution.

## Discovery Pipeline (Step-by-Step)

```
1. Load existing source URLs from DB → build exclusion Set
2. Execute all Tavily search queries in series
3. Deduplicate raw results
4. For each result URL:
   a. extractFeedUrl() → shouldProceedWithFeed() (confidence check)
   b. validateFeed() → filter if invalid
   c. scoreFeed() → filter if trustScore too low or duplicate
   d. shouldCreatePendingSource() → filter if already pending
   e. createPendingSource() → save to DB
5. Log total created count
```

## Interactions With Other Modules

- **Jobs module**: `source-discovery.job.ts` orchestrates the full pipeline.
- **Content Intelligence**: After an admin approves a `PendingSource`, a new `Source` is created (handled in `pending-source.repository.ts:approvePendingSource`).

## Search Queries

The 19 hard-coded queries in `search.service.ts` are domain-specific:
- EdTech: "best EdTech blogs RSS feed 2024", "education technology blog atom feed"
- Blockchain/Web3: "blockchain news site:medium.com RSS", "DeFi news and analysis RSS"
- Vietnamese: "blog giáo dục công nghệ RSS feed", "blockchain web3 tin tức Việt Nam RSS"

> **Architectural Note**: These queries are hard-coded in `SEARCH_QUERIES` constant. Changing the discovery topic focus requires a code change and deployment.

## Schedule

Runs weekly: `0 2 * * 1` (Monday at 02:00). Requires `TAVILY_API_KEY` environment variable to be set; if not present, the job is never scheduled and a warning is logged at startup.
