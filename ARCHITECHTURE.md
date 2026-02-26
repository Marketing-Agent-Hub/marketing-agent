# Open Campus Vietnam – AI RSS Bot
## ARCHITECTURE.md (For AI Agent Context)
Version: 1.0  
Status: Draft (Aligned with SRS v1.0)  
Primary goals: maintainability, safety (no trading), cost-efficiency, quality content

---

# 0. One-line Summary
A two-service system: **Express API server** handles RSS sources, ingest, filtering, AI pipeline, and posting; **Vite Web UI** provides admin dashboard for managing sources and approving drafts before publishing to Facebook.

---

# 1. Architecture Principles (Non-negotiables)

## 1.1. Hard content safety rules
- **Absolute ban** on trading/price/market-call content.
- Never output financial advice.
- Every post bullet must have a **source link**.
- Paraphrase only; do not copy long verbatim text.

## 1.2. Human-in-the-loop is mandatory
- No auto-post without explicit approval.
- Drafts must remain editable; edits should be saved.

## 1.3. Cost control is a first-class requirement
- Use caching by `contentHash`.
- Prefer two-stage AI: cheap filter → deep summarize.
- Truncate extracted content to a safe token budget.

## 1.4. Separation of concerns
- UI is “dumb”: renders data and calls APIs.
- Server owns domain logic (validation, scoring, filtering, generation).
- Database changes must be explicit and migration-based.

---

# 2. High-level Component Diagram
┌────────────────────────────┐
│ Web (Vite) │
│ - Login (admin) │
│ - Source Manager │
│ - Draft Review/Editor │
└───────────────▲────────────┘
│ REST (JWT)
▼
┌────────────────────────────┐
│ Server (Express) │
│ API + Domain Services: │
│ - Auth │
│ - Sources CRUD + Validate │
│ - Ingest Workers (Phase 2) │
│ - Extraction + Filtering │
│ - AI Pipeline (Stage A/B) │
│ - Digest Generator │
│ - Facebook Publisher │
└───────────────▲────────────┘
│ Prisma
▼
┌────────────────────────────┐
│ PostgreSQL │
│ sources, items, articles, │
│ ai_results, daily_posts, │
│ post_items │
└────────────────────────────┘
# 3. Repository Layout
ai-rss-bot/ # Root project folder
│
├── server/ # Express API server
│ ├── src/
│ │ ├── index.ts
│ │ ├── config/
│ │ ├── db/
│ │ ├── middleware/
│ │ ├── routes/
│ │ ├── controllers/
│ │ ├── services/
│ │ ├── lib/
│ │ ├── jobs/
│ │ ├── integrations/
│ │ ├── schemas/
│ │ └── types/
│ │
│ ├── prisma/
│ │ ├── schema.prisma
│ │ └── migrations/
│ │
│ ├── package.json
│ ├── tsconfig.json
│ └── .env.example
│
├── web/ # Vite + React Admin Dashboard
│ ├── src/
│ │ ├── app/
│ │ ├── components/
│ │ ├── api/
│ │ ├── auth/
│ │ ├── schemas/
│ │ └── types/
│ │
│ ├── index.html
│ ├── package.json
│ ├── tsconfig.json
│ └── .env.example
│
├── README.md
├── SRS.md
└── ARCHITECTURE.md


Key rule: **controllers are thin**, services own logic.

---

# 4. Modules & Ownership (Boundaries)

## 4.1. `routes/` + `controllers/` (HTTP layer)
- Parse/validate request (zod)
- Call service
- Return JSON
- No business rules here.

## 4.2. `services/` (Domain layer)
Owns:
- Normalization rules (tags, keywords)
- TrustScore policies
- Source enablement policy
- Filtering logic (ban trading)
- Digest generation policy (5 posts/day with 3 time buckets)
- Validation status update
- (Phase 2+) selection logic, diversity penalty

## 4.3. `integrations/`
Owns:
- Facebook Graph API calls
- (Future) AI provider client
- Must be isolated behind interfaces; no direct calls from controllers.

## 4.4. `jobs/` (Phase 2+)
Owns:
- cron triggers
- queue processing
- retry/backoff
- ensures idempotency

## 4.5. `lib/`
Pure helpers:
- RSS XML detection
- fetch with timeout
- canonical URL normalization
- content hashing

---

# 5. Data Flow (End-to-End)

