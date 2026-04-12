# Module: Auth

## Purpose

Handles all authentication and authorization concerns for both product users and internal system administrators. Implements two separate JWT-based identity systems.

## Key Files

| File | Role |
|---|---|
| `auth.service.ts` | Product user registration, login, JWT issuing and verification |
| `auth.controller.ts` | HTTP handlers for product auth endpoints |
| `auth.routes.ts` | Product auth route definitions |
| `internal-auth.service.ts` | Admin credential verification, admin JWT issuing |
| `internal-auth.controller.ts` | HTTP handler for internal login |
| `internal-auth.schema.ts` | Zod validation schema for internal login body |

## Responsibilities

### Product Auth
- **Registration**: Hashes password with `bcrypt`, creates `User` record.
- **Login**: Compares `bcrypt` hash, issues JWT signed with `JWT_SECRET` containing `{ userId, email }`.
- **Token verification**: `verifyToken()` uses `jsonwebtoken.verify()`. Returns `null` on failure (never throws).

### Internal Auth
- **Admin credentials**: Stored in environment variables (`ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`). There is no `admin` table — a single superuser.
- **Login**: Compares bcrypt hash against `ADMIN_PASSWORD_HASH`. Issues a JWT with `{ email }`. Same `JWT_SECRET` used as product auth.
- **Token verification**: Identical JWT verification flow to product auth.

## Middleware Layer

Two auth middleware functions are in `src/middleware/`:

| Middleware | File | Attaches to req |
|---|---|---|
| `requireProductAuth` | `product-auth.ts` | `req.v2User` (ProductJwtPayload) |
| `requireInternalAuth` | `internal-auth.ts` | `req.user`, `req.internalUser` |

**RBAC middleware:**
- `requireWorkspaceAccess(role)` (`middleware/workspace-access.ts`): Queries `workspace_members` to check if `req.v2User.userId` has at least the specified role for the workspace.
- `requireBrandAccess(role)` (`middleware/brand-access.ts`): Resolves the brand's `workspaceId` from its `brandId` param, then delegates to workspace access check.

## Security Notes

- Both product and internal auth use the same `JWT_SECRET` — there is no role in the token itself to distinguish them. The distinction is purely which middleware validates the request.
- Passwords are hashed with `bcrypt` (standard work factor).
- No refresh token mechanism — tokens expire per the JWT TTL (appears to be default: no expiry set, which is a risk — see `decisions.md`).
- No rate limiting on login endpoints.

## Interactions With Other Modules

- All domain modules with protected routes import `requireProductAuth`, `requireBrandAccess`, or `requireWorkspaceAccess` middleware.
- `auth.service.ts` is used by `product-auth.ts` middleware for token verification.
- `internal-auth.service.ts` is used by `internal-auth.ts` middleware for token verification.
