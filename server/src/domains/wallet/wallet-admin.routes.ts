import { Router } from 'express';
import { requireAdminAuth } from '../../middleware/admin-auth.js';
import { asyncHandler } from '../../lib/async-handler.js';
import { cashReviewService, TopUpRequestNotReviewableError } from './cash-review.service.js';

const router = Router();

/**
 * GET /wallet/admin/topup-requests
 * Lists pending cash top-up requests for admin review.
 * Query params: page (default 1), pageSize (default 20, max 100)
 */
router.get(
    '/wallet/admin/topup-requests',
    requireAdminAuth,
    asyncHandler(async (req, res) => {
        const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10));
        const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize ?? '20'), 10)));

        const result = await cashReviewService.listPending({ page, pageSize });
        res.json({ ...result, page, pageSize });
    })
);

/**
 * GET /wallet/admin/topup-requests/:id/proof-url
 * Returns a presigned S3 GET URL for viewing the proof-of-payment image.
 * URL is valid for 5 minutes.
 */
router.get(
    '/wallet/admin/topup-requests/:id/proof-url',
    requireAdminAuth,
    asyncHandler(async (req, res) => {
        const id = parseInt(req.params.id, 10);

        if (isNaN(id)) {
            res.status(400).json({
                error: { code: 'VALIDATION_ERROR', message: 'Invalid top-up request ID' },
            });
            return;
        }

        const url = await cashReviewService.getProofUrl(id);
        res.json({ url });
    })
);

/**
 * POST /wallet/admin/topup-requests/:id/approve
 * Approves a pending cash top-up request and adds credits to the user's wallet.
 * Body: { creditsToAdd: number }
 */
router.post(
    '/wallet/admin/topup-requests/:id/approve',
    requireAdminAuth,
    asyncHandler(async (req, res) => {
        const id = parseInt(req.params.id, 10);
        const adminUserId = req.v2User!.userId;
        const { creditsToAdd } = req.body as { creditsToAdd?: number };

        if (isNaN(id)) {
            res.status(400).json({
                error: { code: 'VALIDATION_ERROR', message: 'Invalid top-up request ID' },
            });
            return;
        }

        if (!creditsToAdd || typeof creditsToAdd !== 'number' || creditsToAdd <= 0) {
            res.status(400).json({
                error: { code: 'VALIDATION_ERROR', message: 'creditsToAdd must be a positive number' },
            });
            return;
        }

        try {
            await cashReviewService.approve(id, adminUserId, creditsToAdd);
            res.json({ success: true });
        } catch (err) {
            if (err instanceof TopUpRequestNotReviewableError) {
                res.status(409).json({
                    error: { code: 'NOT_REVIEWABLE', message: err.message },
                });
                return;
            }
            throw err;
        }
    })
);

/**
 * POST /wallet/admin/topup-requests/:id/reject
 * Rejects a pending cash top-up request.
 * Body: { rejectionReason: string }
 */
router.post(
    '/wallet/admin/topup-requests/:id/reject',
    requireAdminAuth,
    asyncHandler(async (req, res) => {
        const id = parseInt(req.params.id, 10);
        const adminUserId = req.v2User!.userId;
        const { rejectionReason } = req.body as { rejectionReason?: string };

        if (isNaN(id)) {
            res.status(400).json({
                error: { code: 'VALIDATION_ERROR', message: 'Invalid top-up request ID' },
            });
            return;
        }

        if (!rejectionReason || typeof rejectionReason !== 'string' || rejectionReason.trim() === '') {
            res.status(400).json({
                error: { code: 'VALIDATION_ERROR', message: 'rejectionReason is required' },
            });
            return;
        }

        try {
            await cashReviewService.reject(id, adminUserId, rejectionReason.trim());
            res.json({ success: true });
        } catch (err) {
            if (err instanceof TopUpRequestNotReviewableError) {
                res.status(409).json({
                    error: { code: 'NOT_REVIEWABLE', message: err.message },
                });
                return;
            }
            throw err;
        }
    })
);

/**
 * POST /wallet/admin/users/:userId/adjust
 * Manually adjusts a user's credit balance.
 * Body: { creditDelta: number (non-zero), note: string }
 */
router.post(
    '/wallet/admin/users/:userId/adjust',
    requireAdminAuth,
    asyncHandler(async (req, res) => {
        const targetUserId = parseInt(req.params.userId, 10);
        const adminUserId = req.v2User!.userId;
        const { creditDelta, note } = req.body as { creditDelta?: number; note?: string };

        if (isNaN(targetUserId)) {
            res.status(400).json({
                error: { code: 'VALIDATION_ERROR', message: 'Invalid user ID' },
            });
            return;
        }

        if (creditDelta === undefined || typeof creditDelta !== 'number' || creditDelta === 0) {
            res.status(400).json({
                error: { code: 'VALIDATION_ERROR', message: 'creditDelta must be a non-zero number' },
            });
            return;
        }

        if (!note || typeof note !== 'string' || note.trim() === '') {
            res.status(400).json({
                error: { code: 'VALIDATION_ERROR', message: 'note is required' },
            });
            return;
        }

        const transaction = await cashReviewService.manualAdjustment(
            adminUserId,
            targetUserId,
            creditDelta,
            note.trim()
        );

        res.json({
            ...transaction,
            credits: transaction.credits.toString(),
            balanceAfter: transaction.balanceAfter.toString(),
        });
    })
);

export default router;
