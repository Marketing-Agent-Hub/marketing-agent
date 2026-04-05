import { z } from 'zod';

export const createWorkspaceSchema = z.object({
    name: z.string().min(1, 'Ten workspace khong duoc de trong').max(100),
    slug: z.string()
        .min(2, 'Slug phai co it nhat 2 ky tu')
        .max(50)
        .regex(/^[a-z0-9-]+$/, 'Slug chi duoc chua chu thuong, so va dau gach ngang'),
});

export const addMemberSchema = z.object({
    userId: z.number().int().positive('userId phai la so nguyen duong'),
    role: z.enum(['OWNER', 'ADMIN', 'EDITOR', 'VIEWER']),
});

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
export type AddMemberInput = z.infer<typeof addMemberSchema>;
