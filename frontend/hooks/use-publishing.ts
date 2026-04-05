'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { PublishJob, SocialAccount } from '@/lib/types';

export function usePublishJobs(brandId: number | undefined) {
    return useQuery<PublishJob[]>({
        queryKey: ['publish-jobs', brandId],
        queryFn: () =>
            api.get<PublishJob[]>(`/brands/${brandId}/publish-jobs`).then((r) => r.data),
        enabled: !!brandId,
    });
}

export function useScheduleDraft(draftId: number) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: { scheduledFor: string; platform: string }) =>
            api.post<PublishJob>(`/drafts/${draftId}/schedule`, data).then((r) => r.data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['publish-jobs'] });
        },
    });
}

export function useRetryJob(jobId: number) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: () =>
            api.post<PublishJob>(`/publish-jobs/${jobId}/retry`).then((r) => r.data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['publish-jobs'] });
        },
    });
}

export function useSocialAccounts(brandId: number | undefined) {
    return useQuery<SocialAccount[]>({
        queryKey: ['social-accounts', brandId],
        queryFn: () =>
            api.get<SocialAccount[]>(`/brands/${brandId}/social-accounts`).then((r) => r.data),
        enabled: !!brandId,
    });
}

export function useConnectSocialAccount(brandId: number) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: { platform: string; accessToken: string; accountName?: string }) =>
            api
                .post<SocialAccount>(`/brands/${brandId}/social-accounts/connect`, data)
                .then((r) => r.data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['social-accounts', brandId] });
        },
    });
}

export function useDisconnectSocialAccount() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: number) =>
            api.post(`/social-accounts/${id}/disconnect`).then((r) => r.data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['social-accounts'] });
        },
    });
}
