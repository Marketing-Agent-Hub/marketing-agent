export interface ApiError {
  code: 'VALIDATION_ERROR' | 'UNAUTHORIZED' | 'NOT_FOUND' | 'INTERNAL' | 'FORBIDDEN';
  message: string;
  details?: unknown;
}

export interface ApiErrorResponse {
  error: ApiError;
}

export interface JwtPayload {
  email: string;
  iat: number;
  exp: number;
}

export interface RequestUser {
  email: string;
}
