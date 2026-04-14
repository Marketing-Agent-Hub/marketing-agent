// src/types/index.ts

export type SystemRole = 'USER' | 'ADMIN';
export type WorkspaceRole = 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER';
export type SocialPlatform = 'X' | 'FACEBOOK' | 'LINKEDIN' | 'TIKTOK' | 'INSTAGRAM';

export type ItemStatus =
    | 'NEW'
    | 'EXTRACTED'
    | 'FILTERED_OUT'
    | 'READY_FOR_AI'
    | 'CURATOR_DONE'
    | 'WRITER_DONE'
    | 'USED';

export type AgentDraftStatus = 'PENDING' | 'APPROVED' | 'PUBLISHED' | 'REJECTED';
export type StrategyStatus = 'DRAFT' | 'ACTIVE' | 'SUPERSEDED' | 'ARCHIVED';
export type SlotStatus = 'PLANNED' | 'BRIEF_READY' | 'DRAFT_READY' | 'APPROVED' | 'SKIPPED';

export interface AppTokenPayload {
    userId: number;
    email: string;
    systemRole?: SystemRole;
    iat: number;
    exp: number;
}

export interface User {
    id: number;
    email: string;
    name?: string;
    systemRole: SystemRole;
}

export interface Workspace {
    id: number;
    name: string;
    slug: string;
    role: WorkspaceRole;
}

export interface Brand {
    id: number;
    workspaceId: number;
    name: string;
    websiteUrl?: string;
    industry?: string;
    status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
    profile?: BrandProfile;
}

export interface BrandProfile {
    brandId: number;
    summary: string;
    targetAudience: unknown;
    toneGuidelines: unknown;
    businessGoals: unknown;
}

export interface StrategyPlan {
    id: number;
    brandId: number;
    title: string;
    objective: string;
    status: StrategyStatus;
    startDate: string;
    endDate: string;
    slots: StrategySlot[];
}

export interface StrategySlot {
    id: number;
    channel: SocialPlatform;
    scheduledFor: string;
    status: SlotStatus;
}

export interface ContentDraft {
    id: string;
    brandId: number;
    content: string;
    status: AgentDraftStatus;
    brief?: ContentBrief;
    createdAt: string;
}

export interface ContentBrief {
    id: string;
    title: string;
    objective: string;
    keyAngle: string;
    callToAction: string;
    sourceArticle?: { extractedContent: string; mainImageUrl?: string };
}

export interface PublishJob {
    id: string;
    brandId: number;
    channel: SocialPlatform;
    scheduledFor: string;
    status: 'SCHEDULED' | 'PUBLISHED' | 'FAILED';
    errorMessage?: string;
    thumbnailUrl?: string;
}

export interface BrandSource {
    id: number;
    name: string;
    rssUrl?: string;
    type: 'RSS' | 'WEB_SCRAPER' | 'YOUTUBE';
    enabled: boolean;
    lastFetchedAt?: string;
    lastFetchSuccess?: boolean;
}

export interface FilterProfile {
    mode: string;
    similarityThreshold: number;
    topicTags: string[];
}

export interface PendingSource {
    id: number;
    name: string;
    url: string;
    sampleHeadlines: string[];
    relevanceScore: number;
}

export interface MonitorOverview {
    totalApiCalls: number;
    errorRate: number;
    ingestionRunCount: number;
    pipelineItemsProcessed: number;
}

export interface HealthStatus {
    db: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
    aiApi: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
    server: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
}

export interface LogEntry {
    id: string;
    timestamp: string;
    level: 'INFO' | 'DEBUG' | 'WARN' | 'ERROR';
    service: string;
    message: string;
    payload?: unknown;
}
