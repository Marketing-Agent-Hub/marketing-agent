import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/client';
import type { ContentDraft } from '@/types';

export function useReviewQueue(brandId: number) {
    return useQuery<ContentDraft[]>({
        queryKey: ['review-queue', brandId],
        queryFn: () => apiClient.get(`/api/brands/${brandId}/review-queue`).then((r) => r.data.queue ?? r.data),
        enabled: !!brandId,
    });
}

export function useApproveDraft(brandId: number) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (draftId: string) =>
            apiClient.post(`/api/drafts/${draftId}/approve`),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['review-queue', brandId] }),
    });
}

export function useRejectDraft(brandId: number) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ draftId, comment }: { draftId: string; comment: string }) =>
            apiClient.post(`/api/drafts/${draftId}/reject`, { comment }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['review-queue', brandId] }),
    });
}

export function useUpdateDraft(brandId: number) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ draftId, content }: { draftId: string; content: string }) =>
            apiClient.patch(`/api/drafts/${draftId}`, { content }),
        // Optimistic update
        onMutate: async ({ draftId, content }) => {
            await qc.cancelQueries({ queryKey: ['review-queue', brandId] });
            const previous = qc.getQueryData<ContentDraft[]>(['review-queue', brandId]);
            qc.setQueryData<ContentDraft[]>(['review-queue', brandId], (old) =>
                old?.map((d) => (d.id === draftId ? { ...d, content } : d)) ?? []
            );
            return { previous };
        },
        onError: (_err, _vars, context) => {
            if (context?.previous) {
                qc.setQueryData(['review-queue', brandId], context.previous);
            }
        },
        onSettled: () => qc.invalidateQueries({ queryKey: ['review-queue', brandId] }),
    });
}
