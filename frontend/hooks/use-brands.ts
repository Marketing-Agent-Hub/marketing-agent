'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useWorkspaceStore } from '@/store/workspace';
import type { Brand, KnowledgeDocument } from '@/lib/types';

export function useBrands(workspaceId: number | undefined) {
    return useQuery<Brand[]>({
        queryKey: ['brands', workspaceId],
        queryFn: () =>
            api.get<Brand[]>(`/workspaces/${workspaceId}/brands`).then((r) => r.data),
        enabled: !!workspaceId,
    });
}

export function useBrand(brandId: number | undefined) {
    return useQuery<Brand>({
        queryKey: ['brand', brandId],
        queryFn: () => api.get<Brand>(`/brands/${brandId}`).then((r) => r.data),
        enabled: !!brandId,
    });
}

export function useCreateBrand() {
    const qc = useQueryClient();
    const { activeWorkspace, setActiveBrand } = useWorkspaceStore();
    const router = useRouter();
    return useMutation({
        mutationFn: (data: { name: string; industry?: string; websiteUrl?: string }) =>
            api
                .post<Brand>(`/workspaces/${activeWorkspace?.id}/brands`, data)
                .then((r) => r.data),
        onSuccess: (brand) => {
            qc.invalidateQueries({ queryKey: ['brands', activeWorkspace?.id] });
            setActiveBrand(brand);
            router.push(`/app/brands/${brand.id}/onboarding`);
        },
    });
}

export function useUpdateBrand(brandId: number) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: Partial<Brand>) =>
            api.patch<Brand>(`/brands/${brandId}`, data).then((r) => r.data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['brand', brandId] });
        },
    });
}

export function useAddKnowledgeDoc(brandId: number) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: { title: string; content: string; sourceUrl?: string; docType?: string }) =>
            api
                .post<KnowledgeDocument>(`/brands/${brandId}/knowledge-documents`, data)
                .then((r) => r.data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['brand', brandId] });
        },
    });
}
