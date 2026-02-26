# 📋 Todo List – AI Content Generation Pipeline (Phase 2)

**Goal**: Xây dựng pipeline tự động lấy RSS, phân tích bằng AI, và tạo draft bài viết cho Facebook

**Status**: NOT STARTED 🚧  
**Dependencies**: Phase 1 ✅ (Backend + Frontend Source Manager hoàn thành)  
**Estimated Duration**: 2-3 weeks  
**Last Updated**: February 27, 2026

---

## 📊 Overview – Phase 2 Components

```
RSS Sources (enabled=true)
    ↓
[1. RSS Ingest] → items table
    ↓
[2. Content Extraction] → articles table
    ↓
[3. Content Filtering] → Filter out trading/spam
    ↓
[4. AI Processing]
    ├─ Stage A (Cheap Filter) → ai_results (filter)
    └─ Stage B (Deep Summary) → ai_results (summary)
    ↓
[5. Digest Generation] → daily_posts (draft)
    ↓
[6. Human Approval] → Admin reviews via Web UI
    ↓
[7. Facebook Publishing] → Post to Facebook Page
```

---

## A. Database Schema Extensions

### A1. Create Prisma Models for Phase 2
- [ ] **Model: Item** (Raw RSS entries)
  ```prisma
  model Item {
    id                Int       @id @default(autoincrement())
    sourceId          Int
    source            Source    @relation(fields: [sourceId], references: [id], onDelete: Cascade)
    
    guid              String    // RSS guid or generated hash
    title             String
    link              String    @db.Text
    pubDate           DateTime?
    snippet           String?   @db.Text
    
    contentHash       String    // For deduplication
    
    status            ItemStatus @default(PENDING)
    
    createdAt         DateTime  @default(now())
    updatedAt         DateTime  @updatedAt
    
    article           Article?
    aiResult          AiResult?
    postItems         PostItem[]
    
    @@unique([sourceId, guid])
    @@unique([contentHash])
    @@index([status])
    @@index([createdAt])
  }
  
  enum ItemStatus {
    PENDING           // Vừa ingest, chưa xử lý
    EXTRACTED         // Đã extract content
    FILTERED_OUT      // Bị lọc bởi rules
    AI_STAGE_A_DONE   // Đã qua AI Stage A
    AI_STAGE_B_DONE   // Đã qua AI Stage B
    USED_IN_POST      // Đã được dùng trong post
    REJECTED          // Admin reject hoặc AI filter out
  }
  ```

- [ ] **Model: Article** (Extracted full content)
  ```prisma
  model Article {
    id                Int       @id @default(autoincrement())
    itemId            Int       @unique
    item              Item      @relation(fields: [itemId], references: [id], onDelete: Cascade)
    
    fullContent       String    @db.Text
    mainImageUrl      String?   @db.Text
    author            String?
    
    extractedAt       DateTime  @default(now())
    
    @@index([extractedAt])
  }
  ```

- [ ] **Model: AiResult** (AI processing output)
  ```prisma
  model AiResult {
    id                Int       @id @default(autoincrement())
    itemId            Int       @unique
    item              Item      @relation(fields: [itemId], references: [id], onDelete: Cascade)
    
    // Stage A - Cheap Filter
    stageAProcessedAt DateTime?
    isAllowed         Boolean?
    topicTags         String[]
    importanceScore   Int?      // 0-100
    oneLineSummary    String?   @db.Text
    
    // Stage B - Deep Summary
    stageBProcessedAt DateTime?
    summary           String?   @db.Text  // 2-3 câu
    bullets           String[]            // 3-5 bullets
    whyItMatters      String?   @db.Text  // Why it matters for OCVN
    riskFlags         String[]            // trading, price, speculation, etc
    suggestedHashtags String[]
    
    // AI metadata
    modelUsed         String?
    tokensUsed        Int?
    costEstimate      Float?
    
    createdAt         DateTime  @default(now())
    
    @@index([isAllowed])
    @@index([importanceScore])
  }
  ```

