# Module: Auth

## Purpose

Handles all authentication and authorization concerns for both product users and internal system administrators. Implements two separate JWT-based identity systems with support for hybrid auth (Password, Magic Link, Google OAuth).

## Key Files

| File | Role |
|---|---|
| `auth.service.ts` | Product user registration, login, JWT issuing and verification |
| `magic-link.service.ts` | Magic link token generation, verification, and email dispatch |
| `google-oauth.service.ts` | Google ID token verification and user profile extraction |
| `internal-auth.service.ts` | Admin credential verification, admin JWT issuing |
| `hybrid-auth.routes.ts` | Unified routes for passwordless and OAuth login |

## Responsibilities

### Product Auth (Hybrid)

- **Traditional**: Hashes password with `bcrypt`, creates `User` record.
- **Magic Link**:
  - Request: Generates a 256-bit entropy token, hashes it for DB storage (`MagicLinkToken` table), and sends a verification URL via `EmailService`.
  - Verify: Validates the hash, checks expiry (15m), and marks as used. Issues a standard JWT on success.
- **Google OAuth**: Verifies the `idToken` from the frontend, matches `googleId` or `email`, and performs Just-In-Time (JIT) provisioning for new users.

### Internal Auth

- **Admin credentials**: Stored in environment variables (`ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`). Single superuser system.
- **Login**: Compares bcrypt hash against `ADMIN_PASSWORD_HASH`. Issues a JWT with `{ email }`.

## Middleware Layer

Two auth middleware functions are in `src/middleware/`:

| Middleware | File | Attaches to req |
|---|---|---|
| `requireProductAuth` | `product-auth.ts` | `req.v2User` (ProductJwtPayload) |
| `requireInternalAuth` | `internal-auth.ts` | `req.user`, `req.internalUser` |

**RBAC middleware:**
- `requireWorkspaceAccess(role)`: Checks `WorkspaceMember` status for `req.v2User.userId`.
- `requireBrandAccess(role)`: Resolves `workspaceId` from `brandId` and checks access.
- `authRateLimiter`: Express-rate-limit protection for login/request endpoints.

## Security Notes

- **Token Security**: Magic link tokens are hashed before storage to prevent leakage in case of DB compromise.
- **Rate Limiting**: Critical endpoints (magic link request, login) are protected by IP-based rate limiting.
- **Audit Trail**: Every auth success/failure is logged with `method`, `action`, and `ip`.

## Interactions With Other Modules

- All protected routes use the middleware functions.
- `MagicLinkService` depends on `EmailService` for outbound delivery.
