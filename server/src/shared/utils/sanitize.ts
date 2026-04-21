/**
 * Redacts sensitive fields from objects before logging.
 * Requirements: 11.5
 */

const SENSITIVE_FIELDS = new Set([
    'password',
    'passwordHash',
    'token',
    'accessToken',
    'refreshToken',
    'secret',
    'apiKey',
    'creditCard',
    'cardNumber',
    'cvv',
    'stripeSecretKey',
    'tokenHash',
]);

/**
 * Returns a shallow copy of `obj` with sensitive fields replaced by '[REDACTED]'.
 * Non-object values are returned as-is.
 *
 * Feature: server-architecture-refactor, Property 8: Log Sanitizer — Sensitive Field Redaction
 */
export function sanitize<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
        return obj;
    }

    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
        result[key] = SENSITIVE_FIELDS.has(key) ? '[REDACTED]' : value;
    }
    return result as T;
}
