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
