# Module: Publishing

## Purpose

Handles the final step of the marketing workflow: scheduling approved content drafts for publication to social media platforms, executing publish jobs, and recording the results.

## Key Files

| File | Role |
|---|---|
| `publishing.service.ts` | Business logic for scheduling, execution, and retry |
| `publishing.controller.ts` | HTTP request handlers |
| `publishing.routes.ts` | Route definitions |

## Responsibilities

1. **Schedule Draft**: Creates a `PublishJob` record for an `APPROVED` draft with a `scheduledFor` datetime and target platform. Moves the draft to `SCHEDULED` status.

2. **Publish Scheduler Job** (`jobs/marketing/publish-scheduler.job.ts`): Runs every 5 minutes (`*/5 * * * *`). Queries for `PublishJob` records with `status: SCHEDULED` and `scheduledFor <= now`. For each due job:
   - Retrieves the `ContentDraft`
   - Calls `getConnector(platform).publish(job, draft)`
   - On success: creates `PublishedPost`, moves job to `COMPLETED`, draft to `PUBLISHED`
   - On failure: sets job `errorMessage`, moves job to `FAILED`, draft to `FAILED`

3. **Retry**: Resets a `FAILED` `PublishJob` back to `SCHEDULED` with an updated `scheduledFor`, allowing the scheduler to pick it up again.

4. **List Jobs**: Returns all publish jobs for a brand with status filtering.

## Social Connector Architecture

The publishing module uses a **Strategy pattern** via the `SocialConnector` interface defined in `src/shared/marketing/connectors/`:

```typescript
interface SocialConnector {
    platform: SocialPlatform;
    publish(job: PublishJob, draft: ContentDraft): Promise<{
        externalPostId?: string;
        rawResponse: unknown;
    }>;
}
```

**Current implementation**: `StubConnector` — logs the publish attempt and returns a fake `externalPostId: "stub_{timestamp}"`. All platforms (`X`, `FACEBOOK`, `LINKEDIN`, `TIKTOK`, `INSTAGRAM`) are mapped to `StubConnector` at startup.

**Extension point**: Replace or add entries in `connectorRegistry` with real API implementations (e.g., Facebook Graph API, Twitter API v2) to enable real publishing.

## Publish Job State Machine

```
[Draft is APPROVED]
       │
POST /drafts/:id/schedule
       │
       ▼
PublishJob (SCHEDULED) + Draft (SCHEDULED)
       │
       ▼  [PublishSchedulerJob, every 5 min]
       │
  ┌────┴────┐
Success    Failure
  │          │
  ▼          ▼
COMPLETED  FAILED
PUBLISHED  FAILED
  │
PublishedPost created
```

## Interactions With Other Modules

- **Content module**: Reads `ContentDraft` for the post body, hook, CTA, and hashtags.
- **Social Account module**: `SocialAccount` stores access tokens per brand/platform, though the stub connector does not use them.
- **Shared marketing** (`connectors/stub.connector.ts`): The registry and interface definition.

## ⚠ Known Issues / Notes

- **All publishing is stubbed** — no real social media API calls are made. The `StubConnector` simulates success every time.
- `SocialAccount` records (OAuth tokens) are stored in the DB but are not consumed by any connector.
- No webhook support for asynchronous publish confirmation from social platforms.
- No handling of platform-specific content limits (character counts, image requirements).
