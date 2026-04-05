'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ContentBrief, ContentDraft, ReviewQueueItem } from '@/lib/types';

export function useReviewQueue(brandId: number | undefined) {
    return useQuery<ReviewQueueItem[]>({
        queryKey: ['review-queue', brandId],
        queryFn: () =>
            api.get<ReviewQueueItem[]>(`/brands/${brandId}/review-queue`).then((r) => r.data),
        enabled: !!brandId,
    });
}

export function useBriefs(brandId: number | undefined) {
    return useQuery<ContentBrief[]>({
        queryKey: ['briefs', brandId],
        queryFn: () =>
            api.get<ContentBrief[]>(`/brands/${brandId}/briefs`).then((r) => r.data),
        enabled: !!brandId,
    });
}

export function useBrief(briefId: number | undefined) {
    return useQuery<ContentBrief>({
        queryKey: ['brief', briefId],
        queryFn: () => api.get<ContentBrief>(`/briefs/${briefId}`).then((r) => r.data),
        enabled: !!briefId,
    });
}

export function useGenerateDailyContent(brandId: number) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: () =>
            api.post(`/brands/${brandId}/generate-daily`).then((r) => r.data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['review-queue', brandId] });
        },
    });
}

export function useRegenerateDrafts(briefId: number) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: () =>
            api.post(`/briefs/${briefId}/drafts/regenerate`).then((r) => r.data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['brief', briefId] });
        },
    });
}

export function useEditDraft(draftId: number) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: { body?: string; hook?: string; cta?: string; hashtags?: string[] }) =>
            api.patch<ContentDraft>(`/drafts/${draftId}`, data).then((r) => r.data),
        onSuccess: (draft) => {
            qc.invalidateQueries({ queryKey: ['brief', draft.contentBriefId] });
        },
    });
}

export function useApproveDraft(draftId: number) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data?: { comment?: string }) =>
            api.post(`/drafts/${draftId}/approve`, data).then((r) => r.data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['review-queue'] });
        },
    });
}

export function useRejectDraft(draftId: number) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data?: { comment?: string }) =>
            api.post(`/drafts/${draftId}/reject`, data).then((r) => r.data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['review-queue'] });
        },
    });
}
