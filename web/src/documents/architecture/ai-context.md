---
title: "AI Agent Context"
description: "Token-efficient reference for AI agents and developers"
order: 4
---

# AI Context - ocNewsBot

Token-efficient reference for AI agents working on Open Campus Vietnam RSS Bot.

---

## Project Summary

Auto-curate RSS content → AI analysis → Vietnamese digests → Facebook posts
Phase 1 (Backend) + Phase 3 (Frontend) complete. Phase 2 (AI Pipeline) complete.

---

## Tech Stack

**Backend:** Express + TypeScript strict + PostgreSQL + Prisma + JWT + node-cron  
**Frontend:** Vite + React 18 + TypeScript strict + TanStack Query v5 + TailwindCSS v4  
**AI:** OpenAI (gpt-4o-mini for Stage A, gpt-4o for Stage B)  
**RSS:** fast-xml-parser + @mozilla/readability

---

## Database Schema

```prisma
Source {
  id, name, rssUrl (unique), siteUrl, lang (VI|EN|MIXED)
  topicTags[], trustScore (0-100), enabled (bool)
  fetchIntervalMinutes (5-1440), denyKeywords[]
  lastValidatedAt, lastValidationStatus (OK|FAILED)
  items[] → Item
}

Item {
  id, sourceId → Source, guid, title, link, snippet
  contentHash (unique), publishedAt
  status: NEW | EXTRACTED | FILTERED_OUT | READY_FOR_AI | 
          AI_STAGE_A_DONE | AI_STAGE_B_DONE | USED_IN_POST | REJECTED
  filterReason
  article? → Article, aiResults[] → AiResult[], postItems[] → PostItem[]
}

Article {
  id, itemId (unique) → Item
  fullHtml, extractedContent, truncatedContent (max 10k chars)
  mainImageUrl
}

AiResult {
  id, itemId → Item, stage ("A"|"B")
  // Stage A: isAllowed, topicTags[], importanceScore (0-100), oneLineSummary
  // Stage B: summary (VN), bullets[] (VN), whyItMatters (VN), riskFlags[], suggestedHashtags[]
  model, promptTokens, completionTokens, totalTokens, rawResponse
}

DailyPost {
  id, targetDate, timeSlot (MORNING_1|MORNING_2|NOON|EVENING_1|EVENING_2)
  content, hookText, bulletsText, ocvnTakeText, ctaText, hashtags[]
  status: DRAFT | APPROVED | REJECTED | POSTED
  editedContent, rejectionReason
  fbPostId, fbPostUrl, postedAt
  postItems[] → PostItem
}

PostItem { id, postId → DailyPost, itemId → Item }
```

---

## Pipeline Flow

```
RSS Sources (enabled=true)
  → [15min cron] Ingest → items(NEW)
  → [5min] Extract → items(EXTRACTED) + articles
  → [3min] Filter → items(READY_FOR_AI | FILTERED_OUT)
  → [10min] AI Stage A (gpt-4o-mini, batch 5) → items(AI_STAGE_A_DONE) + ai_results(stage=A)
  → [15min] AI Stage B (gpt-4o, batch 3, only if Stage A isAllowed=true) → items(AI_STAGE_B_DONE) + ai_results(stage=B)
  → [daily 00:30] Digest → daily_posts(DRAFT, 5 posts/day)
  → [human review] Approve/Reject
  → [scheduled] Facebook publish
```

---

## Critical Business Rules

### Content Safety (HARD REQUIREMENTS)

- Absolute ban: trading signals, price predictions, buy/sell calls, technical analysis, futures/leverage
- Deny keywords (38 total): 21 EN (price, trading, pump, dump, moon, lambo, etc.) + 17 VI (giá, giao dịch, tăng giá, đầu tư, etc.)
- Every post bullet MUST include source link
- NO financial advice, NO investment recommendations

### Content Requirements

