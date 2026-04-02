import { z } from 'zod';

export const addMessageSchema = z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().min(1, 'Noi dung tin nhan khong duoc de trong').max(5000),
});

export const createSessionSchema = z.object({});

export type AddMessageInput = z.infer<typeof addMessageSchema>;
