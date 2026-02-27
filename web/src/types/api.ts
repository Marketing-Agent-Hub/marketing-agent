// API Types matching backend

export type SourceLang = 'VI' | 'EN' | 'MIXED';
export type ValidationStatus = 'OK' | 'FAILED';

export interface Source {
    id: number;
    name: string;
    rssUrl: string;
    siteUrl: string | null;
    lang: SourceLang;
    topicTags: string[];
    trustScore: number;
    enabled: boolean;
    fetchIntervalMinutes: number;
    denyKeywords: string[];
    notes: string | null;
    lastValidatedAt: string | null;
    lastValidationStatus: ValidationStatus | null;
    createdAt: string;
    updatedAt: string;
}

export interface CreateSourceInput {
    name: string;
    rssUrl: string;
    siteUrl?: string;
    lang?: SourceLang;
    topicTags?: string[];
    trustScore?: number;
    enabled?: boolean;
    fetchIntervalMinutes?: number;
    denyKeywords?: string[];
    notes?: string;
}

export interface UpdateSourceInput {
    name?: string;
    rssUrl?: string;
    siteUrl?: string;
    lang?: SourceLang;
    topicTags?: string[];
    trustScore?: number;
    enabled?: boolean;
    fetchIntervalMinutes?: number;
    denyKeywords?: string[];
    notes?: string;
}

export interface LoginInput {
    email: string;
    password: string;
}

export interface LoginResponse {
    token: string;
    email: string;
}

export interface UserResponse {
    email: string;
}

export interface RSSValidationResult {
    ok: boolean;
    type?: 'RSS' | 'Atom';
    title?: string;
    itemsCount?: number;
    error?: string;
}

export type ApiErrorCode =
    | 'VALIDATION_ERROR'
    | 'UNAUTHORIZED'
    | 'NOT_FOUND'
    | 'FORBIDDEN'
    | 'INTERNAL';

export interface ApiError {
    code: ApiErrorCode;
    message: string;
    details?: unknown;
}

export interface ApiErrorResponse {
    error: ApiError;
}

// Draft/Post Types
export type TimeSlot = 'MORNING_1' | 'MORNING_2' | 'NOON' | 'EVENING_1' | 'EVENING_2';
export type PostStatus = 'DRAFT' | 'APPROVED' | 'REJECTED' | 'POSTED';
export type ItemStatus = 'NEW' | 'EXTRACTED' | 'FILTERED_OUT' | 'READY_FOR_AI' | 'AI_STAGE_A_DONE' | 'AI_STAGE_B_DONE' | 'USED_IN_POST' | 'REJECTED';

export interface AiResult {
    id: number;
    itemId: number;
    stage: string;
    summary: string | null;
    bullets: string[];
    whyItMatters: string | null;
    suggestedHashtags: string[];
    createdAt: string;
}

export interface Article {
    id: number;
    itemId: number;
    extractedContent: string;
    mainImageUrl: string | null;
}

export interface Item {
    id: number;
    sourceId: number;
    title: string;
    link: string;
    snippet: string | null;
    status: ItemStatus;
    publishedAt: string | null;
    source: Source;
    article: Article | null;
    aiResults: AiResult[];
}

export interface PostItem {
    id: number;
    postId: number;
    itemId: number;
    item: Item;
}

export interface DailyPost {
    id: number;
    targetDate: string;
    timeSlot: TimeSlot;
    content: string;
    hookText: string | null;
    bulletsText: string | null;
    ocvnTakeText: string | null;
    ctaText: string | null;
    hashtags: string[];
    status: PostStatus;
    editedContent: string | null;
    rejectionReason: string | null;
    fbPostId: string | null;
    fbPostUrl: string | null;
    postedAt: string | null;
    createdAt: string;
    updatedAt: string;
    postItems: PostItem[];
}

export interface UpdateDraftInput {
    editedContent?: string;
    hookText?: string;
    bulletsText?: string;
    ocvnTakeText?: string;
    ctaText?: string;
    hashtags?: string[];
}

export interface RejectDraftInput {
    rejectionReason: string;
}

export interface GetDraftsQuery {
    status?: PostStatus;
    targetDate?: string;
    timeSlot?: TimeSlot;
}