- Output: 100% Vietnamese (except technical terms in English)
- Tone: Builder vibe, educational, professional, NO hype/sensationalism
- Topics: Education/EdTech, blockchain tech, Web3 education, Open Campus ecosystem
- No auto-post without human approval (DRAFT → APPROVED → POSTED)

### Digest Generation

- Select 6-10 items with highest scores
- Score = importanceScore × trustMultiplier × diversityPenalty
- Diversity penalty: -10% per repeated topic, -15% per repeated source
- Generate 5 posts/day at time slots: MORNING_1 (08:00), MORNING_2 (08:00), NOON (12:00), EVENING_1 (18:30), EVENING_2 (18:30)
- Format: Hook + Bullets (6-10 items with links) + OCVN Take + CTA + Hashtags
- Always include: #ocvn #opencampus #educampus

### Cost Optimization

- Two-stage AI: Cheap filter (Stage A $0.15/1M) rejects 70%+ before expensive Stage B ($2.50/1M)
- Content hash caching: Stage B reuses summaries for identical content
- Token truncation: Articles capped at 10k chars (~2.5k tokens)
- Rate limiting: 500ms Stage A, 1000ms Stage B

---

## File Structure

```
server/src/
  config/         # env.ts (Zod), ai.config.ts (OpenAI client)
  middleware/     # auth.ts (JWT), error-handler.ts
  routes/         # auth.routes.ts, source.routes.ts, admin.routes.ts
  controllers/    # Thin HTTP handlers
  services/       # Business logic (ingest, extraction, filtering, ai-stage-a, ai-stage-b, digest)
  jobs/           # Cron jobs (ingest, extraction, filtering, ai-stage-a, ai-stage-b, digest)
  lib/            # Pure utils (normalizer, rss-validator, async-handler)
  schemas/        # Zod validation (auth, source)
  db/             # Prisma client singleton

web/src/
  components/     # ProtectedRoute, SourceFormModal
  contexts/       # AuthContext
  pages/          # LoginPage, SourcesPage
  lib/            # api-client.ts (fetch with JWT)
  types/          # api.ts (TypeScript defs)
```

---

## API Contract

### Auth

- `POST /api/auth/login` → `{token, email}`
- `GET /api/auth/me` (JWT) → `{email}`

### Sources (all require JWT)

- `GET /api/sources` → `Source[]`
- `POST /api/sources` → `Source`
- `PATCH /api/sources/:id` → `Source`
- `DELETE /api/sources/:id` → 204
- `POST /api/sources/validate` → `{ok, format?, title?, itemsCount?, error?}`

### Admin Triggers (all require JWT)

- `POST /api/admin/ingest/trigger`
- `POST /api/admin/extraction/trigger` (body: `{limit?: number}`)
- `POST /api/admin/filtering/trigger` (body: `{limit?: number}`)
- `POST /api/admin/ai/stage-a/trigger` (body: `{limit?: number}`)
- `POST /api/admin/ai/stage-b/trigger` (body: `{limit?: number}`)
- `POST /api/admin/digest/trigger` (body: `{date?: string}`)

### Error Response

```json
{
  "error": {
    "code": "string",
    "message": "string",
    "details": "any"
  }
}
```

---

## AI Stage Prompts

### Stage A (GPT-4o-mini, temp=0.3, max_tokens=500)

- Input: title, snippet, source name, publish date
- Reject: trading/price/market content per deny keywords
- Accept: education, blockchain-tech, Web3 education, policy (educational)
- Output JSON: `{isAllowed, topicTags, importanceScore, oneLineSummary, reason}`
- Topics: education, edtech, blockchain-tech, web3, open-campus, research, policy, events

### Stage B (GPT-4o, temp=0.7, max_tokens=1500)

- Input: full article content, Stage A results
- Only runs if Stage A isAllowed=true
- Output JSON: `{summary, bullets[], whyItMatters, riskFlags[], suggestedHashtags[]}`
- All text in Vietnamese except technical terms
- Builder vibe: enthusiastic but professional, educational, NO hype

---

## Data Normalization

