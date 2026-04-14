import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';

// We need to import client AFTER setting up mocks so interceptors are registered
// Use dynamic import inside tests to get a fresh module per describe block

describe('API client — request interceptor', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.resetModules();
    });
    afterEach(() => {
        localStorage.clear();
    });

    it('attaches Authorization header when app_token is in localStorage', async () => {
        localStorage.setItem('app_token', 'my-test-token');
        const { default: apiClient } = await import('@/api/client');
        const mock = new MockAdapter(apiClient);
        mock.onGet('/test').reply(200, {});

        const res = await apiClient.get('/test');
        const reqHeaders = mock.history.get[0]?.headers;
        expect(reqHeaders?.Authorization).toBe('Bearer my-test-token');
        mock.restore();
    });

    it('does not attach Authorization header when no token', async () => {
        const { default: apiClient } = await import('@/api/client');
        const mock = new MockAdapter(apiClient);
        mock.onGet('/test').reply(200, {});

        await apiClient.get('/test');
        const reqHeaders = mock.history.get[0]?.headers;
        expect(reqHeaders?.Authorization).toBeUndefined();
        mock.restore();
    });
});

describe('API client — response interceptor', () => {
    let apiClient: Awaited<typeof import('@/api/client')>['default'];
    let setToastFn: Awaited<typeof import('@/api/client')>['setToastFn'];
    let mock: MockAdapter;
    const toastMessages: string[] = [];

    beforeEach(async () => {
        localStorage.clear();
        vi.resetModules();
        toastMessages.length = 0;

        const mod = await import('@/api/client');
        apiClient = mod.default;
        setToastFn = mod.setToastFn;
        setToastFn((msg) => toastMessages.push(msg));
        mock = new MockAdapter(apiClient);
    });

    afterEach(() => {
        mock.restore();
        localStorage.clear();
    });

    it('removes app_token from localStorage on 401', async () => {
        localStorage.setItem('app_token', 'valid-token');
        mock.onGet('/protected').reply(401, { error: { message: 'Unauthorized' } });

        // Intercept window.location.href assignment
        const originalLocation = window.location;
        Object.defineProperty(window, 'location', {
            writable: true,
            value: { href: '' },
        });

        await apiClient.get('/protected').catch(() => { });

        expect(localStorage.getItem('app_token')).toBeNull();
        expect(toastMessages).toContain('Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.');

        Object.defineProperty(window, 'location', { writable: true, value: originalLocation });
    });

    it('redirects to /login on 401', async () => {
        mock.onGet('/protected').reply(401, {});
        Object.defineProperty(window, 'location', { writable: true, value: { href: '' } });

        await apiClient.get('/protected').catch(() => { });

        expect((window.location as { href: string }).href).toBe('/login');
    });

    it('shows error message toast on 422', async () => {
        mock.onPost('/submit').reply(422, { error: { message: 'Email đã tồn tại' } });

        await apiClient.post('/submit', {}).catch(() => { });

        expect(toastMessages).toContain('Email đã tồn tại');
    });

    it('shows fallback toast message when 422 has no error.message', async () => {
        mock.onPost('/submit').reply(422, {});

        await apiClient.post('/submit', {}).catch(() => { });

        expect(toastMessages.length).toBeGreaterThan(0);
    });

    it('shows "Không thể kết nối máy chủ" toast on 500', async () => {
        mock.onGet('/api/data').reply(500, {});

        await apiClient.get('/api/data').catch(() => { });

        expect(toastMessages).toContain('Không thể kết nối máy chủ');
    });

    it('shows server error toast on 503', async () => {
        mock.onGet('/api/data').reply(503, {});

        await apiClient.get('/api/data').catch(() => { });

        expect(toastMessages).toContain('Không thể kết nối máy chủ');
    });

    it('rejects the promise so callers can handle errors', async () => {
        mock.onGet('/fail').reply(500, {});

        await expect(apiClient.get('/fail')).rejects.toThrow();
    });
});
