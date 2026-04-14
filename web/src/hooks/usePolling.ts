import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { QueryKey } from '@tanstack/react-query';

interface UsePollingOptions<T> {
    queryKey: QueryKey;
    queryFn: () => Promise<T>;
    shouldStop: (data: T) => boolean;
    intervalMs?: number;
    timeoutMs?: number;
    enabled?: boolean;
    onTimeout?: () => void;
    onStop?: (data: T) => void;
}

export function usePolling<T>({
    queryKey,
    queryFn,
    shouldStop,
    intervalMs = 3000,
    timeoutMs = 120_000,
    enabled = true,
    onTimeout,
    onStop,
}: UsePollingOptions<T>) {
    const startTimeRef = useRef<number | null>(null);
    const stoppedRef = useRef(false);

    const query = useQuery<T>({
        queryKey,
        queryFn,
        enabled,
        refetchInterval: (query) => {
            const data = query.state.data;
            if (!enabled || stoppedRef.current) return false;
            if (data && shouldStop(data)) return false;
            if (startTimeRef.current && Date.now() - startTimeRef.current >= timeoutMs) return false;
            return intervalMs;
        },
    });

    useEffect(() => {
        if (enabled && !stoppedRef.current) {
            startTimeRef.current = Date.now();
        }
    }, [enabled]);

    useEffect(() => {
        if (!query.data || stoppedRef.current) return;
        if (shouldStop(query.data)) {
            stoppedRef.current = true;
            onStop?.(query.data);
        }
    }, [query.data]);

    useEffect(() => {
        if (!enabled || !startTimeRef.current) return;
        const timer = setTimeout(() => {
            if (!stoppedRef.current) {
                stoppedRef.current = true;
                onTimeout?.();
            }
        }, timeoutMs);
        return () => clearTimeout(timer);
    }, [enabled, timeoutMs, onTimeout]);

    return query;
}
