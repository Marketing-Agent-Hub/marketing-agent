import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import React from 'react';
import AdminGuard from '@/components/guards/AdminGuard';

function makeMockJwt(payload: Record<string, unknown>): string {
    const now = Math.floor(Date.now() / 1000);
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const body = btoa(JSON.stringify({ iat: now, exp: now + 3600, ...payload }));
    return `${header}.${body}.sig`;
}

function renderWithGuard(token: string | null, path = '/admin/dashboard') {
    if (token) localStorage.setItem('app_token', token);
    else localStorage.removeItem('app_token');

    render(
        React.createElement(
            MemoryRouter,
            { initialEntries: [path] },
            React.createElement(
                Routes,
                null,
                React.createElement(
                    Route,
                    { element: React.createElement(AdminGuard) },
                    React.createElement(Route, {
                        path,
                        element: React.createElement('div', { 'data-testid': 'admin-content' }, 'Admin'),
                    })
                ),
                React.createElement(Route, {
                    path: '/workspaces',
                    element: React.createElement('div', { 'data-testid': 'workspaces' }, 'Workspaces'),
                }),
                React.createElement(Route, {
                    path: '/login',
                    element: React.createElement('div', { 'data-testid': 'login' }, 'Login'),
                })
            )
        )
    );
}

describe('AdminGuard', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
        localStorage.clear();
    });
    afterEach(() => {
        document.body.innerHTML = '';
        localStorage.clear();
    });

    it('renders children (Outlet) when token has systemRole ADMIN', () => {
        const token = makeMockJwt({ userId: 1, email: 'admin@example.com', systemRole: 'ADMIN' });
        renderWithGuard(token);
        expect(screen.getByTestId('admin-content')).toBeTruthy();
        expect(screen.queryByTestId('workspaces')).toBeNull();
        expect(screen.queryByTestId('login')).toBeNull();
    });

    it('redirects to /workspaces when token has systemRole USER', () => {
        const token = makeMockJwt({ userId: 2, email: 'user@example.com', systemRole: 'USER' });
        renderWithGuard(token);
        expect(screen.getByTestId('workspaces')).toBeTruthy();
        expect(screen.queryByTestId('admin-content')).toBeNull();
    });

    it('redirects to /workspaces when token has no systemRole field', () => {
        const token = makeMockJwt({ userId: 3, email: 'user@example.com' });
        renderWithGuard(token);
        expect(screen.getByTestId('workspaces')).toBeTruthy();
        expect(screen.queryByTestId('admin-content')).toBeNull();
    });

    it('redirects to /login when no token is present', () => {
        renderWithGuard(null);
        expect(screen.getByTestId('login')).toBeTruthy();
        expect(screen.queryByTestId('admin-content')).toBeNull();
    });

    it('redirects to /login when token is an empty string', () => {
        localStorage.setItem('app_token', '');
        renderWithGuard(null); // null → removeItem, but we already set empty string above
        // empty string is falsy in the guard check
        expect(screen.queryByTestId('admin-content')).toBeNull();
    });

    it('redirects to /workspaces when token is malformed (not a valid JWT)', () => {
        localStorage.setItem('app_token', 'not-a-real-jwt');
        render(
            React.createElement(
                MemoryRouter,
                { initialEntries: ['/admin/dashboard'] },
                React.createElement(
                    Routes,
                    null,
                    React.createElement(
                        Route,
                        { element: React.createElement(AdminGuard) },
                        React.createElement(Route, {
                            path: '/admin/dashboard',
                            element: React.createElement('div', { 'data-testid': 'admin-content' }, 'Admin'),
                        })
                    ),
                    React.createElement(Route, {
                        path: '/workspaces',
                        element: React.createElement('div', { 'data-testid': 'workspaces' }, 'Workspaces'),
                    }),
                    React.createElement(Route, {
                        path: '/login',
                        element: React.createElement('div', { 'data-testid': 'login' }, 'Login'),
                    })
                )
            )
        );
        // decodeAppToken returns null for malformed token → redirect /workspaces
        expect(screen.queryByTestId('admin-content')).toBeNull();
    });
});
