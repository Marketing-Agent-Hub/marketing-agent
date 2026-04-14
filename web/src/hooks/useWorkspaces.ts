import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/client';
import type { Workspace } from '@/types';

export function useWorkspaces() {
    return useQuery<Workspace[]>({
        queryKey: ['workspaces'],
        queryFn: () => apiClient.get('/api/v2/workspaces').then((r) => r.data),
    });
}

export function useCreateWorkspace() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: { name: string; slug: string }) =>
            apiClient.post<Workspace>('/api/v2/workspaces', data).then((r) => r.data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['workspaces'] }),
    });
}
