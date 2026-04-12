# Module: Content

## Purpose

Manages the content production pipeline for the marketing v2 system: generating content scripts and multi-format drafts (social, video, long-form) from filtered news items.

## Key Files

| File | Role |
|---|---|
| `content-pipeline.service.ts` | Orchestrates the multi-agent execution flow |
| `content-screenwriter.service.ts` | First stage AI: writes the story script from news |
| `social-post-agent.service.ts` | Agent: generates social media posts |
| `video-agent.service.ts` | Agent: generates video scripts |
| `longform-agent.service.ts` | Agent: generates long-form articles |
| `agent-config.service.ts` | Manages per-brand AI model and feature toggles |

## Responsibilities

1. **Content Pipeline Orchestration** (`processFilteredItem`):
   - Fetches `ContentAgentConfig` for the brand.
   - Calls **Screenwriter** to produce a `ContentScript`.
   - Executes active **Agents** in parallel (Promise.allSettled) to produce `AgentDraft` records.
   - Updates the source `Item` status to `WRITER_DONE`.

2. **Script Writing**: Uses AI to analyze the news item and brand profile to create a "source of truth" script containing the story arc, key points, tone, and CTA.

3. **Draft Generation**: Agents take the `ContentScript` and transform it into specific formats. Each draft is linked to the parent script.

4. **Review & Approval**: Drafts start in `PENDING` state and move through the review queue for human approval.

## Draft Content Lifecycle

```
Filtered Item
     │
     ▼
Content Script (Source of Truth)
     │
     ├──► Social Draft (PENDING) ──► APPROVED ──► PUBLISHED
     ├──► Video Draft (PENDING)  ──► APPROVED
     └──► Longform Draft (PENDING) ──► APPROVED
```

## AI Agent Configuration

Each brand can configure:
- Which agents are enabled (Social, Video, Longform).
- Which AI model each stage uses (Screenwriter, Curator, Agents).
- Specific parameters per format (e.g., video script duration, longform word count).

## Interactions With Other Modules

- **Content Intelligence**: Consumes `Item` records in `READY_FOR_AI` status.
- **Brand Module**: Uses `BrandProfile` for tone and audience context.
- **Publishing Module**: Approved drafts are handed over for platform-specific publishing.
- **Job Scheduling**: The pipeline is triggered on a per-brand schedule.

## Error Handling

- **Fault Isolation**: If one agent fails (e.g., rate limit), it does not cancel the other agents in the same script run.
- **Duplicate Protection**: Uses `contentHash` on `ContentScript` to avoid generating the same script twice for the same brand.
- **Validation**: Uses Zod to ensure AI output matches the internal data model before persistence.
