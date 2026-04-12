# Module: Workspace

## Purpose

Provides multi-tenant isolation. A Workspace is the top-level container for a team; all brands, strategies, and content belong to a workspace, and users are granted access at the workspace level.

## Key Files

| File | Role |
|---|---|
| `workspace.service.ts` | CRUD and membership management |
| `workspace.controller.ts` | HTTP request handlers |
| `workspace.routes.ts` | Route definitions |

## Responsibilities

1. **Create Workspace**: Creates the workspace and automatically adds the creator as an `OWNER` member — in a single Prisma transaction.
2. **List Workspaces**: Returns only workspaces where the authenticated user is a member.
3. **Get Workspace**: Returns workspace details and member list.
4. **Add Member**: Looks up a user by email and adds them to the workspace with a specified role. Requires `ADMIN` or higher.

## Role Hierarchy

```
OWNER  ── Can do everything; cannot be removed
  ↓
ADMIN  ── Can add/remove members, manage workspace settings
  ↓
EDITOR ── Can create and edit content, strategies, brands
  ↓
VIEWER ── Read-only access to all workspace data
```

Access checks are enforced by `requireWorkspaceAccess(minRole)` middleware, which queries the `workspace_members` table on every protected request.

## Slug

Every workspace has a unique `slug` (URL-friendly identifier). The slug is set at creation and cannot be changed (no update endpoint for slug). It is indexed for fast lookup.

## Interactions With Other Modules

- **Brand module**: All brands belong to a workspace (`workspaceId` FK).
- **Auth module**: `requireWorkspaceAccess` middleware reads `req.v2User.userId` (set by product auth).
- **GenerationRun**: All AI workflow audit records include `workspaceId` for billing/reporting.

## Cascade Behavior

Deleting a workspace (not currently exposed via API) would cascade-delete:
- All `WorkspaceMember` records
- All `Brand` records (and by extension their profiles, strategies, content, etc.)

This is enforced at the Prisma schema level with `onDelete: Cascade`.

## Middleware Detail

`requireWorkspaceAccess(minRole)` from `middleware/workspace-access.ts`:
1. Reads `workspaceId` from `req.params.workspaceId`
2. Queries `workspace_members` for `(workspaceId, userId)`
3. Maps role to a numeric weight (`VIEWER=1`, `EDITOR=2`, `ADMIN=3`, `OWNER=4`)
4. If user's weight < required weight → returns `403 FORBIDDEN`
5. Otherwise → calls `next()`