- [ ] **Model: DailyPost** (Draft posts for approval)
  ```prisma
  model DailyPost {
    id                Int       @id @default(autoincrement())
    
    postDate          DateTime  // Target publish date
    timeSlot          TimeSlot  // 08:00, 12:00, 18:30
    
    status            PostStatus @default(DRAFT)
    
    // Content
    hook              String    @db.Text
    bullets           String[]  // Each bullet has source link
    ocvnTake          String    @db.Text
    cta               String    @db.Text
    hashtags          String[]
    
    // Final rendered content (after approval/edit)
    finalContent      String?   @db.Text
    
    // Publishing
    fbPostId          String?   // Facebook post ID after publish
    publishedAt       DateTime?
    
    // Admin actions
    approvedBy        String?   // Admin email
    approvedAt        DateTime?
    rejectedBy        String?
    rejectedAt        DateTime?
    rejectionReason   String?   @db.Text
    
    createdAt         DateTime  @default(now())
    updatedAt         DateTime  @updatedAt
    
    postItems         PostItem[]
    
    @@unique([postDate, timeSlot])
    @@index([status])
    @@index([postDate])
  }
  
  enum TimeSlot {
    SLOT_08_00_A
    SLOT_08_00_B
    SLOT_12_00
    SLOT_18_30_A
    SLOT_18_30_B
  }
  
  enum PostStatus {
    DRAFT           // Waiting for approval
    APPROVED        // Admin approved, ready to publish
    PUBLISHED       // Posted to Facebook
    REJECTED        // Admin rejected
    FAILED          // Failed to publish
  }
  ```

- [ ] **Model: PostItem** (Link posts to items)
  ```prisma
  model PostItem {
    id                Int       @id @default(autoincrement())
    postId            Int
    post              DailyPost @relation(fields: [postId], references: [id], onDelete: Cascade)
    itemId            Int
    item              Item      @relation(fields: [itemId], references: [id], onDelete: Cascade)
    
    orderInPost       Int       // Thứ tự bullet trong post
    
    createdAt         DateTime  @default(now())
    
    @@unique([postId, itemId])
    @@index([postId])
    @@index([itemId])
  }
  ```

- [ ] Tạo migration `add_phase2_models`
- [ ] Run migration trong dev environment
- [ ] Generate Prisma client mới
- [ ] Update Source model với relation `items: Item[]`

---

## B. RSS Ingest Service

### B1. Setup RSS Fetcher
- [ ] **Cài dependencies**
  ```bash
  npm install --save fast-xml-parser node-fetch@2 cron
  npm install --save-dev @types/node-fetch @types/cron
  ```

- [ ] **Tạo `server/src/services/ingest.service.ts`**
  - [ ] Function `fetchEnabledSources()`: Get all enabled sources
  - [ ] Function `fetchRssFeed(url: string)`: Fetch RSS XML với timeout 15s
  - [ ] Function `parseRssItems(xml: string, feedType: 'RSS' | 'Atom')`: Parse items từ XML
  - [ ] Function `normalizeItem(rawItem, sourceId)`: Chuẩn hóa item data
  - [ ] Function `generateContentHash(title, link, pubDate)`: Hash để dedup
  - [ ] Function `saveItems(items: Item[])`: Upsert items vào DB (dedup by contentHash)

- [ ] **Tạo `server/src/jobs/ingest.job.ts`**
  - [ ] Setup cron job chạy mỗi source theo `fetchIntervalMinutes`
  - [ ] Implement job runner với error handling
  - [ ] Log ingest success/failure per source
  - [ ] Update source `lastFetchedAt`, `lastFetchStatus`

- [ ] **Add fields to Source model**
  ```prisma
  model Source {
    // ... existing fields
    lastFetchedAt     DateTime?
    lastFetchStatus   String?   // 'OK' | 'ERROR: ...'
    itemsCount        Int       @default(0) // Cached count
    items             Item[]
  }
  ```