- Tags/keywords: lowercase, trim, deduplicate
- URLs: trim, remove trailing slash
- Content hash: SHA256 of `title|link|snippet`
- Vietnamese date format: `toLocaleDateString('vi-VN', {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'})`

---

## Environment Variables

```env
DATABASE_URL="postgresql://..."
JWT_SECRET="..."
ADMIN_EMAIL="admin@opencampus.vn"
ADMIN_PASSWORD_HASH="$2b$10$..." # bcrypt hash
OPENAI_API_KEY="sk-proj-..."
AI_STAGE_A_MODEL="gpt-4o-mini"
AI_STAGE_B_MODEL="gpt-4o"
PORT=3001
NODE_ENV="development"
CORS_ORIGIN="http://localhost:5173"
```

---

## Cron Schedules

- Ingest: `*/15 * * * *` (every 15 min)
- Extraction: `*/5 * * * *` (every 5 min)
- Filtering: `*/3 * * * *` (every 3 min)
- AI Stage A: `*/10 * * * *` (every 10 min, batch 5)
- AI Stage B: `*/15 * * * *` (every 15 min, batch 3)
- Digest: `0 30 0 * * *` (daily at 00:30)

---

## Key Constraints

- Source.rssUrl must be unique
- Item.contentHash must be unique (deduplication)
- DailyPost (targetDate, timeSlot) must be unique
- JWT expires in 7 days
- RSS fetch timeout: 10s
- Article extraction timeout: 10s
- Article truncation: 10,000 chars
- Source trustScore: 0-100
- Source fetchIntervalMinutes: 5-1440
- AI Stage A batch: 5 items/run, 500ms delay between
- AI Stage B batch: 3 items/run, 1000ms delay between
- Digest requires minimum 6 items with AI_STAGE_B_DONE status

---

## Common Patterns

### Service Layer

```typescript
// services/example.service.ts
export async function processItems(limit: number): Promise<void> {
  const items = await prisma.item.findMany({where: {status: 'X'}, take: limit});
  for (const item of items) {
    try {
      // process
      await prisma.item.update({where: {id: item.id}, data: {status: 'Y'}});
    } catch (error) {
      console.error(`Error: ${error}`);
    }
  }
}
```

### Job Layer

```typescript
// jobs/example.job.ts
import cron, { ScheduledTask } from 'node-cron';
let job: ScheduledTask | null = null;

export function startJob(): void {
  if (job) return;
  job = cron.schedule('*/10 * * * *', async () => {
    await processItems(5);
  });
}

export function stopJob(): void {
  if (job) { job.stop(); job = null; }
}

export async function triggerImmediate(limit?: number): Promise<void> {
  await processItems(limit || 5);
}
```

### Controller Layer

```typescript
// controllers/example.controller.ts
export const triggerExample = asyncHandler(async (req, res) => {
  const limit = Number(req.body?.limit) || 10;
  triggerImmediate(limit).catch(console.error);
  res.json({message: 'Triggered', note: 'Running in background'});
});
```

---

## Testing Patterns

### Status Check Query

```sql
SELECT status, COUNT(*) FROM items GROUP BY status;
```

### Verify AI Results

```sql
SELECT i.id, i.title, ar.stage, ar.is_allowed, ar.summary
FROM items i
JOIN ai_results ar ON i.id = ar.item_id
WHERE i.status = 'AI_STAGE_B_DONE'
LIMIT 5;
```

### Check Posts

```sql
SELECT target_date, time_slot, status, array_length(hashtags, 1) as tag_count
FROM daily_posts
ORDER BY target_date DESC, time_slot;
```

---

## Architecture Principles

1. Controllers are thin (parse, call service, return)
2. Services own business logic and validation
3. Jobs handle scheduling and async execution
4. Prisma for all database access (no raw SQL except queries)
5. Zod for input validation
6. JWT for authentication (requireAuth middleware)
7. Error handling via centralized middleware
8. No auto-post without approval (human-in-the-loop)
9. Content safety checks at multiple layers (filtering service + AI Stage A)
10. Cost control via caching and two-stage AI
