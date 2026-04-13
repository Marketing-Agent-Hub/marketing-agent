# Frontend Type Definitions (Source of Truth)

Tài liệu này trích xuất các kiểu dữ liệu (Types/Interfaces) và Enum quan trọng từ Database Schema và Backend Logic. Việc tuân thủ chính xác các Definition này sẽ giúp AI Agent lập trình Frontend không bị lỗi sai lệch thuộc tính.

---

## 1. Hệ Thống Enum (Constants)

```typescript
export enum ItemStatus {
  NEW = 'NEW',
  EXTRACTED = 'EXTRACTED',
  FILTERED_OUT = 'FILTERED_OUT',
  READY_FOR_AI = 'READY_FOR_AI',
  CURATOR_DONE = 'CURATOR_DONE',      // Tương đương Stage A hoàn thành
  WRITER_DONE = 'WRITER_DONE',        // Tương đương Stage B hoàn thành
  USED = 'USED'
}

export enum SocialPlatform {
  X = 'X',
  FACEBOOK = 'FACEBOOK',
  LINKEDIN = 'LINKEDIN',
  TIKTOK = 'TIKTOK',
  INSTAGRAM = 'INSTAGRAM'
}

export enum WorkspaceRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  EDITOR = 'EDITOR',
  VIEWER = 'VIEWER'
}

export enum AgentDraftStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  PUBLISHED = 'PUBLISHED',
  REJECTED = 'REJECTED'
}

export enum StrategyStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  SUPERSEDED = 'SUPERSEDED',
  ARCHIVED = 'ARCHIVED'
}
```

---

## 2. Core Entities (Thực thể chính)

### User & Workspace
```typescript
interface User {
  id: number;
  email: string;
  name?: string;
  memberships: WorkspaceMember[];
}

interface Workspace {
  id: number;
  name: string;
  slug: string;
}

interface WorkspaceMember {
  id: number;
  workspaceId: number;
  userId: number;
  role: WorkspaceRole;
}
```

### Brand & Profile
```typescript
interface Brand {
  id: number;
  workspaceId: number;
  name: string;
  websiteUrl?: string;
  industry?: string;
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
  profile?: BrandProfile;
}

interface BrandProfile {
  brandId: number;
  summary: string;
  targetAudience: any; // JSON
  toneGuidelines: any; // JSON
  businessGoals: any;  // JSON
}
```

---

## 3. News & AI Pipeline (Luồng tin tức AI)

```typescript
interface Source {
  id: number;
  name: string;
  rssUrl?: string;
  type: 'RSS' | 'WEB_SCRAPER' | 'YOUTUBE';
  enabled: boolean;
  trustScore: number;
}

interface Item {
  id: number;
  brandId: number;
  sourceId: number;
  title: string;
  link: string;
  snippet?: string;
  contentHash: string;
  publishedAt?: string; // ISO Date string
  status: ItemStatus;
  article?: Article;
  aiResults: AiResult[];
}

interface Article {
  itemId: number;
  extractedContent: string;
  truncatedContent?: string;
  mainImageUrl?: string;
}

interface AiResult {
  id: number;
  itemId: number;
  stage: 'A' | 'B';
  isAllowed?: boolean;
  topicTags: string[];
  importanceScore?: number;
  oneLineSummary?: string;
  fullArticle?: string; // Nội dung bài viết Facebook (Stage B)
}
```

---

## 4. Marketing Agent & Strategy (Chiến lược & Đại lý nội dung)

```typescript
interface StrategyPlan {
  id: number;
  brandId: number;
  title: string;
  objective: string;
  status: StrategyStatus;
  startDate: string;
  endDate: string;
  slots: StrategySlot[];
}

interface StrategySlot {
  id: number;
  channel: SocialPlatform;
  scheduledFor: string;
  status: 'PLANNED' | 'BRIEF_READY' | 'DRAFT_READY' | 'APPROVED' | 'SKIPPED';
}

interface AgentDraft {
  id: string; // UUID
  brandId: number;
  agent: 'SOCIAL_POST' | 'VIDEO' | 'LONGFORM';
  format: 'FACEBOOK_POST' | 'TIKTOK_SCRIPT' | 'MEDIUM_ARTICLE';
  content: string;
  status: AgentDraftStatus;
  createdAt: string;
}
```

---

## 5. Quy tắc Quy đổi Kiểu dữ liệu (Notes for AI)

1.  **Dates:** Tất cả các định dạng `DateTime` trong Prisma schema sẽ trả về dưới dạng **ISO 8601 String** (`2026-04-12T00:00:00.000Z`) phía Frontend. Cần sử dụng thư viện `date-fns` hoặc `dayjs` để xử lý.
2.  **Optional Fields:** Các trường có dấu `?` trong Prisma (`String?`) có thể trả về `null` hoặc `undefined`. Frontend cần check null-safe khi render.
3.  **JSON Fields:** Các trường kiểu `Json` (như `targetAudience`) sẽ trả về dưới dạng Javascript Object/Array đã được parsed sẵn.
4.  **Numbers:** `Int` và `Float` đều được coi là kiểu `number` trong Typescript.
