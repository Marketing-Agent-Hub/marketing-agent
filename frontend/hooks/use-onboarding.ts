'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { OnboardingSession } from '@/lib/types';

export function useOnboardingSession(brandId: number | undefined, sessionId: number | undefined) {
    return useQuery<OnboardingSession>({
        queryKey: ['onboarding-session', brandId, sessionId],
        queryFn: () =>
            api
                .get<OnboardingSession>(`/brands/${brandId}/onboarding/sessions/${sessionId}`)
                .then((r) => r.data),
        enabled: !!brandId && !!sessionId,
    });
}

export function useCreateOnboardingSession(brandId: number) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: () =>
            api
                .post<OnboardingSession>(`/brands/${brandId}/onboarding/sessions`)
                .then((r) => r.data),
        onSuccess: (s) => {
            qc.invalidateQueries({ queryKey: ['onboarding-session', brandId] });
            return s;
        },
    });
}

export function useAddMessage(brandId: number, sessionId: number) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: { role: 'user'; content: string }) =>
            api
                .post<OnboardingSession>(
                    `/brands/${brandId}/onboarding/sessions/${sessionId}/messages`,
                    data
                )
                .then((r) => r.data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['onboarding-session', brandId, sessionId] });
        },
    });
}

export function useCompleteSession(brandId: number, sessionId: number) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: () =>
            api
                .post<OnboardingSession>(
                    `/brands/${brandId}/onboarding/sessions/${sessionId}/complete`
                )
                .then((r) => r.data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['onboarding-session', brandId, sessionId] });
            qc.invalidateQueries({ queryKey: ['brand', brandId] });
        },
    });
}
