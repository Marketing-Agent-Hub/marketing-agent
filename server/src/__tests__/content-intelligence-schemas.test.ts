import { describe, expect, it } from 'vitest';
import {
    createSourceSchema,
    updateSourceSchema,
    validateRSSSchema,
    getSourcesSchema,
} from '../domains/content-intelligence/source.schema.js';
import {
    getItemsSchema,
    getItemByIdSchema,
    getReadyItemsSchema,
    deleteItemsSchema,
} from '../domains/content-intelligence/item.schema.js';

describe('source.schema (canonical location)', () => {
    it('createSourceSchema accepts a valid source', () => {
        const result = createSourceSchema.parse({ name: 'My Feed', rssUrl: 'https://example.com/feed' });
        expect(result.name).toBe('My Feed');
        expect(result.lang).toBe('MIXED');
        expect(result.enabled).toBe(false);
        expect(result.trustScore).toBe(70);
    });

    it('createSourceSchema rejects empty name', () => {
        expect(() => createSourceSchema.parse({ name: '' })).toThrow();
    });

    it('createSourceSchema rejects invalid rssUrl', () => {
        expect(() => createSourceSchema.parse({ name: 'Feed', rssUrl: 'not-a-url' })).toThrow();
    });

    it('updateSourceSchema allows partial updates', () => {
        const result = updateSourceSchema.parse({ trustScore: 90 });
        expect(result.trustScore).toBe(90);
        expect(result.name).toBeUndefined();
    });

    it('validateRSSSchema accepts a valid URL', () => {
        const result = validateRSSSchema.parse({ url: 'https://example.com/rss' });
        expect(result.url).toBe('https://example.com/rss');
    });

    it('validateRSSSchema rejects an invalid URL', () => {
        expect(() => validateRSSSchema.parse({ url: 'not-a-url' })).toThrow();
    });

    it('getSourcesSchema applies defaults', () => {
        const result = getSourcesSchema.parse({});
        expect(result.limit).toBe(20);
        expect(result.offset).toBe(0);
        expect(result.sortBy).toBe('enabled');
        expect(result.sortOrder).toBe('desc');
    });

    it('getSourcesSchema coerces string numbers', () => {
        const result = getSourcesSchema.parse({ limit: '50', offset: '10' });
        expect(result.limit).toBe(50);
        expect(result.offset).toBe(10);
    });
});

describe('item.schema (canonical location)', () => {
    it('getItemsSchema applies defaults', () => {
        const result = getItemsSchema.parse({});
        expect(result.limit).toBe(50);
        expect(result.offset).toBe(0);
    });

    it('getItemsSchema accepts a valid status filter', () => {
        const result = getItemsSchema.parse({ status: 'READY_FOR_AI' });
        expect(result.status).toBe('READY_FOR_AI');
    });

    it('getItemsSchema rejects an invalid status', () => {
        expect(() => getItemsSchema.parse({ status: 'INVALID_STATUS' })).toThrow();
    });

    it('getItemByIdSchema transforms string id to number', () => {
        const result = getItemByIdSchema.parse({ id: '42' });
        expect(result.id).toBe(42);
    });

    it('getReadyItemsSchema applies defaults', () => {
        const result = getReadyItemsSchema.parse({});
        expect(result.limit).toBe(20);
        expect(result.sortBy).toBe('importance');
    });

    it('getReadyItemsSchema rejects invalid sortBy', () => {
        expect(() => getReadyItemsSchema.parse({ sortBy: 'invalid' })).toThrow();
    });

    it('deleteItemsSchema requires at least one id', () => {
        expect(() => deleteItemsSchema.parse({ ids: [] })).toThrow();
    });

    it('deleteItemsSchema accepts a valid ids array', () => {
        const result = deleteItemsSchema.parse({ ids: [1, 2, 3] });
        expect(result.ids).toEqual([1, 2, 3]);
    });
});
