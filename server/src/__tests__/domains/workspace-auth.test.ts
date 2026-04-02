import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextFunction, Request, Response } from 'express';

vi.mock('../../db/index.js', () => ({
    prisma: {
        workspaceMember: {
            findUnique: vi.fn(),
        },
    },
}));

vi.mock('../../config/env.js', () => ({
    env: { JWT_SECRET: 'test-secret-at-least-16-chars' },
}));

import { prisma } from '../../db/index.js';
import { requireWorkspaceAccess } from '../../middleware/workspace-access.js';
import { AuthService } from '../../domains/auth/auth.service.js';

function mockReq(overrides: Partial<Request> = {}): Request {
    return {
        headers: {},
        params: { workspaceId: '1' },
        ...overrides,
    } as unknown as Request;
}

function mockRes(): { res: Response; status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> } {
    const json = vi.fn();
    const status = vi.fn().mockReturnValue({ json });
    const res = { status, json } as unknown as Response;
    return { res, status, json };
}

describe('requireWorkspaceAccess', () => {
    let authService: AuthService;
    let validToken: string;

    beforeEach(async () => {
        vi.clearAllMocks();
        authService = new AuthService();
        const jwt = await import('jsonwebtoken');
        validToken = jwt.default.sign(
            { userId: 1, email: 'test@example.com' },
            'test-secret-at-least-16-chars',
            { expiresIn: '1h' }
        );
    });

    it('returns 401 without authorization header', async () => {
        const req = mockReq({ headers: {} });
        const { res, status } = mockRes();
        const next = vi.fn() as unknown as NextFunction;

        await requireWorkspaceAccess('VIEWER')(req, res, next);

        expect(status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });

    it('returns 401 for invalid token', async () => {
        const req = mockReq({ headers: { authorization: 'Bearer invalid.token' } });
        const { res, status } = mockRes();
        const next = vi.fn() as unknown as NextFunction;

        await requireWorkspaceAccess('VIEWER')(req, res, next);

        expect(status).toHaveBeenCalledWith(401);
    });

    it('returns 403 when user is not a workspace member', async () => {
        vi.mocked(prisma.workspaceMember.findUnique).mockResolvedValue(null);

        const req = mockReq({ headers: { authorization: `Bearer ${validToken}` } });
        const { res, status } = mockRes();
        const next = vi.fn() as unknown as NextFunction;

        await requireWorkspaceAccess('VIEWER')(req, res, next);

        expect(status).toHaveBeenCalledWith(403);
    });

    it('returns 403 when role is below minimum role', async () => {
        vi.mocked(prisma.workspaceMember.findUnique).mockResolvedValue({
            id: 1, workspaceId: 1, userId: 1, role: 'VIEWER', createdAt: new Date(),
            workspace: { id: 1, name: 'WS', slug: 'ws', createdAt: new Date(), updatedAt: new Date() },
        } as any);

        const req = mockReq({ headers: { authorization: `Bearer ${validToken}` } });
        const { res, status } = mockRes();
        const next = vi.fn() as unknown as NextFunction;

        await requireWorkspaceAccess('EDITOR')(req, res, next);

        expect(status).toHaveBeenCalledWith(403);
        expect(next).not.toHaveBeenCalled();
    });

    it('calls next when role is sufficient', async () => {
        vi.mocked(prisma.workspaceMember.findUnique).mockResolvedValue({
            id: 1, workspaceId: 1, userId: 1, role: 'OWNER', createdAt: new Date(),
            workspace: { id: 1, name: 'WS', slug: 'ws', createdAt: new Date(), updatedAt: new Date() },
        } as any);

        const req = mockReq({ headers: { authorization: `Bearer ${validToken}` } });
        const { res } = mockRes();
        const next = vi.fn() as unknown as NextFunction;

        await requireWorkspaceAccess('EDITOR')(req, res, next);

        expect(next).toHaveBeenCalled();
    });
});
