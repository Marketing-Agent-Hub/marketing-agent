import { z } from 'zod';

export const addMessageSchema = z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().min(1, 'Noi dung tin nhan khong duoc de trong').max(5000),
});

export const createSessionSchema = z.object({});

export type AddMessageInput = z.infer<typeof addMessageSchema>;

// ─── New schemas for generate and save endpoints ───────────────────────────

export const onboardingFormDataSchema = z.object({
    // Basic fields
    brandName: z.string().min(1, 'Brand Name là bắt buộc'),
    websiteUrl: z.string().url('URL không hợp lệ').optional().or(z.literal('')),
    industry: z.string().optional(),
    description: z.string().optional(),
    targetAudience: z.string().optional(),
    toneOfVoice: z.string().optional(),
    businessGoals: z.string().optional(),
    // Advanced fields
    usp: z.string().optional(),
    competitors: z.string().optional(),
    keyMessages: z.string().optional(),
    contentPillars: z.string().optional(),
    socialChannels: z.array(z.string()).optional().default([]),
});

export const generateRequestSchema = z.object({
    formData: onboardingFormDataSchema,
    prompt: z.string().optional(),
    fieldKey: z.string().optional(),
});

export const generatedBrandProfileSchema = z.object({
    summary: z.string().min(1),
    targetAudience: z.array(
        z.object({
            segment: z.string(),
            painPoints: z.array(z.string()),
        }),
    ),
    valueProps: z.array(z.string()),
    toneGuidelines: z.object({
        voice: z.string(),
        avoid: z.array(z.string()),
    }),
    businessGoals: z.array(z.string()),
    messagingAngles: z.array(z.string()),
    contentPillarCandidates: z.array(
        z.object({
            name: z.string(),
            description: z.string().optional(),
        }),
    ),
});

export const generatedContentPillarSchema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
});

export const saveRequestSchema = z.object({
    profile: generatedBrandProfileSchema,
    pillars: z.array(generatedContentPillarSchema),
});

// TypeScript types
export type OnboardingFormDataInput = z.infer<typeof onboardingFormDataSchema>;
export type GenerateRequestInput = z.infer<typeof generateRequestSchema>;
export type GeneratedBrandProfileInput = z.infer<typeof generatedBrandProfileSchema>;
export type GeneratedContentPillarInput = z.infer<typeof generatedContentPillarSchema>;
export type SaveRequestInput = z.infer<typeof saveRequestSchema>;
