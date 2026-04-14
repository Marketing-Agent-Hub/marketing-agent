/**
 * Tests for usePolling hook.
 * Strategy: test the shouldStop logic and onTimeout callback directly
 * rather than fighting fake timers + TanStack Query async internals.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { usePolling } from '@/hooks/usePolling';

function makeWrapper() {
    const qc = new QueryClient({
        defaultOptions: { queries: { retry: false, staleTime: 0 } },
    });
    return {
        qc,
        wrapper: ({ children }: { children: React.ReactNode }) =>
            React.createElement(QueryClientProvider, { client: qc }, children),
    };
}

describe('usePolling — basic fetch', () => {
    it('calls queryFn when enabled=true', async () => {
        const queryFn = vi.fn().mockResolvedValue({ profile: null });
        const { wrapper } = makeWrapper();

        renderHook(
            () =>
                usePolling({
                    queryKey: ['poll-basic'],
                    queryFn,
                    shouldStop: () => false,
                    enabled: true,
                    intervalMs: 60_000, // long interval so it only fires once
                }),
            { wrapper }
        );

        await waitFor(() => expect(queryFn).toHaveBeenCalledTimes(1), { timeout: 3000 });
    });

    it('does NOT call queryFn when enabled=false', async () => {
        const queryFn = vi.fn().mockResolvedValue({ profile: null });
        const { wrapper } = makeWrapper();

        renderHook(
            () =>
                usePolling({
                    queryKey: ['poll-disabled'],
                    queryFn,
                    shouldStop: () => false,
                    enabled: false,
                    intervalMs: 100,
                }),
            { wrapper }
        );

        // Wait a bit — queryFn should never be called
        await new Promise((r) => setTimeout(r, 200));
        expect(queryFn).not.toHaveBeenCalled();
    });
});

describe('usePolling — BrandProfile detection (shouldStop)', () => {
    it('calls onStop when shouldStop returns true', async () => {
        const onStop = vi.fn();
        const brandData = { id: 1, profile: { summary: 'AI brand' } };
        const queryFn = vi.fn().mockResolvedValue(brandData);
        const { wrapper } = makeWrapper();

        renderHook(
            () =>
                usePolling({
                    queryKey: ['poll-stop'],
                    queryFn,
                    shouldStop: (d: typeof brandData) => !!d.profile,
                    enabled: true,
                    intervalMs: 60_000,
                    onStop,
                }),
            { wrapper }
        );

        await waitFor(() => expect(onStop).toHaveBeenCalledWith(brandData), { timeout: 3000 });
    });

    it('does NOT call onStop when profile is null', async () => {
        const onStop = vi.fn();
        const queryFn = vi.fn().mockResolvedValue({ id: 1, profile: null });
        const { wrapper } = makeWrapper();

        renderHook(
            () =>
                usePolling({
                    queryKey: ['poll-no-stop'],
                    queryFn,
                    shouldStop: (d: { profile: null | object }) => !!d.profile,
                    enabled: true,
                    intervalMs: 60_000,
                    onStop,
                }),
            { wrapper }
        );

        await waitFor(() => expect(queryFn).toHaveBeenCalled(), { timeout: 3000 });
        expect(onStop).not.toHaveBeenCalled();
    });

    it('detects BrandProfile and passes data to onStop', async () => {
        const onStop = vi.fn();
        const brandWithProfile = { id: 42, name: 'Test Brand', profile: { summary: 'done' } };
        const queryFn = vi.fn().mockResolvedValue(brandWithProfile);
        const { wrapper } = makeWrapper();

        renderHook(
            () =>
                usePolling({
                    queryKey: ['brand-polling', 42],
                    queryFn,
                    shouldStop: (d: typeof brandWithProfile) => !!d.profile,
                    enabled: true,
                    intervalMs: 3000,
                    onStop,
                }),
            { wrapper }
        );

        await waitFor(() => {
            expect(onStop).toHaveBeenCalledTimes(1);
            expect(onStop).toHaveBeenCalledWith(brandWithProfile);
        }, { timeout: 3000 });
    });
});

describe('usePolling — timeout', () => {
    beforeEach(() => { vi.useFakeTimers(); });
    afterEach(() => { vi.useRealTimers(); });

    it('calls onTimeout after timeoutMs', async () => {
        const onTimeout = vi.fn();
        const queryFn = vi.fn().mockResolvedValue({ profile: null });
        const { wrapper } = makeWrapper();

        renderHook(
            () =>
                usePolling({
                    queryKey: ['poll-timeout'],
                    queryFn,
                    shouldStop: () => false,
                    enabled: true,
                    intervalMs: 1000,
                    timeoutMs: 5000,
                    onTimeout,
                }),
            { wrapper }
        );

        await act(async () => { vi.advanceTimersByTime(5001); });
        expect(onTimeout).toHaveBeenCalledTimes(1);
    });

    it('calls onTimeout after 120s (Onboarding default)', async () => {
        const onTimeout = vi.fn();
        const queryFn = vi.fn().mockResolvedValue({ profile: null });
        const { wrapper } = makeWrapper();

        renderHook(
            () =>
                usePolling({
                    queryKey: ['poll-120s'],
                    queryFn,
                    shouldStop: () => false,
                    enabled: true,
                    intervalMs: 3000,
                    timeoutMs: 120_000,
                    onTimeout,
                }),
            { wrapper }
        );

        await act(async () => { vi.advanceTimersByTime(120_001); });
        expect(onTimeout).toHaveBeenCalledTimes(1);
    });

    it('does NOT call onTimeout when enabled=false', async () => {
        const onTimeout = vi.fn();
        const queryFn = vi.fn().mockResolvedValue({ profile: null });
        const { wrapper } = makeWrapper();

        renderHook(
            () =>
                usePolling({
                    queryKey: ['poll-disabled-timeout'],
                    queryFn,
                    shouldStop: () => false,
                    enabled: false,
                    intervalMs: 1000,
                    timeoutMs: 5000,
                    onTimeout,
                }),
            { wrapper }
        );

        await act(async () => { vi.advanceTimersByTime(6000); });
        expect(onTimeout).not.toHaveBeenCalled();
    });
});