- [ ] **Test RSS Ingest**
  - [ ] Test với 1 nguồn RSS thật
  - [ ] Verify deduplication hoạt động
  - [ ] Verify items lưu đúng vào DB
  - [ ] Test retry logic khi RSS fail

### B2. Content Extraction Service
- [ ] **Cài dependencies**
  ```bash
  npm install --save jsdom @mozilla/readability
  npm install --save-dev @types/jsdom
  ```

- [ ] **Tạo `server/src/services/extraction.service.ts`**
  - [ ] Function `fetchFullHtml(url: string)`: Fetch article HTML với timeout 10s
  - [ ] Function `extractMainContent(html: string, url: string)`: Dùng Readability để extract
  - [ ] Function `truncateContent(content: string, maxTokens: number)`: Cắt content cho AI
  - [ ] Function `processItem(itemId: number)`: Extract và save article

- [ ] **Tạo `server/src/jobs/extraction.job.ts`**
  - [ ] Cron job hoặc queue processor
  - [ ] Lấy items có status=PENDING
  - [ ] Extract content và save vào articles table
  - [ ] Update item status=EXTRACTED
  - [ ] Handle errors, retry logic

- [ ] **Test Content Extraction**
  - [ ] Test với URLs có full content
  - [ ] Test với URLs chỉ có excerpt
  - [ ] Verify Readability extract đúng main content
  - [ ] Test truncation logic

---

## C. Content Filtering Service

### C1. Rule-based Filtering
- [ ] **Tạo `server/src/services/filtering.service.ts`**
  - [ ] Load global deny keywords từ config
  - [ ] Load per-source deny keywords từ DB
  - [ ] Function `applyDenyKeywords(content: string, keywords: string[])`: Check keywords
  - [ ] Function `hasMarketContent(content: string)`: Detect giá/trading/kèo
  - [ ] Function `filterItem(itemId: number)`: Apply filters, return allow/deny + reason

- [ ] **Define global deny keywords**
  ```typescript
  // server/src/config/deny-keywords.ts
  export const DENY_KEYWORDS_EN = [
    'price', 'chart', 'trading', 'signal', 'pump', 'dump',
    'bullish', 'bearish', 'ATH', 'technical analysis', 'TA',
    'leverage', 'futures', 'liquidation', 'long position',
    'short position', 'entry', 'exit', 'buy signal', 'sell signal'
  ];
  
  export const DENY_KEYWORDS_VI = [
    'giá', 'kèo', 'tín hiệu', 'vào lệnh', 'chốt lời', 'cắt lỗ',
    'x2', 'x5', 'x10', 'bơm', 'xả', 'phân tích kỹ thuật',
    'đòn bẩy', 'phái sinh', 'hợp đồng tương lai', 'thanh lý',
    'sóng', 'mua vào', 'bán ra'
  ];
  ```

- [ ] **Tạo job áp dụng filters**
  - [ ] Lấy items có status=EXTRACTED
  - [ ] Apply filters
  - [ ] Nếu fail filter → status=FILTERED_OUT
  - [ ] Nếu pass filter → status=READY_FOR_AI

- [ ] **Test Filtering**
  - [ ] Test với content có trading keywords → bị filter
  - [ ] Test với content clean → pass filter
  - [ ] Test với per-source deny keywords

---

## D. AI Processing Service

### D1. Setup AI Provider
- [ ] **Chọn AI provider**
  - [ ] Option 1: OpenAI API (GPT-4o-mini cho Stage A, GPT-4 cho Stage B)
  - [ ] Option 2: Anthropic Claude API
  - [ ] Option 3: Local LLM (cost-effective nhưng cần setup)

- [ ] **Cài dependencies**
  ```bash
  npm install --save openai  # hoặc @anthropic-ai/sdk
  ```

- [ ] **Setup API key trong .env**
  ```
  OPENAI_API_KEY=sk-...
  AI_STAGE_A_MODEL=gpt-4o-mini
  AI_STAGE_B_MODEL=gpt-4o
  AI_MAX_TOKENS_STAGE_A=500
  AI_MAX_TOKENS_STAGE_B=1500
  ```

