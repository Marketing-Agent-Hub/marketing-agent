import { z } from 'zod';

export const approvalActionSchema = z.object({
    comment: z.string().max(500).optional(),
});

export type ApprovalActionInput = z.infer<typeof approvalActionSchema>;
