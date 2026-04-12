# Module: Strategy

## Purpose

Manages the marketing content plan for a brand — a time-structured calendar of posts with weekly themes, content pillars, and funnel stages. Strategy generation is fully AI-driven.

## Key Files

| File | Role |
|---|---|
| `strategy.service.ts` | Core business logic: generate, list, get, activate |
| `strategy.controller.ts` | HTTP request handlers |
| `strategy.routes.ts` | Route definitions |

## Responsibilities

1. **Strategy Generation**: Given brand profile + pillars + parameters, calls the AI to produce a `StrategyPlan` with:
   - A title and overarching objective
   - `weeklyThemes[]` — one theme per week with funnel stage
   - `cadenceConfig` — how many posts per week, on which channels
   - `slots[]` — specific post slots with dates, platforms, pillars, funnel stages

2. **Validation**: AI output is validated against a strict Zod schema before being persisted. If the AI returns malformed JSON, the whole operation fails with a clear error.

3. **Transactional Persistence**: The StrategyPlan and all its StrategySlots are created in a **single Prisma transaction** (`prisma.$transaction`). If slot creation fails, the plan is rolled back.

4. **Strategy Activation**: Only one strategy can be `ACTIVE` at a time. Activating a `DRAFT` strategy atomically supersedes all current `ACTIVE` strategies for that brand.

5. **Trend Context Enrichment**: When returning strategy data (list, get, slots), the service fetches the brand's 3 most recent trend matches and attaches them as `trendSnippets`. This provides the frontend with real-time trend context alongside the strategy view.

## Interaction With Other Modules

- **Content module**: `DailyContentJob` reads `StrategySlot` records to know what to generate each day.
- **Content Intelligence** (`trend-matching.service`): Imported directly to fetch trend context for strategy responses.
- **Shared marketing** (`ai-workflow.ts`, `settings.ts`, `prompt-versions.ts`): Used for structured AI calls with full audit trail.

## Key Business Rules

- A brand must have a `BrandProfile` (complete onboarding) before strategy generation can run.
- Only strategies in `DRAFT` status can be activated.
- Activating a new strategy sets all current `ACTIVE` strategies to `SUPERSEDED` (not deleted).
- Strategy slot channels must be valid `SocialPlatform` enum values (`X`, `FACEBOOK`, `LINKEDIN`, `TIKTOK`, `INSTAGRAM`).

## AI Prompt Structure

```
System: "You are a social media strategist. Create a {N}-day content strategy. Return ONLY valid JSON."

User:
  Brand: {name}
  Profile Summary: {summary}
  Business Goals: {JSON}
  Content Pillars: {comma list}
  Channels: {comma list}
  Posts per week: {N}
  Start date: {YYYY-MM-DD}
  Duration: {N} days
  
  Return JSON with: title, objective, weeklyThemes, cadenceConfig, slots
  Generate exactly {total_slots} slots spread across the duration.
```
