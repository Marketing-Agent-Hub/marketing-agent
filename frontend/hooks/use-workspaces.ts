'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useWorkspaceStore } from '@/store/workspace';
import type { Workspace } from '@/lib/types';

export function useWorkspaces() {
    return useQuery<Workspace[]>({
        queryKey: ['workspaces'],
        queryFn: () => api.get<Workspace[]>('/workspaces').then((r) => r.data),
    });
}

export function useWorkspace(id: number | undefined) {
    return useQuery<Workspace>({
        queryKey: ['workspaces', id],
        queryFn: () => api.get<Workspace>(`/workspaces/${id}`).then((r) => r.data),
        enabled: !!id,
    });
}

export function useCreateWorkspace() {
    const qc = useQueryClient();
    const { setActiveWorkspace } = useWorkspaceStore();
    const router = useRouter();
    return useMutation({
        mutationFn: (data: { name: string }) =>
            api.post<Workspace>('/workspaces', data).then((r) => r.data),
        onSuccess: (ws) => {
            qc.invalidateQueries({ queryKey: ['workspaces'] });
            setActiveWorkspace(ws);
            router.push('/app/brands/new');
        },
    });
}
