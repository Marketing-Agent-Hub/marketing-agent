import { useMutation } from '@tanstack/react-query';
import apiClient from '@/api/client';
import type {
    OnboardingFormData,
    GenerateResult,
    FieldSuggestionResult,
} from '@/types/onboarding';

interface GenerateFullParams {
    formData: OnboardingFormData;
    prompt?: string;
    fieldKey?: never;
}

interface GenerateFieldParams {
    formData: OnboardingFormData;
    fieldKey: string;
    prompt?: never;
}

type GenerateParams = GenerateFullParams | GenerateFieldParams;

export function useOnboardingGenerate(brandId: number) {
    return useMutation({
        mutationFn: async (params: GenerateParams): Promise<GenerateResult | FieldSuggestionResult> => {
            const res = await apiClient.post(
                `/api/brands/${brandId}/onboarding/generate`,
                params,
            );
            return res.data;
        },
    });
}
