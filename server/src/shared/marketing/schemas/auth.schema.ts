import { z } from 'zod';

export const registerSchema = z.object({
    email: z.string().email('Email khong hop le'),
    password: z.string().min(8, 'Mat khau phai co it nhat 8 ky tu'),
    name: z.string().min(1).max(100).optional(),
});

export const loginSchema = z.object({
    email: z.string().email('Email khong hop le'),
    password: z.string().min(1, 'Mat khau khong duoc de trong'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
