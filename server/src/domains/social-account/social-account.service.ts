import { SocialPlatform } from '@prisma/client';
import { prisma } from '../../db/index.js';

interface ConnectAccountInput {
    platform: SocialPlatform;
    accountName: string;
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: Date;
}

export class SocialAccountService {
    async connectAccount(brandId: number, data: ConnectAccountInput) {
        return prisma.socialAccount.create({
            data: {
                brandId,
                platform: data.platform,
                accountName: data.accountName,
                accessToken: data.accessToken,
                refreshToken: data.refreshToken,
                expiresAt: data.expiresAt,
                status: 'CONNECTED',
            },
        });
    }

    async listAccounts(brandId: number) {
        return prisma.socialAccount.findMany({
            where: { brandId },
            select: { id: true, platform: true, accountName: true, status: true, expiresAt: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
        });
    }

    async disconnectAccount(accountId: number) {
        const account = await prisma.socialAccount.findUnique({ where: { id: accountId } });
        if (!account) {
            const err = new Error('Social account not found') as any;
            err.statusCode = 404;
            err.code = 'NOT_FOUND';
            throw err;
        }
        return prisma.socialAccount.update({
            where: { id: accountId },
            data: { status: 'REVOKED' },
        });
    }
}

export const socialAccountService = new SocialAccountService();
