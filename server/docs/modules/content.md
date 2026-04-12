# Module: Content

## Purpose

Manages the content production pipeline for the marketing v2 system: generating content briefs and social media drafts from strategy slots, and handling the human review/approval workflow.

## Key Files

| File | Role |
|---|---|
| `content.service.ts` | Core logic for generation, review queue, draft editing |
| `content.controller.ts` | HTTP request handlers |
| `content.routes.ts` | Route definitions |

## Responsibilities

1. **Daily Content Generation** (`generateDailyContent`): The primary AI production run. For each `PLANNED` strategy slot due within `daysAhead`:
   - Refreshes TrendSignals from recent items
   - Matches trends to the brand
   - Calls AI to generate a `ContentBrief` (what to say)
   - Calls AI to generate a `ContentDraft` (the actual post text)
   - If a trend signal matches, it is woven into both prompts as context

2. **Review Queue** (`getReviewQueue`): Returns all drafts currently `IN_REVIEW` for a brand, formatted for easy human review (includes brief context, draft text, and trend signals).

3. **Brief Management**: List briefs with pagination; get a single brief with all draft versions.

4. **Draft Regeneration**: Archives all existing non-approved drafts for a brief and generates a fresh one using AI. Version number increments.

5. **Draft Editing**: Humans can make manual edits to `hook`, `body`, `cta`, and `hashtags` before approval. Only `IN_REVIEW` or `DRAFT` status drafts are editable.

6. **Approval/Rejection**: Moves drafts between states. Rejection records a `ContentApproval` event with the actor's userId and optional comment.

## Draft Version Lifecycle

```
AI generates → IN_REVIEW
                │
        ┌───────┴───────┐
   APPROVE           REJECT
        │                │
   APPROVED          REJECTED ──► (regenerate → ARCHIVED)
        │
   (schedule)
        │
   SCHEDULED
        │
   PUBLISHED or FAILED
```

## Content Generation Prompts

### Brief Generation Prompt (simplified)
```
Create a content brief for {platform} post.
Brand: {name}
Summary: {brand summary}
Pillar: {pillar name}
Funnel stage: {stage}

[IF TREND AVAILABLE]
Use this recent trend if relevant:
Headline: {trend headline}
Summary: {trend summary}
Tags: {trend tags}

Return JSON: { title, objective, keyAngle, callToAction, assetDirection }
```

### Post Generation Prompt (simplified)
```
Write a {platform} post based on this brief.
Title: {brief title}
Angle: {keyAngle}
CTA: {callToAction}
Brand voice: {toneGuidelines JSON}

[IF TREND AVAILABLE]
Ground the post in this recent trend when natural:
Headline: {trend headline}
Summary: {trend summary}

Return JSON: { hook, body, cta, hashtags }
```

## Interactions With Other Modules

- **Strategy module**: Reads `StrategySlot` records and updates their status.
- **Content Intelligence** (`trend-signal.service`, `trend-matching.service`): Refreshes and matches trends as part of daily generation.
- **Approval module**: `approveDraft` / `rejectDraft` create `ContentApproval` records.
- **Publishing module**: Approved drafts are scheduled via the publishing module.
- **Shared marketing** (`ai-workflow.ts`, `settings.ts`): All AI calls go through the workflow wrapper for audit trail.

## Error Handling

- If `OpenRouterCreditError` is thrown during a slot loop, the loop breaks immediately to prevent further charges.
- Individual slot failures are logged but do not stop generation for other slots.
- AI output is validated with Zod schemas (`briefOutputSchema`, `draftOutputSchema`) — malformed AI responses throw and the slot is skipped.
