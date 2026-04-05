// Auth
export interface User {
    id: number;
    email: string;
    name?: string;
    createdAt: string;
}

export interface AuthResponse {
    token: string;
    user: User;
}

// Workspace
export type WorkspaceRole = 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER';

export interface Workspace {
    id: number;
    name: string;
    slug: string;
    createdAt: string;
    role?: WorkspaceRole;
}

export interface WorkspaceMember {
    id: number;
    userId: number;
    role: WorkspaceRole;
    user: { id: number; email: string; name?: string };
}

// Brand
export type BrandStatus = 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
export type SocialPlatform = 'X' | 'FACEBOOK' | 'LINKEDIN' | 'TIKTOK' | 'INSTAGRAM';

export interface Brand {
    id: number;
    workspaceId: number;
    name: string;
    websiteUrl?: string;
    industry?: string;
    timezone?: string;
    defaultLanguage: string;
    status: BrandStatus;
    createdAt: string;
    profile?: BrandProfile;
}

export interface BrandProfile {
    id: number;
    brandId: number;
    summary: string;
    targetAudience: Record<string, unknown>;
    valueProps: Record<string, unknown>;
    toneGuidelines: Record<string, unknown>;
    businessGoals: Record<string, unknown>;
    messagingAngles: Record<string, unknown>;
}

export interface KnowledgeDocument {
    id: number;
    brandId: number;
    title: string;
    sourceUrl?: string;
    content: string;
    docType?: string;
    createdAt: string;
}

// Onboarding
export interface OnboardingSession {
    id: number;
    brandId: number;
    transcript: Array<{ role: 'user' | 'assistant'; content: string }>;
    status: 'IN_PROGRESS' | 'COMPLETED';
    completedAt?: string;
    createdAt: string;
}

// Strategy
export type StrategyStatus = 'DRAFT' | 'ACTIVE' | 'SUPERSEDED' | 'ARCHIVED';
export type SlotStatus = 'PLANNED' | 'BRIEF_READY' | 'DRAFT_READY' | 'APPROVED' | 'SKIPPED';

export interface StrategyPlan {
    id: number;
    brandId: number;
    title: string;
    objective: string;
    status: StrategyStatus;
    startDate: string;
    endDate: string;
    cadenceConfig: Record<string, unknown>;
    weeklyThemes: Record<string, unknown>;
    createdAt: string;
    slots?: StrategySlot[];
}

export interface StrategySlot {
    id: number;
    strategyPlanId: number;
    brandId: number;
    channel: SocialPlatform;
    pillarId?: number;
    scheduledFor: string;
    funnelStage?: string;
    status: SlotStatus;
}

// Content
export type BriefStatus = 'DRAFT' | 'READY_FOR_REVIEW' | 'APPROVED' | 'REJECTED';
export type DraftStatus = 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'SCHEDULED' | 'PUBLISHED' | 'FAILED' | 'ARCHIVED';

export interface ContentBrief {
    id: number;
    brandId: number;
    strategySlotId?: number;
    title: string;
    objective?: string;
    keyAngle?: string;
    callToAction?: string;
    contentMode?: string;
    status: BriefStatus;
    createdAt: string;
    drafts?: ContentDraft[];
}

export interface ContentDraft {
    id: number;
    contentBriefId: number;
    platform: SocialPlatform;
    body: string;
    hook?: string;
    cta?: string;
    hashtags: string[];
    status: DraftStatus;
    version: number;
    createdAt: string;
    updatedAt: string;
}

export interface ReviewQueueItem {
    brief: ContentBrief;
    drafts: ContentDraft[];
}

// Publishing
export interface PublishJob {
    id: number;
    contentDraftId: number;
    platform: SocialPlatform;
    status: string;
    scheduledFor: string;
    executedAt?: string;
    errorMessage?: string;
    createdAt: string;
}

// Social Account
export interface SocialAccount {
    id: number;
    brandId: number;
    platform: SocialPlatform;
    accountName?: string;
    expiresAt?: string;
    status: string;
    createdAt: string;
}

// Pagination / API responses
export interface PaginatedResponse<T> {
    data: T[];
    total?: number;
    page?: number;
    limit?: number;
}
