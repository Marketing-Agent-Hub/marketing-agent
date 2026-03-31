# API Specification V2

## Base Path

```http
/api/v2
```

## Auth Model

Use user-based authentication with workspace-scoped authorization.

### Auth endpoints
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`

## Workspace Endpoints

### `GET /workspaces`
- list workspaces current user can access

### `POST /workspaces`
- create a workspace

### `GET /workspaces/:workspaceId`
- get workspace detail

### `POST /workspaces/:workspaceId/members`
- invite or add a member

## Brand Endpoints

### `GET /workspaces/:workspaceId/brands`
- list brands in a workspace

### `POST /workspaces/:workspaceId/brands`
- create a brand

### `GET /brands/:brandId`
- get brand details with profile summary

### `PATCH /brands/:brandId`
- update brand metadata

### `GET /brands/:brandId/profile`
- get normalized brand profile

## Onboarding Endpoints

### `POST /brands/:brandId/onboarding/session`
- create onboarding session

### `POST /brands/:brandId/onboarding/session/:sessionId/messages`
- append question or answer turns

### `POST /brands/:brandId/onboarding/session/:sessionId/complete`
- mark interview complete and trigger analysis

### `GET /brands/:brandId/onboarding/session/:sessionId`
- get session transcript and status

### `POST /brands/:brandId/knowledge-documents`
- upload or register a knowledge source

## Strategy Endpoints

### `POST /brands/:brandId/strategies/generate`
- trigger strategy generation

### `GET /brands/:brandId/strategies`
- list strategies

### `GET /strategies/:strategyId`
- get strategy plan detail

### `POST /strategies/:strategyId/activate`
- activate strategy and supersede prior active plan

### `GET /strategies/:strategyId/slots`
- list planned slots

## Content Operations Endpoints

### `POST /brands/:brandId/content/generate-daily`
- trigger daily content generation for upcoming slots

### `GET /brands/:brandId/briefs`
- list briefs

### `GET /briefs/:briefId`
- get a brief and associated drafts

### `POST /briefs/:briefId/drafts/regenerate`
- regenerate channel drafts

### `PATCH /drafts/:draftId`
- manually edit a draft

### `POST /drafts/:draftId/approve`
- approve a draft

### `POST /drafts/:draftId/reject`
- reject a draft

### `GET /brands/:brandId/review-queue`
- get review queue for pending drafts

## Social Connection Endpoints

### `GET /brands/:brandId/social-accounts`
- list connected accounts

### `POST /brands/:brandId/social-accounts/connect`
- start OAuth flow or store connector metadata

### `POST /social-accounts/:id/refresh`
- refresh credentials

### `POST /social-accounts/:id/disconnect`
- revoke or disconnect account

## Scheduling and Publishing Endpoints

### `POST /drafts/:draftId/schedule`
- create publish job for approved draft

### `GET /brands/:brandId/publish-jobs`
- list scheduled and historical publish jobs

### `POST /publish-jobs/:id/retry`
- retry failed publish job

### `GET /published-posts/:id`
- get published post result

## Analytics Endpoints

### `GET /brands/:brandId/analytics/overview`
- summary metrics for a date range

### `GET /brands/:brandId/analytics/posts`
- post-level performance list

### `GET /brands/:brandId/recommendations`
- optimization recommendations

## Internal Admin Endpoints

Keep internal operational routes separated:

```http
/api/internal/admin/*
```

Examples:
- trigger jobs manually
- inspect generation runs
- replay failed workflows
- inspect connector health

## Example Response Shapes

### Brand profile
```json
{
  "brand": {
    "id": 12,
    "name": "Acme CRM",
    "websiteUrl": "https://acme.example"
  },
  "profile": {
    "summary": "B2B CRM for small sales teams",
    "targetAudience": [
      "sales managers",
      "founders"
    ],
    "contentPillars": [
      "sales productivity",
      "pipeline hygiene",
      "customer stories"
    ]
  }
}
```

### Review queue item
```json
{
  "draftId": 880,
  "platform": "LINKEDIN",
  "status": "IN_REVIEW",
  "brief": {
    "title": "How to reduce pipeline leakage",
    "objective": "Awareness"
  },
  "draft": {
    "hook": "Most teams do not lose deals in the pitch.",
    "body": "..."
  }
}
```

### Publish job
```json
{
  "id": 401,
  "draftId": 880,
  "status": "SCHEDULED",
  "scheduledFor": "2026-04-05T09:00:00.000Z",
  "platform": "LINKEDIN"
}
```

## Error Format

Retain the existing response shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {}
  }
}
```

## Versioning Guidance

- preserve current endpoints under `/api`
- introduce new product APIs under `/api/v2`
- keep legacy routes during migration until frontend and jobs are fully moved
