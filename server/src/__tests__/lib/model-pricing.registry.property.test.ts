/**
 * Property-Based Tests: ModelPricingRegistry
 *
 * Feature: credit-wallet-system
 *
 * Property 4: creditsToAdd = floor(amountUsd × 1000)
 * Property 11: getPricePerToken always returns a value > 0
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
    getPricePerToken,
    calculateCreditsFromUsd,
    MODEL_PRICING,
    DEFAULT_PRICE_PER_TOKEN,
} from '../../lib/model-pricing.registry.js';

describe('ModelPricingRegistry — Property-Based Tests', () => {
    /**
     * Property 11: getPricePerToken always returns a value > 0
     *
     * For any model identifier string m (including models not in the registry),
     * getPricePerToken(m) SHALL return a value strictly greater than 0.
     *
     * Validates: Requirements 9.3, 9.4
     */
    it('Property 11: getPricePerToken always returns a value > 0 for any model identifier', () => {
        fc.assert(
            fc.property(fc.string(), (model) => {
                const price = getPricePerToken(model);
                expect(typeof price).toBe('number');
                expect(price).toBeGreaterThan(0);
                expect(isFinite(price)).toBe(true);
            }),
            { numRuns: 100 }
        );
    });

    /**
     * Property 11 (known models): All models in the registry have price > 0
     */
    it('Property 11: all known models in MODEL_PRICING have price > 0', () => {
        for (const [model, price] of Object.entries(MODEL_PRICING)) {
            expect(price).toBeGreaterThan(0);
            expect(getPricePerToken(model)).toBe(price);
        }
    });

    /**
     * Property 11 (fallback): Unknown models fall back to DEFAULT_PRICE_PER_TOKEN > 0
     */
    it('Property 11: unknown models fall back to DEFAULT_PRICE_PER_TOKEN which is > 0', () => {
        expect(DEFAULT_PRICE_PER_TOKEN).toBeGreaterThan(0);

        fc.assert(
            fc.property(
                fc.string().filter((s) => !(s in MODEL_PRICING)),
                (unknownModel) => {
                    expect(getPricePerToken(unknownModel)).toBe(DEFAULT_PRICE_PER_TOKEN);
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Property 4: creditsToAdd = floor(amountUsd × 1000)
     *
     * For any positive USD amount a, calculateCreditsFromUsd(a) SHALL return
     * Math.floor(a × 1000), which is always a non-negative integer.
     *
     * Validates: Requirements 2.2
     */
    it('Property 4: calculateCreditsFromUsd(a) === Math.floor(a × 1000) for any positive USD amount', () => {
        fc.assert(
            fc.property(fc.float({ min: Math.fround(0.01), max: Math.fround(10000), noNaN: true }), (amountUsd) => {
                const credits = calculateCreditsFromUsd(amountUsd);
                const expected = Math.floor(amountUsd * 1000);

                expect(credits).toBe(expected);
                expect(Number.isInteger(credits)).toBe(true);
                expect(credits).toBeGreaterThanOrEqual(0);
            }),
            { numRuns: 100 }
        );
    });

    /**
     * Property 4 (edge cases): Zero and very small amounts
     */
    it('Property 4: calculateCreditsFromUsd returns 0 for amounts < 0.001', () => {
        expect(calculateCreditsFromUsd(0)).toBe(0);
        expect(calculateCreditsFromUsd(0.0009)).toBe(0);
        expect(calculateCreditsFromUsd(0.001)).toBe(1);
    });

    /**
     * Property 4 (large amounts): Result is always a non-negative integer
     */
    it('Property 4: result is always a non-negative integer for any non-negative amount', () => {
        fc.assert(
            fc.property(fc.float({ min: Math.fround(0), max: Math.fround(1e6), noNaN: true }), (amountUsd) => {
                const credits = calculateCreditsFromUsd(amountUsd);
                expect(Number.isInteger(credits)).toBe(true);
                expect(credits).toBeGreaterThanOrEqual(0);
            }),
            { numRuns: 100 }
        );
    });
});
