import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';

export interface LoginResult {
    token: string;
    email: string;
}

export class AuthService {
    /**
     * Authenticate user with email and password
     */
    async login(email: string, password: string): Promise<LoginResult | null> {
        // In MVP, we only have one admin user from env
        if (email !== env.ADMIN_EMAIL) {
            console.log('Login failed: email mismatch');
            return null;
        }

        const isValid = await bcrypt.compare(password, env.ADMIN_PASSWORD_HASH);
        if (!isValid) {
            console.log('Login failed: invalid password');
            return null;
        }

        // Generate JWT token
        const token = jwt.sign({ email }, env.JWT_SECRET, { expiresIn: '7d' });

        console.log('Login successful:', email);
        return { token, email };
    }

    /**
     * Verify a JWT token
     */
    verifyToken(token: string): { email: string } | null {
        try {
            const payload = jwt.verify(token, env.JWT_SECRET) as { email: string };
            return payload;
        } catch {
            return null;
        }
    }
}

export const authService = new AuthService();
