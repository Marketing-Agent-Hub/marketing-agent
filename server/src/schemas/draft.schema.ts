import { z } from 'zod';
import { PostStatus, TimeSlot } from '@prisma/client';

export const updateDraftSchema = z.object({
    editedContent: z.string().optional(),
    hookText: z.string().optional(),
    bulletsText: z.string().optional(),
    ocvnTakeText: z.string().optional(),
    ctaText: z.string().optional(),
    hashtags: z.array(z.string()).optional(),
});

export const approveDraftSchema = z.object({
    // No additional fields needed - just changes status
});

export const rejectDraftSchema = z.object({
    rejectionReason: z.string().min(1, 'Rejection reason is required'),
});

export const getDraftsQuerySchema = z.object({
    status: z.enum(['DRAFT', 'APPROVED', 'REJECTED', 'POSTED']).optional(),
    targetDate: z.string().optional(), // ISO date string
    timeSlot: z.enum(['MORNING_1', 'MORNING_2', 'NOON', 'EVENING_1', 'EVENING_2']).optional(),
});

export type UpdateDraftInput = z.infer<typeof updateDraftSchema>;
export type ApproveDraftInput = z.infer<typeof approveDraftSchema>;
export type RejectDraftInput = z.infer<typeof rejectDraftSchema>;
export type GetDraftsQuery = z.infer<typeof getDraftsQuerySchema>;

