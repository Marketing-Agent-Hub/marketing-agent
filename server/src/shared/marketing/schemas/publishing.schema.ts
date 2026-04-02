import { z } from 'zod';

export const scheduleDraftSchema = z.object({
    scheduledFor: z.string().datetime('scheduledFor phai la ISO 8601 datetime'),
});

export type ScheduleDraftInput = z.infer<typeof scheduleDraftSchema>;
