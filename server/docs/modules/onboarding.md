# Module: Onboarding

## Purpose

Guides a brand through a structured Q&A conversation to collect the information needed to build a `BrandProfile`. The profile is the foundation for all AI-generated marketing content.

## Key Files

| File | Role |
|---|---|
| `onboarding.service.ts` | Session lifecycle management (create, add message, complete, get) |
| `onboarding.controller.ts` | HTTP request handlers |
| `onboarding.routes.ts` | Route definitions |

## Responsibilities

1. **Session Creation**: Creates an `OnboardingSession` linked to a brand with an empty transcript and status `IN_PROGRESS`.

2. **Message Accumulation**: Each call to `addMessage` appends a `{role, content, timestamp}` turn to the `transcript` JSON array. The frontend is responsible for constructing the Q&A dialog — the server just stores what it is given.

3. **Session Completion**: Validates that the transcript is non-empty, marks the session `COMPLETED`, sets `completedAt`, and **asynchronously triggers** the `OnboardingAnalysisJob` via `setImmediate`. The HTTP response returns immediately without waiting for AI processing.

4. **Analysis Trigger**: The analysis job (`jobs/marketing/onboarding-analysis.job.ts`) calls `brand-analysis.service.ts` which sends the full transcript to the AI and creates/updates a `BrandProfile`.

## Transcript Format

```json
[
  { "role": "assistant", "content": "What does your company do?", "timestamp": "..." },
  { "role": "user", "content": "We provide B2B SaaS for logistics companies.", "timestamp": "..." },
  { "role": "assistant", "content": "Who is your target customer?", "timestamp": "..." },
  { "role": "user", "content": "Operations managers at mid-size logistics firms.", "timestamp": "..." }
]
```

The `role` field must be `"user"` or `"assistant"`. There is no server-side enforcement of turn order or dialog structure — the API is intentionally flexible to support different onboarding UI designs.

## Edge Cases

| Condition | Error |
|---|---|
| `addMessage` called on a completed session | `422 INVALID_STATE_TRANSITION` |
| `complete` called with empty transcript | `422 VALIDATION_ERROR` |
| `complete` called on already-completed session | `422 INVALID_STATE_TRANSITION` |
| `getSession` with non-existent ID | `404 NOT_FOUND` |

## Route Structure

```
POST   /api/brands/:brandId/onboarding/sessions           → createSession
POST   /api/brands/:brandId/onboarding/sessions/:id/messages → addMessage
POST   /api/brands/:brandId/onboarding/sessions/:id/complete → completeSession
GET    /api/brands/:brandId/onboarding/sessions/:id        → getSession
```

## Interactions With Other Modules

- **Brand module** (`brand-analysis.service.ts`): Called asynchronously after `completeSession`. Reads the transcript and produces a `BrandProfile`.
- **Jobs module** (`onboarding-analysis.job.ts`): The bridge between `onboarding.service` and `brand-analysis.service`.
- **Strategy module**: Strategy generation requires an existing `BrandProfile`, so onboarding is a prerequisite.

## Design Note

The use of `setImmediate` rather than `await` for the analysis job is intentional — it keeps the HTTP response fast (the frontend doesn't wait for AI). The downside is that there is no way to surface a failure to the caller. If the analysis job fails, it is logged but the user receives no notification. The frontend must poll `GET /brands/:id` to see when the `BrandProfile` becomes available.