- [ ] **Tạo `server/src/config/ai.config.ts`**
  - [ ] Validate AI env vars
  - [ ] Export AI client instance

### D2. AI Stage A – Cheap Filter
- [ ] **Tạo `server/src/services/ai-stage-a.service.ts`**
  - [ ] Function `buildStageAPrompt(item, article)`: Tạo prompt
    ```typescript
    const prompt = `
    You are a content analyst for Open Campus Vietnam. Analyze this RSS article.
    
    Title: ${item.title}
    Source: ${source.name} (trust score: ${source.trustScore})
    Snippet: ${item.snippet}
    
    Tasks:
    1. Is this content ALLOWED? (NO if trading/price/market speculation)
    2. Extract topic tags (education, edtech, blockchain-tech, etc)
    3. Rate importance (0-100) for OCVN audience
    4. Write one-line summary in Vietnamese
    
    Output JSON:
    {
      "isAllowed": boolean,
      "topicTags": string[],
      "importanceScore": number,
      "oneLineSummary": string
    }
    `;
    ```
  - [ ] Function `callStageA(itemId)`: Call AI API, parse JSON response
  - [ ] Function `saveStageAResult(itemId, result)`: Lưu vào ai_results
  - [ ] Handle AI errors, retries, rate limits

- [ ] **Tạo job chạy Stage A**
  - [ ] Lấy items có status=READY_FOR_AI (đã pass rule filter)
  - [ ] Call Stage A cho từng item
  - [ ] Nếu isAllowed=false → status=REJECTED
  - [ ] Nếu isAllowed=true → status=AI_STAGE_A_DONE
  - [ ] Track token usage, cost

- [ ] **Test Stage A**
  - [ ] Test với clean content → isAllowed=true
  - [ ] Test với trading content → isAllowed=false
  - [ ] Verify JSON parsing hoạt động
  - [ ] Test rate limiting

### D3. AI Stage B – Deep Summary
- [ ] **Tạo `server/src/services/ai-stage-b.service.ts`**
  - [ ] Function `buildStageBPrompt(item, article, stageAResult)`: Tạo prompt
    ```typescript
    const prompt = `
    You are a content writer for Open Campus Vietnam. Create Vietnamese content.
    
    Article title: ${item.title}
    Source: ${source.name}
    One-line summary: ${aiResult.oneLineSummary}
    Full content: ${article.fullContent}
    
    Tasks:
    1. Write 2-3 sentence summary in Vietnamese
    2. Create 3-5 bullet points (key takeaways)
    3. Explain why this matters for OCVN community (builder vibe)
    4. Flag any risk content (trading, speculation, hype)
    5. Suggest 5-7 hashtags
    
    Style: Professional but youthful, builder mindset, no hype, no financial advice
    
    Output JSON:
    {
      "summary": string,
      "bullets": string[],
      "whyItMatters": string,
      "riskFlags": string[],
      "suggestedHashtags": string[]
    }
    `;
    ```
  - [ ] Function `callStageB(itemId)`: Call AI API với model mạnh hơn
  - [ ] Function `saveStageBResult(itemId, result)`: Update ai_results
  - [ ] Check cache: nếu contentHash đã có Stage B result → reuse

- [ ] **Tạo job chạy Stage B**
  - [ ] Lấy items có status=AI_STAGE_A_DONE và isAllowed=true
  - [ ] Call Stage B (expensive operation)
  - [ ] Check cache trước khi call AI
  - [ ] Update status=AI_STAGE_B_DONE
  - [ ] Track token usage, cost

- [ ] **Test Stage B**
  - [ ] Test với item đã qua Stage A
  - [ ] Verify Vietnamese output quality
  - [ ] Test caching logic
  - [ ] Verify không có trading language trong output

---

## E. Digest Generation Service

