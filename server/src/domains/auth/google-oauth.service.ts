import fetch from 'node-fetch';
import { SystemRole } from '@prisma/client';
import { prisma } from '../../db/index.js';
import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';
import { authService, AuthResult } from './auth.service.js';

interface GoogleTokenInfo {
    sub: string;
    email: string;
    name: string;
    aud: string;
}

export class GoogleOAuthService {
    async signInWithGoogle(idToken: string, ip?: string): Promise<AuthResult> {
        // Step 1: Verify idToken with Google API (5s timeout)
        let tokenInfo: GoogleTokenInfo;
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const response = await fetch(
                `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
                { signal: controller.signal }
            );
            clearTimeout(timeoutId);

            if (!response.ok) {
                const err = new Error('Google token verification failed') as any;
                err.code = 'INVALID_GOOGLE_TOKEN';
                err.statusCode = 401;
                logger.warn({ ip, outcome: 'failure', method: 'google' }, 'Google API returned non-2xx');
                throw err;
            }

            tokenInfo = (await response.json()) as GoogleTokenInfo;
        } catch (error: any) {
            // AbortError = timeout; also catch network errors
            if (error.code === 'INVALID_GOOGLE_TOKEN') throw error;

            const isTimeout = error.name === 'AbortError' || error.type === 'aborted';
            logger.warn({ ip, outcome: 'failure', method: 'google', reason: isTimeout ? 'timeout' : 'network' }, 'Google API unavailable');
            const err = new Error('Google authentication service is unavailable') as any;
            err.code = 'GOOGLE_AUTH_UNAVAILABLE';
            err.statusCode = 503;
            throw err;
        }

        // Step 2: Validate aud claim
        if (tokenInfo.aud !== env.GOOGLE_CLIENT_ID) {
            logger.warn({ ip, outcome: 'failure', method: 'google', aud: tokenInfo.aud }, 'Google token aud mismatch');
            const err = new Error('Invalid Google token: audience mismatch') as any;
            err.code = 'INVALID_GOOGLE_TOKEN';
            err.statusCode = 401;
            throw err;
        }

        const { sub: googleId, email, name } = tokenInfo;

        // Step 3: Upsert user — handle all cases atomically
        // Case A: user exists with this googleId → found directly
        // Case B: user exists with this email (magic link / password) → merge googleId
        // Case C: new user → create
        let user = await prisma.user.findUnique({ where: { googleId } });

        if (!user) {
            // Try to find by email and merge googleId
            const existingByEmail = await prisma.user.findUnique({ where: { email } });
            if (existingByEmail) {
                try {
                    user = await prisma.user.update({
                        where: { id: existingByEmail.id },
                        data: { googleId },
                    });
                } catch (error: any) {
                    if (error?.code === 'P2002') {
                        const byGoogleId = await prisma.user.findUnique({ where: { googleId } });
                        if (!byGoogleId) throw error;
                        user = byGoogleId;
                    } else {
                        throw error;
                    }
                }
            } else {
                // Create new user — use upsert to handle race conditions
                try {
                    user = await prisma.user.create({
                        data: { email, name: name ?? null, googleId, passwordHash: null },
                    });
                } catch (error: any) {
                    if (error?.code === 'P2002') {
                        const byGoogleId = await prisma.user.findUnique({ where: { googleId } });
                        if (byGoogleId) {
                            user = byGoogleId;
                        } else {
                            user = await prisma.user.upsert({
                                where: { email },
                                update: { googleId },
                                create: { email, name: name ?? null, googleId, passwordHash: null },
                            });
                        }
                    } else {
                        throw error;
                    }
                }
            }
        }

        // Step 4: Determine systemRole and promote to ADMIN if email matches
        let systemRole = user.systemRole;
        if (user.email === env.ADMIN_EMAIL) {
            systemRole = SystemRole.ADMIN;
            if (user.systemRole !== SystemRole.ADMIN) {
                user = await prisma.user.update({
                    where: { id: user.id },
                    data: { systemRole: SystemRole.ADMIN },
                });
            }
        }

        // Step 5: Issue JWT
        const token = authService.issueToken(user.id, user.email, systemRole);

        // Step 6: Log auth event
        logger.info({
            method: 'google',
            userId: user.id,
            ip,
            timestamp: new Date(),
            outcome: 'success',
        }, 'Google OAuth sign-in success');

        return { token, user: { id: user.id, email: user.email, name: user.name } };
    }
}

export const googleOAuthService = new GoogleOAuthService();
