/**
 * Base class for all application errors.
 * Requirements: 7.1
 */
export class AppError extends Error {
    constructor(
        public readonly statusCode: number,
        public readonly code: string,
        message: string,
    ) {
        super(message);
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}

// ─── Common HTTP errors ───────────────────────────────────────────────────────

export class NotFoundError extends AppError {
    constructor(message = 'Resource not found') {
        super(404, 'NOT_FOUND', message);
    }
}

export class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized') {
        super(401, 'UNAUTHORIZED', message);
    }
}

export class ForbiddenError extends AppError {
    constructor(message = 'Forbidden') {
        super(403, 'FORBIDDEN', message);
    }
}

export class ValidationError extends AppError {
    constructor(message = 'Validation failed', public readonly details?: unknown) {
        super(422, 'VALIDATION_ERROR', message);
    }
}

export class ConflictError extends AppError {
    constructor(message = 'Conflict') {
        super(409, 'CONFLICT', message);
    }
}

// ─── Domain-specific errors ───────────────────────────────────────────────────

/** Thrown when a top-up amount is below the minimum threshold. Requirements: 3.5 */
export class InvalidTopUpAmountError extends AppError {
    constructor(message = 'Top-up amount is below the minimum threshold') {
        super(400, 'INVALID_AMOUNT', message);
    }
}

/** Thrown when Stripe is not configured but a Stripe operation is attempted. */
export class StripeFeatureDisabledError extends AppError {
    constructor(message = 'Stripe payments are not configured') {
        super(503, 'STRIPE_DISABLED', message);
    }
}

/** Thrown when an unknown job type is passed to JobOrchestrator. Requirements: 4.5 */
export class UnknownJobTypeError extends AppError {
    constructor(message = 'Unknown job type') {
        super(400, 'UNKNOWN_JOB_TYPE', message);
    }
}