### E1. Selection Algorithm
- [ ] **Tạo `server/src/services/digest.service.ts`**
  - [ ] Function `selectItemsForSlot(targetDate, timeSlot)`: Chọn 6-10 items
    ```typescript
    // Algorithm:
    // 1. Get items có status=AI_STAGE_B_DONE, not used in any post
    // 2. Filter by pubDate (gần targetDate)
    // 3. Sort by importanceScore DESC
    // 4. Apply diversity penalty (avoid same source/topic)
    // 5. Apply trustScore weighting
    // 6. Select top 6-10 items
    ```
  - [ ] Function `generateDigestContent(items: Item[])`: Build post content
    ```typescript
    // Structure:
    // 1. Generate hook (catchy opening)
    // 2. Create bullets from items (each with source link)
    // 3. Generate OCVN take (builder perspective)
    // 4. Generate CTA (call to action)
    // 5. Combine hashtags (deduplicate)
    ```
  - [ ] Function `createDraft(targetDate, timeSlot, content)`: Save to daily_posts

- [ ] **Define generation rules**
  ```typescript
  // server/src/config/digest.config.ts
  export const DIGEST_RULES = {
    minItemsPerPost: 6,
    maxItemsPerPost: 10,
    timeSlotsPerDay: [
      { slot: TimeSlot.SLOT_08_00_A, targetTime: '08:00' },
      { slot: TimeSlot.SLOT_08_00_B, targetTime: '08:00' },
      { slot: TimeSlot.SLOT_12_00, targetTime: '12:00' },
      { slot: TimeSlot.SLOT_18_30_A, targetTime: '18:30' },
      { slot: TimeSlot.SLOT_18_30_B, targetTime: '18:30' },
    ],
    maxItemsFromSameSource: 2, // Diversity
    preferHighTrustScore: true,
    minImportanceScore: 40,
  };
  ```

- [ ] **Tạo job tạo drafts**
  - [ ] Cron chạy mỗi ngày vào 00:30 (tạo drafts cho ngày hôm sau)
  - [ ] Tạo 5 drafts cho 5 time slots
  - [ ] Liên kết items với posts qua post_items table
  - [ ] Update items status=USED_IN_POST

- [ ] **Test Digest Generation**
  - [ ] Test selection algorithm với dataset test
  - [ ] Verify diversity (không quá nhiều từ 1 source)
  - [ ] Verify Vietnamese output quality
  - [ ] Test edge case: không đủ items

### E2. Content Quality Check
- [ ] **Tạo `server/src/services/quality-check.service.ts`**
  - [ ] Function `checkPostQuality(post)`: Auto-check before saving draft
    ```typescript
    // Checks:
    // 1. Không có trading keywords
    // 2. Mỗi bullet có source link
    // 3. Length constraints (hook, cta, bullets)
    // 4. Hashtags count (3-7)
    // 5. Vietnamese language check
    ```
  - [ ] Function `flagIssues(post)`: Return quality issues array
  - [ ] Integrate vào digest generation

---

## F. Draft Review UI (Frontend)

### F1. Backend API for Drafts
- [ ] **Tạo `server/src/routes/drafts.routes.ts`**
  - [ ] `GET /drafts` - List all drafts (paginated, filtered by status/date)
  - [ ] `GET /drafts/:id` - Get single draft with linked items
  - [ ] `PATCH /drafts/:id` - Update draft content (admin edit)
  - [ ] `POST /drafts/:id/approve` - Approve draft
  - [ ] `POST /drafts/:id/reject` - Reject draft with reason
  - [ ] `POST /drafts/:id/publish` - Manually trigger publish

- [ ] **Tạo controllers & services**
  - [ ] `server/src/controllers/drafts.controller.ts`
  - [ ] `server/src/services/drafts.service.ts`
  - [ ] Zod schemas cho validation
  - [ ] Permissions check (requireAuth middleware)

- [ ] **Test API endpoints**
  - [ ] Test với Postman/curl
  - [ ] Verify draft edit preserves links
  - [ ] Test approve/reject workflows

