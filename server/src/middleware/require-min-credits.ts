import { Request, Response, NextFunction } from 'express';
import { walletService } from '../domains/wallet/wallet.service.js';

/**
 * Middleware that checks whether the authenticated user has at least `minCredits`
 * in their wallet. Returns HTTP 402 if balance is insufficient.
 *
 * Usage:
 *   router.post('/ai/generate', requireProductAuth, requireMinCredits(10), handler)
 */
export function requireMinCredits(minCredits = 1) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const userId = req.v2User?.userId;

        // No userId means auth middleware hasn't run or user is not authenticated.
        // Let auth middleware handle this case.
        if (!userId) {
            next();
            return;
        }

        const wallet = await walletService.getOrCreate(userId);

        if (wallet.balanceCredits.lessThan(minCredits)) {
            res.status(402).json({
                error: {
                    code: 'INSUFFICIENT_CREDITS',
                    message: 'Insufficient credits. Please top up your wallet.',
                },
            });
            return;
        }

        next();
    };
}
