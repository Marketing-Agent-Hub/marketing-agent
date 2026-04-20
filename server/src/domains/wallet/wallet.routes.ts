import { Router } from 'express';
import { requireProductAuth } from '../../middleware/product-auth.js';
import { asyncHandler } from '../../lib/async-handler.js';
import { walletService } from './wallet.service.js';
import { topUpService, InvalidTopUpAmountError, StripeFeatureDisabledError } from './topup.service.js';
import { prisma } from '../../db/index.js';
import type { TransactionType } from '@prisma/client';

const router = Router();

/**
 * GET /wallet
 * Returns the authenticated user's wallet balance.
 */
router.get(
    '/wallet',
    requireProductAuth,
    asyncHandler(async (req, res) => {
        const userId = req.v2User!.userId;
        const balance = await walletService.getBalance(userId);

        res.json({
            credits: balance.credits.toString(),
            usd: balance.usd,
            lifetimeAdded: balance.lifetimeAdded.toString(),
            lifetimeUsed: balance.lifetimeUsed.toString(),
        });
    })
);

/**
 * GET /wallet/transactions
 * Returns paginated transaction history for the authenticated user.
 * Query params: page (default 1), pageSize (default 20, max 100), type (optional)
 */
router.get(
    '/wallet/transactions',
    requireProductAuth,
    asyncHandler(async (req, res) => {
        const userId = req.v2User!.userId;
        const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10));
        const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize ?? '20'), 10)));
        const type = req.query.type as TransactionType | undefined;

        const wallet = await walletService.getOrCreate(userId);
        const skip = (page - 1) * pageSize;

        const where = {
            walletId: wallet.id,
            ...(type ? { type } : {}),
        };

        const [items, total] = await Promise.all([
            prisma.walletTransaction.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: pageSize,
            }),
            prisma.walletTransaction.count({ where }),
        ]);

        res.json({
            items: items.map((t) => ({
                ...t,
                credits: t.credits.toString(),
                balanceAfter: t.balanceAfter.toString(),
            })),
            total,
            page,
            pageSize,
        });
    })
);

/**
 * POST /wallet/topup/stripe
 * Initiates a Stripe payment intent for credit top-up.
 * Body: { amountUsd: number }
 */
router.post(
    '/wallet/topup/stripe',
    requireProductAuth,
    asyncHandler(async (req, res) => {
        const userId = req.v2User!.userId;
        const { amountUsd } = req.body as { amountUsd?: number };

        if (!amountUsd || typeof amountUsd !== 'number' || amountUsd <= 0) {
            res.status(400).json({
                error: { code: 'VALIDATION_ERROR', message: 'amountUsd must be a positive number' },
            });
            return;
        }

        try {
            const result = await topUpService.createStripeTopUp(userId, amountUsd);
            res.json(result);
        } catch (err) {
            if (err instanceof StripeFeatureDisabledError) {
                res.status(err.statusCode).json({
                    error: { code: err.code, message: err.message },
                });
                return;
            }
            throw err;
        }
    })
);

/**
 * POST /wallet/topup/cash/upload-url
 * Generates a presigned S3 PUT URL for uploading a proof-of-payment image.
 */
router.post(
    '/wallet/topup/cash/upload-url',
    requireProductAuth,
    asyncHandler(async (req, res) => {
        const userId = req.v2User!.userId;
        const result = await topUpService.getUploadUrl(userId);
        res.json(result);
    })
);

/**
 * POST /wallet/topup/cash
 * Submits a cash (VND) top-up request.
 * Body: { amountVnd: number, proofImageKey: string, note?: string }
 */
router.post(
    '/wallet/topup/cash',
    requireProductAuth,
    asyncHandler(async (req, res) => {
        const userId = req.v2User!.userId;
        const { amountVnd, proofImageKey, note } = req.body as {
            amountVnd?: number;
            proofImageKey?: string;
            note?: string;
        };

        if (!amountVnd || typeof amountVnd !== 'number') {
            res.status(400).json({
                error: { code: 'VALIDATION_ERROR', message: 'amountVnd is required and must be a number' },
            });
            return;
        }

        if (!proofImageKey || typeof proofImageKey !== 'string') {
            res.status(400).json({
                error: { code: 'VALIDATION_ERROR', message: 'proofImageKey is required' },
            });
            return;
        }

        try {
            const topUpRequest = await topUpService.submitCashTopUp(userId, {
                amountVnd,
                proofImageKey,
                note,
            });
            res.status(201).json(topUpRequest);
        } catch (err) {
            if (err instanceof InvalidTopUpAmountError) {
                res.status(400).json({
                    error: { code: 'VALIDATION_ERROR', message: err.message },
                });
                return;
            }
            throw err;
        }
    })
);

/**
 * GET /wallet/topup-history
 * Returns paginated top-up history for the authenticated user.
 * Query params: page (default 1), pageSize (default 20, max 100)
 */
router.get(
    '/wallet/topup-history',
    requireProductAuth,
    asyncHandler(async (req, res) => {
        const userId = req.v2User!.userId;
        const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10));
        const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize ?? '20'), 10)));

        const result = await topUpService.listUserTopUps(userId, { page, pageSize });
        res.json({ ...result, page, pageSize });
    })
);

export default router;
