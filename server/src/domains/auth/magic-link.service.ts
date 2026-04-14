import crypto from 'node:crypto';
import { SystemRole } from '@prisma/client';
import { prisma } from '../../db/index.js';
import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';
import { authService, AuthResult } from './auth.service.js';
import { emailService } from './email.service.js';

export class MagicLinkService {
    async requestMagicLink(email: string, ip?: string): Promise<void> {
        // Upsert user — create if not exists (passwordless registration)
        const user = await prisma.user.upsert({
            where: { email },
            update: {},
            create: { email, passwordHash: null },
        });

        // Invalidate all existing active tokens for this user
        await prisma.magicLinkToken.updateMany({
            where: { userId: user.id, usedAt: null },
            data: { usedAt: new Date() },
        });

        // Generate plaintext token (256-bit entropy)
        const plaintextToken = crypto.randomBytes(32).toString('hex');

        // Hash for storage — never store plaintext in DB
        const tokenHash = crypto.createHash('sha256').update(plaintextToken).digest('hex');

        // Persist token with 15-minute expiry
        await prisma.magicLinkToken.create({
            data: {
                tokenHash,
                userId: user.id,
                expiresAt: new Date(Date.now() + 15 * 60 * 1000),
            },
        });

        // Build magic link URL
        const magicLinkUrl = `${env.APP_URL}/auth/verify?token=${plaintextToken}`;

        // Send email
        await emailService.sendMagicLinkEmail(email, magicLinkUrl);

        // Log auth event
        logger.info({
            method: 'magic_link',
            action: 'request',
            userId: user.id,
            ip,
            outcome: 'success',
        }, 'Magic link requested');
    }

    async verifyMagicLink(token: string, ip?: string): Promise<AuthResult> {
        // Hash the received token for lookup
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

        // Lookup token record
        const record = await prisma.magicLinkToken.findUnique({
            where: { tokenHash },
            include: { user: true },
        });

        // Token not found or already used
        if (!record || record.usedAt !== null) {
            const error = new Error('Magic link token is invalid or has already been used') as Error & {
                code: string;
                statusCode: number;
            };
            error.code = 'INVALID_MAGIC_TOKEN';
            error.statusCode = 401;
            throw error;
        }

        // Token expired
        if (record.expiresAt < new Date()) {
            const error = new Error('Magic link token has expired') as Error & {
                code: string;
                statusCode: number;
            };
            error.code = 'EXPIRED_MAGIC_TOKEN';
            error.statusCode = 401;
            throw error;
        }

        // Mark token as used
        await prisma.magicLinkToken.update({
            where: { id: record.id },
            data: { usedAt: new Date() },
        });

        // Assign ADMIN role if email matches ADMIN_EMAIL (idempotent)
        let systemRole = record.user.systemRole;
        if (record.user.email === env.ADMIN_EMAIL && record.user.systemRole !== SystemRole.ADMIN) {
            await prisma.user.update({
                where: { id: record.user.id },
                data: { systemRole: SystemRole.ADMIN },
            });
            systemRole = SystemRole.ADMIN;
        }

        // Issue JWT with systemRole
        const jwtToken = authService.issueToken(record.user.id, record.user.email, systemRole);

        // Log auth event
        logger.info({
            method: 'magic_link',
            action: 'verify',
            userId: record.user.id,
            ip,
            outcome: 'success',
        }, 'Magic link verified');

        return {
            token: jwtToken,
            user: {
                id: record.user.id,
                email: record.user.email,
                name: record.user.name,
            },
        };
    }
}

export const magicLinkService = new MagicLinkService();
