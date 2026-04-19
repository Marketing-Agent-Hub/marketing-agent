import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { SystemRole } from '@prisma/client';
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
    systemRole?: SystemRole;
    iat?: number;
    exp?: number;
}

export class AuthService {
    issueToken(userId: number, email: string, systemRole: SystemRole = SystemRole.USER): string {
        return jwt.sign(
            { userId, email, systemRole } satisfies Omit<ProductJwtPayload, 'iat' | 'exp'>,
            env.JWT_SECRET,
            { expiresIn: '7d' }
        );
    }

    async register(data: RegisterInput): Promise<AuthResult> {
        const existing = await prisma.user.findUnique({ where: { email: data.email } });
        if (existing) {
            const error = new Error('Email is already in use') as any;
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

        const token = this.issueToken(user.id, user.email);
        return { token, user: { id: user.id, email: user.email, name: user.name } };
    }

    async login(data: LoginInput): Promise<AuthResult> {
        const user = await prisma.user.findUnique({ where: { email: data.email } });
        if (!user) {
            const error = new Error('Incorrect email or password') as any;
            error.statusCode = 401;
            error.code = 'UNAUTHORIZED';
            throw error;
        }

        if (user.passwordHash === null) {
            const error = new Error('This account does not have a password. Please log in using Google or Magic Link.') as any;
            error.statusCode = 401;
            error.code = 'UNAUTHORIZED';
            throw error;
        }

        const isValid = await bcrypt.compare(data.password, user.passwordHash);
        if (!isValid) {
            const error = new Error('Incorrect email or password') as any;
            error.statusCode = 401;
            error.code = 'UNAUTHORIZED';
            throw error;
        }

        const token = this.issueToken(user.id, user.email);
        return { token, user: { id: user.id, email: user.email, name: user.name } };
    }

    async getMe(userId: number) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, name: true, createdAt: true },
        });

        if (!user) {
            const error = new Error('User not found') as any;
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
