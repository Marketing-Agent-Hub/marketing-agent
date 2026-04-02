import { z } from 'zod';

export const createBrandSchema = z.object({
    name: z.string().min(1, 'Ten brand khong duoc de trong').max(100),
    websiteUrl: z.string().url('URL khong hop le').optional(),
    industry: z.string().max(100).optional(),
    timezone: z.string().max(50).optional(),
    defaultLanguage: z.string().length(2).default('en'),
});

export const updateBrandSchema = createBrandSchema.partial();

export type CreateBrandInput = z.infer<typeof createBrandSchema>;
export type UpdateBrandInput = z.infer<typeof updateBrandSchema>;
