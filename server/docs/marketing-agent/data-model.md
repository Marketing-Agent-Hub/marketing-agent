# Data Model

## Overview

The current data model changes the primary domain from `source -> item -> article -> ai_result` into a multi-tenant marketing workflow model.

## New Core Entities

### User
- account identity
- authentication subject

### Workspace
- tenant boundary
- owns brands, members, subscriptions, channels, content

### WorkspaceMember
- user to workspace relation
- role and permissions

### Brand
- a business or product identity inside a workspace
- stores business profile and operating status

### BrandKnowledgeDocument
- uploaded or imported business materials
- website pages, docs, notes, FAQs, product descriptions

### OnboardingSession
- conversational setup process
- stores answers and completion status

### BrandProfile
- normalized AI-derived understanding of the brand
- audience, positioning, tone, goals

### ContentPillar
- strategic content categories for a brand

### StrategyPlan
- 30-day or campaign-level strategy
- posting cadence, themes, goals

### StrategySlot
- a planned posting opportunity inside a strategy window

### SocialAccount
- connected channel account for a brand

### ContentBrief
- AI-generated idea and execution brief for one planned post

### ContentDraft
- editable generated content for a specific channel

### ContentApproval
- records approval, rejection, comments, and actor

### PublishJob
- execution unit for posting to a social channel

### PublishedPost
- result of a successful or failed publishing attempt

### PerformanceSnapshot
- engagement metrics for a published post at a point in time

### Recommendation
- AI-generated optimization suggestion based on performance and strategy

### AuditEvent
- security and workflow audit trail

## Proposed Prisma Models

The following is a target-level schema design, not final migration-ready code.

```prisma
model User {
  id           Int               @id @default(autoincrement())
  email        String            @unique
  name         String?
  passwordHash String?
  createdAt    DateTime          @default(now())
  updatedAt    DateTime          @updatedAt

  memberships  WorkspaceMember[]
}

model Workspace {
  id           Int               @id @default(autoincrement())
  name         String
  slug         String            @unique
  createdAt    DateTime          @default(now())
  updatedAt    DateTime          @updatedAt

  members      WorkspaceMember[]
  brands       Brand[]
}

model WorkspaceMember {
  id           Int               @id @default(autoincrement())
  workspaceId  Int
  userId       Int
  role         WorkspaceRole
  createdAt    DateTime          @default(now())

  workspace    Workspace         @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  user         User              @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([workspaceId, userId])
}

model Brand {
  id                Int                      @id @default(autoincrement())
  workspaceId       Int
  name              String
  websiteUrl        String?
  industry          String?
  timezone          String?
  defaultLanguage   String                  @default("en")
  status            BrandStatus             @default(ACTIVE)
  createdAt         DateTime                @default(now())
  updatedAt         DateTime                @updatedAt

  workspace         Workspace               @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  profile           BrandProfile?
  knowledgeDocs     BrandKnowledgeDocument[]
  pillars           ContentPillar[]
  strategies        StrategyPlan[]
  socialAccounts    SocialAccount[]
  briefs            ContentBrief[]
}

model BrandProfile {
  id                Int               @id @default(autoincrement())
  brandId           Int               @unique
  summary           String
  targetAudience    Json
  valueProps        Json
  toneGuidelines    Json
  businessGoals     Json
  messagingAngles   Json
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt

  brand             Brand             @relation(fields: [brandId], references: [id], onDelete: Cascade)
}

model StrategyPlan {
  id                Int               @id @default(autoincrement())
  brandId           Int
  title             String
  objective         String
  status            StrategyStatus    @default(DRAFT)
  startDate         DateTime
  endDate           DateTime
  cadenceConfig     Json
  weeklyThemes      Json
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt

  brand             Brand             @relation(fields: [brandId], references: [id], onDelete: Cascade)
  slots             StrategySlot[]
}

model StrategySlot {
  id                Int               @id @default(autoincrement())
  strategyPlanId    Int
  brandId           Int
  channel           SocialPlatform
  pillarId          Int?
  scheduledFor      DateTime
  funnelStage       String?
  status            SlotStatus        @default(PLANNED)
  createdAt         DateTime          @default(now())

  strategyPlan      StrategyPlan      @relation(fields: [strategyPlanId], references: [id], onDelete: Cascade)
}

model ContentBrief {
  id                Int               @id @default(autoincrement())
  brandId           Int
  strategySlotId    Int?
  title             String
  objective         String?
  keyAngle          String?
  callToAction      String?
  assetDirection    String?
  status            BriefStatus       @default(DRAFT)
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt

  brand             Brand             @relation(fields: [brandId], references: [id], onDelete: Cascade)
  drafts            ContentDraft[]
}

model ContentDraft {
  id                Int               @id @default(autoincrement())
  contentBriefId    Int
  platform          SocialPlatform
  body              String
  hook              String?
  cta               String?
  hashtags          String[]          @default([])
  status            DraftStatus       @default(DRAFT)
  version           Int               @default(1)
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt

  contentBrief      ContentBrief      @relation(fields: [contentBriefId], references: [id], onDelete: Cascade)
  approvals         ContentApproval[]
  publishJobs       PublishJob[]
}
```