### F2. Frontend Draft Management
- [ ] **Tạo `web/src/types/draft.ts`**
  ```typescript
  export interface DailyPost {
    id: number;
    postDate: string;
    timeSlot: TimeSlot;
    status: PostStatus;
    hook: string;
    bullets: string[];
    ocvnTake: string;
    cta: string;
    hashtags: string[];
    finalContent?: string;
    fbPostId?: string;
    publishedAt?: string;
    createdAt: string;
    updatedAt: string;
    postItems: PostItem[];
  }
  ```

- [ ] **Tạo `web/src/pages/DraftsPage.tsx`**
  - [ ] Table/grid view hiển thị drafts
  - [ ] Filter by status (DRAFT, APPROVED, PUBLISHED, REJECTED)
  - [ ] Filter by date
  - [ ] Sort by postDate, timeSlot
  - [ ] Preview post content

- [ ] **Tạo `web/src/components/DraftEditor.tsx`**
  - [ ] Modal/page để edit draft
  - [ ] Editable fields: hook, bullets, ocvnTake, cta, hashtags
  - [ ] Preview formatted post
  - [ ] Show source links for each bullet
  - [ ] Approve/Reject buttons
  - [ ] Rejection reason textarea

- [ ] **Tạo API client methods**
  - [ ] `web/src/lib/api-client.ts`
  - [ ] `getDrafts()`, `getDraft(id)`, `updateDraft(id, data)`
  - [ ] `approveDraft(id)`, `rejectDraft(id, reason)`

- [ ] **Test Draft UI**
  - [ ] Test edit draft content
  - [ ] Test approve workflow
  - [ ] Test reject workflow
  - [ ] Verify real-time updates (React Query invalidation)

---

## G. Facebook Publishing Service

### G1. Setup Facebook API
- [ ] **Setup Facebook App & Page**
  - [ ] Tạo Facebook App tại developers.facebook.com
  - [ ] Add "Pages" permission
  - [ ] Get Page Access Token (long-lived)
  - [ ] Test token với Graph API Explorer

- [ ] **Cài dependencies**
  ```bash
  npm install --save axios
  ```

- [ ] **Setup env vars**
  ```
  FACEBOOK_PAGE_ID=123456789
  FACEBOOK_PAGE_ACCESS_TOKEN=EAAxxxxx...
  FACEBOOK_GRAPH_API_VERSION=v18.0
  ```

- [ ] **Tạo `server/src/config/facebook.config.ts`**
  - [ ] Validate Facebook env vars
  - [ ] Export Facebook client instance

### G2. Publishing Service
- [ ] **Tạo `server/src/integrations/facebook.integration.ts`**
  - [ ] Function `postToPage(content: string)`: Post text to Facebook Page
    ```typescript
    // Graph API call:
    // POST /{page-id}/feed
    // params: { message: content, access_token: token }
    // returns: { id: postId }
    ```
  - [ ] Function `deletePost(postId: string)`: Delete post (nếu cần)
  - [ ] Function `getPostStats(postId: string)`: Get engagement metrics
  - [ ] Handle errors, retries, rate limits

- [ ] **Tạo `server/src/services/publisher.service.ts`**
  - [ ] Function `publishDraft(draftId: number)`: Main publish flow
    ```typescript
    // 1. Load draft, verify status=APPROVED
    // 2. Format content (markdown → plain text with links)
    // 3. Call Facebook API
    // 4. Save fbPostId, update status=PUBLISHED
    // 5. Log publish success
    ```
  - [ ] Function `retryFailedPublish(draftId: number)`: Retry logic

- [ ] **Tạo job auto-publish**
  - [ ] Cron chạy mỗi 5 phút
  - [ ] Lấy drafts có status=APPROVED và postDate <= now
  - [ ] Group by timeSlot, chỉ publish đúng time
  - [ ] Call publishDraft cho từng draft
  - [ ] Handle errors, mark status=FAILED

- [ ] **Test Publishing**
  - [ ] Test với Facebook Page test
  - [ ] Verify post content formatting
  - [ ] Test retry logic
  - [ ] Test error handling (invalid token, rate limit)

