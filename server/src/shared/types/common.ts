/**
 * Shared TypeScript types used across multiple domains.
 * Requirements: 9.1
 */

export interface PaginationParams {
    page: number;
    pageSize: number;
}

export interface PaginatedResult<T> {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
}

export interface ErrorResponse {
    error: {
        code: string;
        message: string;
        statusCode: number;
        details?: unknown;
    };
}
