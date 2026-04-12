import { z } from 'zod';

export const ScreenwriterOutputSchema = z.object({
    headline: z.string().min(1).max(150),
    storyArc: z.string().max(300),
    keyPoints: z.array(z.string()).min(2),
    tone: z.enum(['professional', 'casual', 'humorous', 'urgent']),
    callToAction: z.string().optional(),
});

export const VideoScriptSchema = z.object({
    hook: z.string().min(1),
    story: z.string().min(1),
    conclusion: z.string().min(1),
    cta: z.string().optional(),
});

export const UpsertAgentConfigSchema = z.object({
    // Agent toggles
    enableSocialPostAgent: z.boolean().optional(),
    enableVideoAgent: z.boolean().optional(),
    enableLongformAgent: z.boolean().optional(),

    // Model per-role
    curatorModel: z.string().min(1).optional().nullable(),
    screenwriterModel: z.string().min(1).optional().nullable(),
    socialPostModel: z.string().min(1).optional().nullable(),
    videoModel: z.string().min(1).optional().nullable(),
    longformModel: z.string().min(1).optional().nullable(),

    // Social post settings
    socialPostMaxChars: z.number().int().positive().optional(),
    socialPostIncludeHashtags: z.boolean().optional(),
    socialPostIncludeEmoji: z.boolean().optional(),

    // Video settings
    videoScriptMinSeconds: z.number().int().positive().optional(),
    videoScriptMaxSeconds: z.number().int().positive().optional(),
    videoScriptIncludeCTA: z.boolean().optional(),

    // Longform settings
    longformMinWords: z.number().int().positive().optional(),
    longformIncludeImages: z.boolean().optional(),

    // Image settings
    enableImageForSocialPost: z.boolean().optional(),
    enableImageForLongform: z.boolean().optional(),
    imageModel: z.string().min(1).optional(),
});

export type ScreenwriterOutput = z.infer<typeof ScreenwriterOutputSchema>;
export type VideoScript = z.infer<typeof VideoScriptSchema>;
export type UpsertAgentConfigInput = z.infer<typeof UpsertAgentConfigSchema>;