### G3. Publishing UI
- [ ] **Add publish controls to DraftsPage**
  - [ ] "Publish Now" button (manual trigger)
  - [ ] "Schedule Publish" button (update postDate/timeSlot)
  - [ ] Show publish status badge
  - [ ] Show Facebook post link (nếu đã publish)

- [ ] **Tạo publish confirmation dialog**
  - [ ] Preview content before publish
  - [ ] Confirm action
  - [ ] Show success/error feedback

---

## H. Monitoring & Analytics

### H1. Basic Metrics
- [ ] **Tạo `server/src/routes/analytics.routes.ts`**
  - [ ] `GET /analytics/overview` - Stats tổng quan
    ```typescript
    {
      totalSources: number,
      enabledSources: number,
      totalItems: number,
      itemsToday: number,
      draftsToday: number,
      publishedToday: number,
      aiCostToday: number,
    }
    ```
  - [ ] `GET /analytics/sources` - Stats per source
  - [ ] `GET /analytics/ai-usage` - AI token usage, cost
  - [ ] `GET /analytics/posts` - Post engagement (from Facebook)

- [ ] **Tạo dashboard UI**
  - [ ] `web/src/pages/DashboardPage.tsx`
  - [ ] Display key metrics
  - [ ] Charts (số items, posts, cost theo thời gian)
  - [ ] Source health status

### H2. Logging & Errors
- [ ] **Setup structured logging**
  - [ ] Sử dụng Winston hoặc Pino
  - [ ] Log levels: error, warn, info, debug
  - [ ] Log format: JSON với timestamp, level, context

- [ ] **Error tracking**
  - [ ] Log errors vào file
  - [ ] (Optional) Setup Sentry hoặc error tracking service
  - [ ] Alert admin khi có error (email/Slack)

---

## I. Testing & Quality Assurance

### I1. Unit Tests
- [ ] **Test services chính**
  - [ ] Test ingest.service.ts (parse RSS)
  - [ ] Test filtering.service.ts (deny keywords)
  - [ ] Test digest.service.ts (selection algorithm)
  - [ ] Test quality-check.service.ts
  - [ ] Vitest + mock DB calls

### I2. Integration Tests
- [ ] **Test end-to-end flows**
  - [ ] Ingest → Extract → Filter → AI → Digest
  - [ ] Draft → Approve → Publish
  - [ ] Test với real RSS feeds (test mode)
  - [ ] Mock AI API calls (cost control)

### I3. Manual Testing
- [ ] **Test với production-like data**
  - [ ] Add 5-10 real RSS sources
  - [ ] Run ingest job
  - [ ] Verify items saved correctly
  - [ ] Run AI pipeline (với test API key)
  - [ ] Generate drafts
  - [ ] Review & approve drafts in UI
  - [ ] Test publish to Facebook test page

---

## J. Deployment & Operations

### J1. Environment Setup
- [ ] **Production env vars**
  - [ ] All API keys (OpenAI, Facebook)
  - [ ] Database URL (production)
  - [ ] CORS origin (production frontend URL)
  - [ ] Admin credentials

- [ ] **Database migrations**
  - [ ] Run migrations in production
  - [ ] Backup before migration

### J2. Cron Jobs Setup
- [ ] **Setup job scheduler**
  - [ ] Option 1: node-cron trong app
  - [ ] Option 2: System cron (crontab)
  - [ ] Option 3: Cloud scheduler (AWS EventBridge, GCP Scheduler)

- [ ] **Configure jobs**
  - [ ] RSS ingest: mỗi source theo fetchIntervalMinutes
  - [ ] Content extraction: mỗi 5 phút
  - [ ] AI Stage A: mỗi 10 phút
  - [ ] AI Stage B: mỗi 15 phút
  - [ ] Digest generation: mỗi ngày 00:30
  - [ ] Auto-publish: mỗi 5 phút

### J3. Monitoring
- [ ] **Health checks**
  - [ ] `GET /health` endpoint
  - [ ] Check DB connection
  - [ ] Check external APIs (AI, Facebook)

