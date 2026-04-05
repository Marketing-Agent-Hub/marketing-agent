'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { StrategyPlan, StrategySlot } from '@/lib/types';

export function useStrategies(brandId: number | undefined) {
    return useQuery<StrategyPlan[]>({
        queryKey: ['strategies', brandId],
        queryFn: () =>
            api.get<StrategyPlan[]>(`/brands/${brandId}/strategies`).then((r) => r.data),
        enabled: !!brandId,
    });
}

export function useStrategy(strategyId: number | undefined) {
    return useQuery<StrategyPlan>({
        queryKey: ['strategy', strategyId],
        queryFn: () =>
            api.get<StrategyPlan>(`/strategies/${strategyId}`).then((r) => r.data),
        enabled: !!strategyId,
    });
}

export function useStrategySlots(strategyId: number | undefined) {
    return useQuery<StrategySlot[]>({
        queryKey: ['strategy-slots', strategyId],
        queryFn: () =>
            api.get<StrategySlot[]>(`/strategies/${strategyId}/slots`).then((r) => r.data),
        enabled: !!strategyId,
    });
}

export function useGenerateStrategy(brandId: number) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: () =>
            api.post<StrategyPlan>(`/brands/${brandId}/strategies/generate`).then((r) => r.data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['strategies', brandId] });
        },
    });
}

export function useActivateStrategy(strategyId: number) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: () =>
            api.post<StrategyPlan>(`/strategies/${strategyId}/activate`).then((r) => r.data),
        onSuccess: (s) => {
            qc.invalidateQueries({ queryKey: ['strategies', s.brandId] });
            qc.invalidateQueries({ queryKey: ['strategy', strategyId] });
        },
    });
}
