import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/client';
import type { StrategyPlan } from '@/types';

export function useStrategy(brandId: number) {
    return useQuery<StrategyPlan[]>({
        queryKey: ['strategy', brandId],
        queryFn: () => apiClient.get(`/api/brands/${brandId}/strategies`).then((r) => r.data.strategies ?? r.data),
        enabled: !!brandId,
    });
}

export function useGenerateStrategy(brandId: number) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: { durationDays: number; postsPerWeek: number; channels: string[] }) =>
            apiClient.post(`/api/brands/${brandId}/strategies/generate`, data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['strategy', brandId] }),
    });
}

export function useActivateStrategy() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ strategyId, brandId: _brandId }: { strategyId: number; brandId: number }) =>
            apiClient.post(`/api/strategies/${strategyId}/activate`),
        onSuccess: (_data, { brandId }) => qc.invalidateQueries({ queryKey: ['strategy', brandId] }),
    });
}
