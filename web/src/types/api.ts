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

// Stats Types
export interface PipelineStats {
    items: {
        total: number;
        byStatus: {
            NEW: number;
            EXTRACTED: number;
            FILTERED_OUT: number;
            READY_FOR_AI: number;
            AI_STAGE_A_DONE: number;
            AI_STAGE_B_DONE: number;
            USED_IN_POST: number;
            REJECTED: number;
        };
        recent24h: number;
    };
    posts: {
        total: number;
        byStatus: {
            DRAFT: number;
            APPROVED: number;
            REJECTED: number;
            POSTED: number;
        };
        recent7days: number;
        today: number;
    };
    sources: {
        total: number;
        enabled: number;
        disabled: number;
    };
}

export interface RecentActivity {
    items: {
        id: number;
        title: string;
        source: string;
        status: ItemStatus;
        createdAt: string;
    }[];
    posts: {
        id: number;
        targetDate: string;
        timeSlot: TimeSlot;
        status: PostStatus;
        createdAt: string;
    }[];
}

export interface Bottlenecks {
    bottlenecks: string[];
}

// Monitoring Types
export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface SystemLog {
    id: number;
    level: LogLevel;
    message: string;
    meta?: Record<string, any>;
    traceId?: string;
    spanId?: string;
    timestamp: string;
}

export interface LogStats {
    level: LogLevel;
    count: number;
}

export interface SystemMetric {
    id: number;
    name: string;
    value: number;
    unit?: string;
    tags?: Record<string, any>;
    timestamp: string;
}

export interface MetricStats {
    name: string;
    count: number;
    avg: number;
    min: number;
    max: number;
    sum: number;
}

export interface HealthCheck {
    id: number;
    service: string;
    status: 'UP' | 'DOWN' | 'DEGRADED';
    responseTime?: number;
    message?: string;
    metadata?: Record<string, any>;
    timestamp: string;
}

export interface HealthStatus {
    overall: 'UP' | 'DOWN' | 'DEGRADED';
    services: Array<{
        service: string;
        status: 'UP' | 'DOWN' | 'DEGRADED';
        lastCheck: string;
        responseTime?: number;
    }>;
}

export interface PerformanceTrace {
    id: number;
    traceId: string;
    spanId: string;
    name: string;
    duration: number;
    status: 'success' | 'error';
    metadata?: Record<string, any>;
    timestamp: string;
}

export interface TraceStats {
    name: string;
    count: number;
    avgDuration: number;
    minDuration: number;
    maxDuration: number;
    p50: number;
    p95: number;
    p99: number;
}

export interface MonitoringOverview {
    health: HealthStatus;
    logs: {
        total: number;
        byLevel: LogStats[];
        recentErrors: number;
    };
    metrics: {
        total: number;
        recentCount: number;
    };
    traces: {
        total: number;
        avgDuration: number;
        slowCount: number;
    };
    timestamp: string;
}

export interface GetLogsQuery {
    level?: LogLevel;
    startDate?: string;
    endDate?: string;
    traceId?: string;
    limit?: number;
    offset?: number;
}

export interface GetMetricsQuery {
    name?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
}

export interface GetTracesQuery {
    name?: string;
    minDuration?: number;
    status?: 'success' | 'error';
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
}
