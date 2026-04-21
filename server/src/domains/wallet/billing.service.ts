import { calculateCreditsFromUsd } from '../../lib/model-pricing.registry.js';
import type { AddCreditsParams } from './wallet.service.js';

export interface IBillingWalletService {
    addCredits(params: AddCreditsParams): Promise<unknown>;
    getOrCreate(userId: number): Promise<{ id: number }>;
}

export class BillingService {
    constructor(private readonly walletService: IBillingWalletService) { }

    /**
     * Add credits to a user's wallet.
     * Delegates to walletService.addCredits().
     */
    async addCredits(params: AddCreditsParams): Promise<unknown> {
        return this.walletService.addCredits(params);
    }

    /**
     * Calculate the number of credits for a given USD amount.
     * Formula: floor(amountUsd × 1000)
     */
    calculateCreditsFromUsd(amountUsd: number): number {
        return calculateCreditsFromUsd(amountUsd);
    }
}
