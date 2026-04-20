import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { prisma } from '../../db/index.js';
import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';
import { walletService } from './wallet.service.js';
import type { TopUpRequest, WalletTransaction } from '@prisma/client';

export class TopUpRequestNotReviewableError extends Error {
    readonly statusCode = 409;
    readonly code = 'NOT_REVIEWABLE';
    constructor(topUpRequestId: number) {
        super(
            `TopUpRequest #${topUpRequestId} is not in PENDING_APPROVAL status and cannot be reviewed`
        );
        this.name = 'TopUpRequestNotReviewableError';
    }
}

class CashReviewService {
    private s3: S3Client;

    constructor() {
        this.s3 = new S3Client({
            region: env.AWS_REGION,
            credentials: {
                accessKeyId: env.AWS_ACCESS_KEY_ID,
                secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
            },
        });
    }

    /**
     * List pending cash top-up requests for admin review.
     * Ordered by createdAt ASC (oldest first).
     */
    async listPending(params: {
        page: number;
        pageSize: number;
    }): Promise<{ items: TopUpRequest[]; total: number }> {
        const { page, pageSize } = params;
        const skip = (page - 1) * pageSize;

        const [items, total] = await Promise.all([
            prisma.topUpRequest.findMany({
                where: { status: 'PENDING_APPROVAL' },
                orderBy: { createdAt: 'asc' },
                skip,
                take: pageSize,
            }),
            prisma.topUpRequest.count({ where: { status: 'PENDING_APPROVAL' } }),
        ]);

        return { items, total };
    }

    /**
     * Generate a presigned S3 GET URL for viewing a proof-of-payment image.
     * Valid for 5 minutes.
     */
    async getProofUrl(topUpRequestId: number): Promise<string> {
        const topUpRequest = await prisma.topUpRequest.findUnique({
            where: { id: topUpRequestId },
        });

        if (!topUpRequest) {
            throw new Error(`TopUpRequest #${topUpRequestId} not found`);
        }

        if (!topUpRequest.proofImageKey) {
            throw new Error(`TopUpRequest #${topUpRequestId} has no proof image`);
        }

        const command = new GetObjectCommand({
            Bucket: env.S3_BUCKET_NAME,
            Key: topUpRequest.proofImageKey,
        });

        return getSignedUrl(this.s3, command, { expiresIn: 5 * 60 }); // 5 min
    }

    /**
     * Approve a cash top-up request and add credits to the user's wallet.
     * Only PENDING_APPROVAL requests can be approved.
     */
    async approve(
        topUpRequestId: number,
        adminUserId: number,
        creditsToAdd: number
    ): Promise<void> {
        const topUpRequest = await prisma.topUpRequest.findUnique({
            where: { id: topUpRequestId },
        });

        if (!topUpRequest) {
            throw new Error(`TopUpRequest #${topUpRequestId} not found`);
        }

        if (topUpRequest.status !== 'PENDING_APPROVAL') {
            throw new TopUpRequestNotReviewableError(topUpRequestId);
        }

        // Add credits to wallet
        await walletService.addCredits({
            userId: topUpRequest.userId,
            credits: creditsToAdd,
            type: 'TOPUP',
            description: `Cash top-up approved by admin #${adminUserId}: ${topUpRequest.amountVnd?.toLocaleString()} VND`,
            topUpRequestId,
        });

        // Update TopUpRequest to SUCCEEDED
        await prisma.topUpRequest.update({
            where: { id: topUpRequestId },
            data: {
                status: 'SUCCEEDED',
                creditsAdded: creditsToAdd,
                reviewedAt: new Date(),
                reviewedByUserId: adminUserId,
            },
        });

        logger.info(
            { topUpRequestId, adminUserId, creditsToAdd, userId: topUpRequest.userId },
            '[CashReviewService] Cash top-up approved'
        );
    }

    /**
     * Reject a cash top-up request.
     * Only PENDING_APPROVAL requests can be rejected.
     */
    async reject(
        topUpRequestId: number,
        adminUserId: number,
        rejectionReason: string
    ): Promise<void> {
        const topUpRequest = await prisma.topUpRequest.findUnique({
            where: { id: topUpRequestId },
        });

        if (!topUpRequest) {
            throw new Error(`TopUpRequest #${topUpRequestId} not found`);
        }

        if (topUpRequest.status !== 'PENDING_APPROVAL') {
            throw new TopUpRequestNotReviewableError(topUpRequestId);
        }

        await prisma.topUpRequest.update({
            where: { id: topUpRequestId },
            data: {
                status: 'REJECTED',
                rejectionReason,
                reviewedAt: new Date(),
                reviewedByUserId: adminUserId,
            },
        });

        logger.info(
            { topUpRequestId, adminUserId, rejectionReason, userId: topUpRequest.userId },
            '[CashReviewService] Cash top-up rejected'
        );
    }

    /**
     * Manually adjust a user's credit balance (admin only).
     * Positive creditDelta = add credits (BONUS/ADJUSTMENT).
     * Negative creditDelta = deduct credits (ADJUSTMENT).
     */
    async manualAdjustment(
        adminUserId: number,
        targetUserId: number,
        creditDelta: number,
        note: string
    ): Promise<WalletTransaction> {
        if (creditDelta === 0) {
            throw new Error('creditDelta must be non-zero');
        }

        const description = `Manual adjustment by admin #${adminUserId}: ${note}`;

        if (creditDelta > 0) {
            return walletService.addCredits({
                userId: targetUserId,
                credits: creditDelta,
                type: 'ADJUSTMENT',
                description,
            });
        } else {
            return walletService.deductCredits({
                userId: targetUserId,
                credits: Math.abs(creditDelta),
                description,
            });
        }
    }
}

export const cashReviewService = new CashReviewService();
