import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../../db/index.js';
import { env } from '../../config/env.js';
import { LoginInput, RegisterInput } from '../../shared/marketing/schemas/auth.schema.js';

export interface AuthResult {
    token: string;
    user: {
        id: number;
        email: string;
        name: string | null;
    };
}

export interface ProductJwtPayload {
    userId: number;
    email: string;
    iat?: number;
    exp?: number;
}

export class AuthService {
    async register(data: RegisterInput): Promise<AuthResult> {
        const existing = await prisma.user.findUnique({ where: { email: data.email } });
        if (existing) {
            const error = new Error('Email đã được sử dụng') as any;
            error.statusCode = 409;
            error.code = 'CONFLICT';
            throw error;
        }

        const passwordHash = await bcrypt.hash(data.password, 10);
        const user = await prisma.user.create({
            data: {
                email: data.email,
                name: data.name ?? null,
                passwordHash,
            },
        });

        const token = jwt.sign(
            { userId: user.id, email: user.email } satisfies ProductJwtPayload,
            env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        return { token, user: { id: user.id, email: user.email, name: user.name } };
    }

    async login(data: LoginInput): Promise<AuthResult> {
        const user = await prisma.user.findUnique({ where: { email: data.email } });
        if (!user || !user.passwordHash) {
            const error = new Error('Email hoặc mật khẩu không đúng') as any;
            error.statusCode = 401;
            error.code = 'UNAUTHORIZED';
            throw error;
        }

        const isValid = await bcrypt.compare(data.password, user.passwordHash);
        if (!isValid) {
            const error = new Error('Email hoặc mật khẩu không đúng') as any;
            error.statusCode = 401;
            error.code = 'UNAUTHORIZED';
            throw error;
        }

        const token = jwt.sign(
            { userId: user.id, email: user.email } satisfies ProductJwtPayload,
            env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        return { token, user: { id: user.id, email: user.email, name: user.name } };
    }

    async getMe(userId: number) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, name: true, createdAt: true },
        });

        if (!user) {
            const error = new Error('User không tồn tại') as any;
            error.statusCode = 404;
            error.code = 'NOT_FOUND';
            throw error;
        }

        return user;
    }

    verifyToken(token: string): ProductJwtPayload | null {
        try {
            return jwt.verify(token, env.JWT_SECRET) as ProductJwtPayload;
        } catch {
            return null;
        }
    }
}

export const authService = new AuthService();