## Recommended Enums

```prisma
enum WorkspaceRole {
  OWNER
  ADMIN
  EDITOR
  VIEWER
}

enum BrandStatus {
  ACTIVE
  PAUSED
  ARCHIVED
}

enum StrategyStatus {
  DRAFT
  ACTIVE
  SUPERSEDED
  ARCHIVED
}

enum SlotStatus {
  PLANNED
  BRIEF_READY
  DRAFT_READY
  APPROVED
  SKIPPED
}

enum BriefStatus {
  DRAFT
  READY_FOR_REVIEW
  APPROVED
  REJECTED
}

enum DraftStatus {
  DRAFT
  IN_REVIEW
  APPROVED
  REJECTED
  SCHEDULED
  PUBLISHED
  FAILED
  ARCHIVED
}

enum SocialPlatform {
  X
  FACEBOOK
  LINKEDIN
  TIKTOK
  INSTAGRAM
}
```

## Metadata and AI Tracking

Introduce a generic generation metadata model:

```prisma
model GenerationRun {
  id                Int        @id @default(autoincrement())
  workspaceId       Int?
  brandId           Int?
  workflow          String
  model             String?
  promptVersion     String?
  status            String
  promptTokens      Int?
  completionTokens  Int?
  totalTokens       Int?
  rawResponse       String?
  inputSnapshot     Json?
  outputSnapshot    Json?
  createdAt         DateTime   @default(now())
}
```

This replaces the overloaded role currently played by `AiResult`.

## Reuse and Migration Guidance

### Reuse as-is
- `SystemLog`
- `SystemMetric`
- `HealthCheck`
- `PerformanceTrace`
- `Setting`

### Migrate or deprecate
- `Source`
- `Item`
- `Article`
- `AiResult`

### Transitional approach
- keep legacy tables during migration
- introduce new marketing tables side by side
- move settings to namespaced keys such as `marketing.*` and `social.*`

## Indexing Recommendations

- `Workspace.slug`
- `WorkspaceMember(workspaceId, userId)`
- `Brand(workspaceId, status)`
- `StrategyPlan(brandId, status, startDate)`
- `StrategySlot(brandId, scheduledFor, channel)`
- `ContentDraft(status, updatedAt)`
- `PublishJob(status, scheduledFor)`
- `PublishedPost(externalPostId)`
- `PerformanceSnapshot(publishedPostId, capturedAt)`

## Data Integrity Rules

- every brand belongs to exactly one workspace
- every strategy belongs to exactly one brand
- every draft belongs to one brief and one platform
- only approved drafts can be scheduled
- published posts must always reference the originating draft
- analytics snapshots must be append-only
