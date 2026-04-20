import { Router, raw } from 'express';
import { topUpService } from './topup.service.js';
import { logger } from '../../lib/logger.js';
import { env } from '../../config/env.js';

const router = Router();

/**
 * POST /webhooks/stripe
 *
 * Stripe webhook endpoint. MUST use raw body parser (not JSON) so that
 * Stripe can verify the webhook signature against the raw request body.
 *
 * Mount this route BEFORE any global JSON body parser middleware.
 */
router.post(
    '/webhooks/stripe',
    raw({ type: 'application/json' }),
    async (req, res) => {
        if (!env.STRIPE_ENABLED) {
            res.status(200).json({ received: false, disabled: true });
            return;
        }

        const signature = req.headers['stripe-signature'];

        if (!signature || typeof signature !== 'string') {
            logger.warn('[StripeWebhook] Missing stripe-signature header');
            res.status(400).json({ error: 'Missing stripe-signature header' });
            return;
        }

        try {
            await topUpService.handleStripeWebhook(req.body as Buffer, signature);
            res.status(200).json({ received: true });
        } catch (err) {
            logger.warn(
                { err: err instanceof Error ? err.message : String(err) },
                '[StripeWebhook] Webhook processing failed'
            );
            res.status(400).json({
                error: 'Webhook signature verification failed or processing error',
            });
        }
    }
);

export default router;