## 5.1. Phase 1: Source Manager
1) Admin adds source (enabled=false by default, recommended)
2) Admin clicks Validate
3) Server fetches RSS, parses XML, detects RSS/Atom
4) Server writes validation fields to DB
5) Admin enables source after validation OK

## 5.2. Phase 2+: Ingest + AI + Draft
1) Ingest job fetches enabled sources
2) Parse items → dedup → store `items`
3) Fetch full article → extract content → store `articles`
4) Apply rule-based deny keywords
5) AI stage A: allow/tag/score
6) AI stage B: summary + bullets + OCVN take
7) Draft generator picks items for each slot → create `daily_posts(draft)`
8) Admin reviews/edits → approve
9) Publisher posts to Facebook → mark posted with fbPostId

---

# 6. Database Contracts (What each table means)

## 6.1. `sources`
Source configuration only. No ingest results stored here except validate audit fields.

## 6.2. `items`
Represents one RSS entry (raw metadata). Must be idempotent; unique constraint should prevent duplicates.

## 6.3. `articles`
Extracted full content for an item. Includes:
- cleaned text
- contentHash for caching
- optional main image

## 6.4. `ai_results`
Stores outputs of AI stage A/B in structured JSON (and/or normalized columns).

## 6.5. `daily_posts`
Stores draft/approved/posted content for each slot.

## 6.6. `post_items`
Join table for traceability: which items were used in a post.

---

# 7. API Conventions

## 7.1. REST naming
- `/auth/login`, `/auth/me`
- `/sources`, `/sources/:id`, `/sources/validate`
- (future) `/drafts`, `/drafts/:id/approve`, `/drafts/:id/reject`

## 7.2. Error format (standard)
All errors return:
```json
{
  "error": {
    "code": "VALIDATION_ERROR | UNAUTHORIZED | NOT_FOUND | INTERNAL",
    "message": "Human readable",
    "details": {}
  }
}
## 7.3. Authentication

JWT Bearer token

UI stores token (MVP localStorage ok; production prefer httpOnly cookie or secure storage strategy)

## 7.4. Idempotency (Phase 2+)

Ingest jobs must be safe to rerun:

dedup by guid/link/contentHash

upsert patterns where possible

# 8. Content Safety: Trading Ban Implementation
## 8.1. Rule-based deny list (global + per-source)

A global deny list is applied before any AI call.

Per-source denyKeywords are applied next.

## 8.2. AI safety gate (Stage A)

Stage A must output isAllowed=false if market/trading is detected.

If Stage A says false → do not run Stage B.

## 8.3. Post generator safety gate

If a candidate item has riskFlags indicating market talk → exclude

Final post must not mention:

price, charts, “x2”, entry/exit, etc.

# 9. Digest Generation Policy (Fixed Requirements)

5 posts/day

Time buckets:

08:00: slot A + slot B

12:00: slot C

18:30: slot D + slot E

Each post:

Hook (1 sentence)

6–10 bullets (each includes link)

OCVN take (1–2 sentences)

CTA (1 sentence)

Hashtags (3–7)

# 10. Code Standards (For AI Agent)
## 10.1. TypeScript rules

strict: true

No any unless justified and isolated.

Always type API responses and DB entities.

## 10.2. Validation first

All request payloads validated with zod at controller boundary.

Service assumes validated input.

## 10.3. Logging

No secrets in logs (tokens, passwords).

Use structured logs: requestId, route, outcome.

## 10.4. Testing expectations

Unit tests: normalization + RSS detection + validation schemas.

E2E: at least one CRUD + validate flow.

## 10.5. Migrations

Any DB change requires Prisma migration.

Never “hot edit” DB schema manually.

# 11. Deployment Notes (Constraints)

Server and Web can be deployed separately.

Environment variables are mandatory:

DATABASE_URL, JWT_SECRET, CORS_ORIGIN, ADMIN_EMAIL, ADMIN_PASSWORD_HASH

DB backups recommended once daily (later).

# 12. Decision Log (Current)

Server framework: Express

UI: Vite + React

Auth: JWT admin single-user

Language posts: 100% Vietnamese, keep technical terms

Human approval required

Strict ban on trading/price content

# 13. What AI Agent must NOT do

Do not add scraping/social crawling without request.

Do not generate/insert trading content.

Do not bypass approval gate.

Do not change post tone away from builder vibe.

Do not silently alter DB schema.

# 14. Quick Start (Dev)

(High level; implementation details live in Phase READMEs)

Start Postgres (Docker)

cd server && pnpm dev

cd web && pnpm dev

Login and add/validate sources