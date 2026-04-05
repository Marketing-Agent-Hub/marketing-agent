import { z } from 'zod';

export const generateDailyContentSchema = z.object({
    daysAhead: z.number().int().min(1).max(14).default(3),
});

export const editDraftSchema = z.object({
    body: z.string().min(1).optional(),
    hook: z.string().optional(),
    cta: z.string().optional(),
    hashtags: z.array(z.string()).optional(),
});

export const listBriefsSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type GenerateDailyContentInput = z.infer<typeof generateDailyContentSchema>;
export type EditDraftInput = z.infer<typeof editDraftSchema>;
export type ListBriefsInput = z.infer<typeof listBriefsSchema>;