- [ ] **Alerts**
  - [ ] Alert khi job fail
  - [ ] Alert khi AI cost vượt threshold
  - [ ] Alert khi publish fail

---

## K. Documentation

### K1. Update Documentation
- [ ] **Update README.md**
  - [ ] Phase 2 status
  - [ ] New features overview
  - [ ] Setup instructions for Phase 2

- [ ] **Create PHASE2.md**
  - [ ] Detailed architecture
  - [ ] AI pipeline explanation
  - [ ] Digest generation rules
  - [ ] Facebook integration guide

- [ ] **API Documentation**
  - [ ] Update API.md với drafts endpoints
  - [ ] Update DATABASE.md với new models

### K2. AI Prompts Documentation
- [ ] **Create AI_PROMPTS.md**
  - [ ] Stage A prompt template
  - [ ] Stage B prompt template
  - [ ] Best practices
  - [ ] Examples của good/bad outputs

---

## L. Cost Optimization

### L1. Caching Strategy
- [ ] **Implement content hash caching**
  - [ ] Check cache before Stage A
  - [ ] Check cache before Stage B
  - [ ] Store results keyed by contentHash

- [ ] **Implement deduplication**
  - [ ] Same article from multiple sources → process once
  - [ ] Updated articles → check if content significantly changed

### L2. AI Cost Monitoring
- [ ] **Track token usage**
  - [ ] Log tokens per request
  - [ ] Daily/monthly cost reports
  - [ ] Alert when approaching budget

- [ ] **Optimize prompts**
  - [ ] Minimize token usage
  - [ ] Use cheaper models where possible
  - [ ] Batch processing where applicable

---

## M. Definition of Done (Phase 2)

### Functional Requirements ✅
- [ ] RSS ingest hoạt động với 10+ nguồn
- [ ] Content extraction thành công với >90% articles
- [ ] Rule-based filtering loại bỏ trading content
- [ ] AI Stage A xử lý items với isAllowed accuracy >95%
- [ ] AI Stage B tạo Vietnamese content chất lượng cao
- [ ] Digest generation tạo 5 drafts/day đúng format
- [ ] Admin có thể review/edit/approve drafts qua UI
- [ ] Auto-publish posts đến Facebook đúng time slots
- [ ] Zero trading/price content trong published posts

### Non-functional Requirements ✅
- [ ] Ingest không block server (<1% CPU usage)
- [ ] AI processing có retry logic, không crash
- [ ] Token usage được track và optimize
- [ ] Pipeline xử lý >100 items/day
- [ ] Drafts được tạo trước 12h so với publish time
- [ ] Publish success rate >95%

### Quality Gates ✅
- [ ] Unit tests coverage >70%
- [ ] Integration tests pass (ingest → publish)
- [ ] ESLint pass (0 errors)
- [ ] TypeScript strict mode (0 errors)
- [ ] Manual testing với real data (5 days)
- [ ] Security review (no exposed secrets, safe AI prompts)

---

## 🚀 Next Steps After Phase 2

1. **Phase 4: Advanced Features**
   - Auto-disable low-quality sources
   - Learn from admin edits (improve prompts)
   - Multi-language support
   - Advanced analytics dashboard

2. **Phase 5: Scaling**
   - Horizontal scaling with queues (Bull/BullMQ)
   - Redis caching
   - CDN for images
   - Load balancing

3. **Phase 6: Monetization**
   - Sponsored content slots (clearly labeled)
   - API for partners
   - Newsletter integration

---

**Estimated Timeline**: 2-3 weeks full-time work

**Priority Order**:
1. A → B → C (Database + Ingest + Filtering) - 2-3 days
2. D (AI Pipeline) - 4-5 days
3. E (Digest Generation) - 2-3 days
4. F (Draft Review UI) - 2-3 days
5. G (Facebook Publishing) - 2 days
6. H → I → J (Monitoring + Testing + Deployment) - 2-3 days

**Recommended Approach**: Build incrementally, test each component before moving to next.

**Last Updated**: February 27, 2026
