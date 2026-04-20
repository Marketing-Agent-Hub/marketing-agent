import { Decimal } from '@prisma/client/runtime/library.js';
import { prisma } from '../../db/index.js';
import { logger } from '../../lib/logger.js';
import type { TransactionType, UserWallet, WalletTransaction } from '@prisma/client';

export interface AddCreditsParams {
    userId: number;
    credits: number;
    type: TransactionType;
    description: string;
    topUpRequestId?: number;
    brandId?: number;
}

export interface DeductCreditsParams {
    userId: number;
    credits: number;
    description: string;
    brandId?: number;
    aiModel?: string;
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
}

export interface WalletBalance {
    credits: Decimal;
    usd: number;
    lifetimeAdded: Decimal;
    lifetimeUsed: Decimal;
}

class WalletService {
    /**
     * Get or create a wallet for a user.
     * Idempotent: calling multiple times returns the same wallet.
     */
    async getOrCreate(userId: number): Promise<UserWallet> {
        return prisma.userWallet.upsert({
            where: { userId },
            create: {
                userId,
                balanceCredits: 0,
                lifetimeAdded: 0,
                lifetimeUsed: 0,
            },
            update: {}, // no-op if already exists
        });
    }

    /**
     * Get the current balance for a user.
     * Creates wallet if it doesn't exist.
     */
    async getBalance(userId: number): Promise<WalletBalance> {
        const wallet = await this.getOrCreate(userId);
        return {
            credits: wallet.balanceCredits,
            usd: wallet.balanceCredits.toNumber() * 0.001,
            lifetimeAdded: wallet.lifetimeAdded,
            lifetimeUsed: wallet.lifetimeUsed,
        };
    }

    /**
     * Add credits to a user's wallet.
     * Atomically updates balance and creates a transaction record.
     */
    async addCredits(params: AddCreditsParams): Promise<WalletTransaction> {
        const { userId, credits, type, description, topUpRequestId, brandId } = params;

        // Ensure wallet exists
        const wallet = await this.getOrCreate(userId);

        return prisma.$transaction(async (tx) => {
            // Atomically increment balance and lifetimeAdded
            const updatedWallet = await tx.userWallet.update({
                where: { id: wallet.id },
                data: {
                    balanceCredits: { increment: credits },
                    lifetimeAdded: { increment: credits },
                },
            });

            // Create transaction record with snapshot of balance after
            const transaction = await tx.walletTransaction.create({
                data: {
                    walletId: wallet.id,
                    type,
                    credits: new Decimal(credits),
                    balanceAfter: updatedWallet.balanceCredits,
                    description,
                    brandId: brandId ?? null,
                    topUpRequestId: topUpRequestId ?? null,
                },
            });

            return transaction;
        });
    }

    /**
     * Deduct credits from a user's wallet after an AI call.
     * Atomically updates balance and creates a USAGE transaction record.
     * Note: balance may go negative (settle-after model) — logs warning but does not throw.
     */
    async deductCredits(params: DeductCreditsParams): Promise<WalletTransaction> {
        const {
            userId,
            credits,
            description,
            brandId,
            aiModel,
            promptTokens,
            completionTokens,
            totalTokens,
        } = params;

        // Ensure wallet exists
        const wallet = await this.getOrCreate(userId);

        return prisma.$transaction(async (tx) => {
            // Atomically decrement balance and increment lifetimeUsed
            const updatedWallet = await tx.userWallet.update({
                where: { id: wallet.id },
                data: {
                    balanceCredits: { decrement: credits },
                    lifetimeUsed: { increment: credits },
                },
            });

            // Warn if balance went negative (settle-after model allows this)
            if (updatedWallet.balanceCredits.lessThan(0)) {
                logger.warn(
                    { userId, balanceAfter: updatedWallet.balanceCredits.toNumber(), description },
                    '[WalletService] Balance went negative after deduction'
                );
            }

            // Create USAGE transaction record
            const transaction = await tx.walletTransaction.create({
                data: {
                    walletId: wallet.id,
                    type: 'USAGE',
                    credits: new Decimal(-credits), // negative = deducted
                    balanceAfter: updatedWallet.balanceCredits,
                    description,
                    brandId: brandId ?? null,
                    aiModel: aiModel ?? null,
                    promptTokens: promptTokens ?? null,
                    completionTokens: completionTokens ?? null,
                    totalTokens: totalTokens ?? null,
                },
            });

            return transaction;
        });
    }
}

export const walletService = new WalletService();
