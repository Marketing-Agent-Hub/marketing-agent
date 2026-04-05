import { z } from 'zod';

export const generateStrategySchema = z.object({
    durationDays: z.number().int().min(7).max(90).default(30),
    startDate: z.string().datetime().optional(),
    channels: z.array(z.enum(['X', 'FACEBOOK', 'LINKEDIN', 'TIKTOK', 'INSTAGRAM'])).optional(),
    postsPerWeek: z.number().int().min(1).max(21).optional(),
});

export type GenerateStrategyInput = z.infer<typeof generateStrategySchema>;
