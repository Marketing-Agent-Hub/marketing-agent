import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/client';
import type { GeneratedBrandProfile, GeneratedContentPillar } from '@/types/onboarding';

interface SaveParams {
    profile: GeneratedBrandProfile;
    pillars: GeneratedContentPillar[];
}

export function useOnboardingSave(brandId: number) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (params: SaveParams) => {
            const res = await apiClient.post(
                `/api/brands/${brandId}/onboarding/save`,
                params,
            );
            return res.data;
        },
        onSuccess: () => {
            // Invalidate brand query so profile shows as complete
            qc.invalidateQueries({ queryKey: ['brand', brandId] });
            qc.invalidateQueries({ queryKey: ['brands'] });
        },
    });
}
