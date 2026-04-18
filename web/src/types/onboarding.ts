// ─── Form Data ────────────────────────────────────────────────────────────────

export interface OnboardingFormData {
    // Basic fields (always visible)
    brandName: string;
    websiteUrl: string;
    industry: string;
    description: string;
    targetAudience: string;
    toneOfVoice: string;
    businessGoals: string;
    // Advanced fields (collapsible)
    usp: string;
    competitors: string;
    keyMessages: string;
    contentPillars: string;
    socialChannels: string[];
}

export const defaultFormData: OnboardingFormData = {
    brandName: '',
    websiteUrl: '',
    industry: '',
    description: '',
    targetAudience: '',
    toneOfVoice: '',
    businessGoals: '',
    usp: '',
    competitors: '',
    keyMessages: '',
    contentPillars: '',
    socialChannels: [],
};

// ─── Generated Profile ────────────────────────────────────────────────────────

export interface GeneratedBrandProfile {
    summary: string;
    targetAudience: Array<{ segment: string; painPoints: string[] }>;
    valueProps: string[];
    toneGuidelines: { voice: string; avoid: string[] };
    businessGoals: string[];
    messagingAngles: string[];
}

export interface GeneratedContentPillar {
    name: string;
    description?: string;
}

export interface GenerateResult {
    profile: GeneratedBrandProfile;
    pillars: GeneratedContentPillar[];
}

export interface FieldSuggestionResult {
    fieldKey: string;
    suggestion: string;
}

// ─── API Response ─────────────────────────────────────────────────────────────

export type GenerateResponse = GenerateResult | FieldSuggestionResult;
