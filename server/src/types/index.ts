export interface ApiError {
  code: 'VALIDATION_ERROR' | 'UNAUTHORIZED' | 'NOT_FOUND' | 'INTERNAL' | 'FORBIDDEN' | 'CONFLICT';
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

// Extend Express Request to include monitoring flags
declare module 'express-serve-static-core' {
  interface Request {
    errorLogged?: boolean;
  }
}

