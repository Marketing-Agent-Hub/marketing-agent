import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import PermissionGuard from '@/components/guards/PermissionGuard';
import type { WorkspaceRole } from '@/types';

const ALL_ROLES: WorkspaceRole[] = ['OWNER', 'ADMIN', 'EDITOR', 'VIEWER'];

function renderGuard(userRole: WorkspaceRole | undefined, allowedRoles: WorkspaceRole[]) {
    render(
        React.createElement(
            PermissionGuard,
            { roles: allowedRoles, userRole },
            React.createElement('div', { 'data-testid': 'protected' }, 'Secret Content')
        )
    );
}

describe('PermissionGuard', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    // ── Renders children when role is allowed ──────────────────────────────

    it('renders children when userRole is OWNER and OWNER is allowed', () => {
        renderGuard('OWNER', ['OWNER']);
        expect(screen.getByTestId('protected')).toBeTruthy();
    });

    it('renders children when userRole is ADMIN and ADMIN is allowed', () => {
        renderGuard('ADMIN', ['ADMIN']);
        expect(screen.getByTestId('protected')).toBeTruthy();
    });

    it('renders children when userRole is EDITOR and EDITOR is allowed', () => {
        renderGuard('EDITOR', ['EDITOR']);
        expect(screen.getByTestId('protected')).toBeTruthy();
    });

    it('renders children when userRole is VIEWER and VIEWER is allowed', () => {
        renderGuard('VIEWER', ['VIEWER']);
        expect(screen.getByTestId('protected')).toBeTruthy();
    });

    it('renders children when userRole is in a multi-role allowedRoles list', () => {
        renderGuard('EDITOR', ['OWNER', 'ADMIN', 'EDITOR']);
        expect(screen.getByTestId('protected')).toBeTruthy();
    });

    it('renders children when all roles are allowed', () => {
        renderGuard('VIEWER', ALL_ROLES);
        expect(screen.getByTestId('protected')).toBeTruthy();
    });

    // ── Hides children when role is NOT allowed ────────────────────────────

    it('hides children when userRole is VIEWER but only OWNER is allowed', () => {
        renderGuard('VIEWER', ['OWNER']);
        expect(screen.queryByTestId('protected')).toBeNull();
    });

    it('hides children when userRole is EDITOR but only OWNER and ADMIN are allowed', () => {
        renderGuard('EDITOR', ['OWNER', 'ADMIN']);
        expect(screen.queryByTestId('protected')).toBeNull();
    });

    it('hides children when userRole is ADMIN but only OWNER is allowed', () => {
        renderGuard('ADMIN', ['OWNER']);
        expect(screen.queryByTestId('protected')).toBeNull();
    });

    it('hides children when userRole is undefined', () => {
        renderGuard(undefined, ['OWNER', 'ADMIN', 'EDITOR', 'VIEWER']);
        expect(screen.queryByTestId('protected')).toBeNull();
    });

    it('hides children when allowedRoles is empty', () => {
        renderGuard('OWNER', []);
        expect(screen.queryByTestId('protected')).toBeNull();
    });

    // ── Fallback rendering ─────────────────────────────────────────────────

    it('renders fallback when userRole is not allowed', () => {
        render(
            React.createElement(
                PermissionGuard,
                { roles: ['OWNER'], userRole: 'VIEWER', fallback: React.createElement('div', { 'data-testid': 'fallback' }, 'No Access') },
                React.createElement('div', { 'data-testid': 'protected' }, 'Secret')
            )
        );
        expect(screen.getByTestId('fallback')).toBeTruthy();
        expect(screen.queryByTestId('protected')).toBeNull();
    });

    it('renders null (no fallback) by default when role is not allowed', () => {
        renderGuard('VIEWER', ['OWNER']);
        expect(screen.queryByTestId('protected')).toBeNull();
        // No fallback rendered either
        expect(document.body.textContent?.trim()).toBe('');
    });
});
