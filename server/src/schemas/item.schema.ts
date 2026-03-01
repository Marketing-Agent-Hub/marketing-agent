import { z } from 'zod';

export const getItemsSchema = z.object({
    status: z.enum(['NEW', 'EXTRACTED', 'FILTERED_OUT', 'READY_FOR_AI', 'AI_STAGE_A_DONE', 'AI_STAGE_B_DONE', 'USED_IN_POST', 'REJECTED']).optional(),
    sourceId: z.string().transform(Number).optional(),
    limit: z.string().transform(Number).default('50'),
    offset: z.string().transform(Number).default('0'),
    search: z.string().optional(),
});

export const getItemByIdSchema = z.object({
    id: z.string().transform(Number),
});

