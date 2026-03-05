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
    lastFetchedAt: string | null;
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

export interface GetSourcesQuery {
    limit?: number;
    offset?: number;
    search?: string;
    enabled?: boolean;
    lang?: SourceLang;
    minTrustScore?: number;
    sortBy?: 'name' | 'trustScore' | 'createdAt' | 'enabled';
    sortOrder?: 'asc' | 'desc';
}

export interface ExportSourcesResponse {
    sources: Source[];
    exportedAt: string;
    count: number;
}

export interface LoginInput {
    email: string;
    password: string;
}

export interface User {
    id: number;
    email: string;
    role: 'ADMIN' | 'USER';
    createdAt: string;
}

export interface LoginResponse {
    token: string;
    email: string;
}

export interface UserResponse {
    id: number;
    email: string;
    role: 'ADMIN' | 'USER';
    createdAt: string;
}

export interface RSSValidationResult {
    valid: boolean;
    metadata?: {
        title: string;
        description?: string;
        itemCount: number;
        link: string;
    };
    error?: string;
}

export interface ExportSourcesResponse {
    sources: Source[];
    exportedAt: string;
    count: number;
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

// Monitoring Types
export type LogLevel = 'TRACE' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';

export interface SystemLog {
    id: number;
    level: LogLevel;
    message: string;
    meta?: Record<string, any>;
    traceId?: string;
    spanId?: string;
    createdAt: string;
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
    createdAt: string;
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
    createdAt: string;
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
    createdAt: string;
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
    search?: string;
}

export interface GetMetricsQuery {
    name?: string;
    metric?: string;
    from?: string;
    to?: string;
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

// Item Types
export type ItemStatus = 'NEW' | 'EXTRACTED' | 'FILTERED_OUT' | 'READY_FOR_AI' | 'AI_STAGE_A_DONE' | 'AI_STAGE_B_DONE';

export interface Article {
    id: number;
    itemId: number;
    fullHtml?: string;
    extractedContent: string;
    truncatedContent?: string;
    mainImageUrl?: string;
    imageList?: string[];
    createdAt: string;
    updatedAt: string;
}

export interface AiResult {
    id: number;
    itemId: number;
    stage: string; // "A" or "B"
    // Stage A
    isAllowed?: boolean | null;
    topicTags?: string[];
    importanceScore?: number | null;
    oneLineSummary?: string | null;
    // Stage B
    summary?: string;
    bullets?: string[];
    whyItMatters?: string;
    riskFlags?: string[];
    suggestedHashtags?: string[];
    fullArticle?: string | null;
    // Metadata
    model?: string;
    promptTokens?: number | null;
    completionTokens?: number | null;
    totalTokens?: number | null;
    rawResponse?: string | null;
    createdAt: string;
}

export interface Item {
    id: number;
    sourceId: number;
    guid?: string;
    title: string;
    link: string;
    snippet?: string;
    contentHash: string;
    publishedAt?: string;
    status: ItemStatus;
    filterReason?: string;
    createdAt: string;
    updatedAt: string;
    source?: {
        id: number;
        name: string;
        trustScore?: number;
    };
    article?: Article;
    aiResults?: AiResult[];
    postItems?: any[];
}

export interface PostItem {
    id: number;
    postId: number;
    itemId: number;
    item: Item;
}

export interface ItemsStats {
    data: {
        byStatus: Record<string, number>;
        recentCount: number;
        filteredCount: number;
        rejectedCount: number;
        total: number;
    }
}

export interface GetItemsQuery {
    status?: ItemStatus;
    sourceId?: number;
    limit?: number;
    offset?: number;
    search?: string;
}

export interface ReadyItem {
    id: number;
    title: string;
    link: string;
    publishedAt?: string;
    createdAt?: string;
    importanceScore?: number;
    topicTags: string[];
    oneLineSummary?: string;
    fullArticle?: string;
    mainImageUrl?: string;
    imageList?: string[];
    aiModel?: string;
    aiProcessedAt?: string;
    source: {
        id: number;
        name: string;
        trustScore: number;
    };
}

export interface GetReadyItemsQuery {
    sortBy?: 'importance' | 'date' | 'recent';
    limit?: number;
    offset?: number;
    sourceId?: number;
    topicTag?: string;
    fromDate?: string;
    toDate?: string;
}
