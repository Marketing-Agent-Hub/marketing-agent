import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/client';
import type { Brand } from '@/types';

export function useBrands(workspaceId: number) {
    return useQuery<Brand[]>({
        queryKey: ['brands', workspaceId],
        queryFn: () => apiClient.get(`/api/v2/workspaces/${workspaceId}/brands`).then((r) => r.data),
        enabled: !!workspaceId,
    });
}

export function useCreateBrand(workspaceId: number) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: {
            name: string;
            websiteUrl?: string;
            industry?: string;
            timezone?: string;
            defaultLanguage?: string;
        }) =>
            apiClient
                .post<Brand>(`/api/v2/workspaces/${workspaceId}/brands`, data)
                .then((r) => r.data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['brands', workspaceId] }),
    });
}
