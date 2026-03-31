import { describe, it, expect } from 'vitest';
import { generateContentHash } from '../../lib/plugins/base.plugin.js';

describe('generateContentHash', () => {
    it('trả về hex string 64 ký tự (SHA-256)', () => {
        const hash = generateContentHash({ title: 'Test', link: 'https://example.com' });
        expect(hash).toHaveLength(64);
        expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('idempotent — cùng input luôn trả về cùng output', () => {
        const input = { title: 'Test Title', link: 'https://example.com/article', snippet: 'Some snippet' };
        expect(generateContentHash(input)).toBe(generateContentHash(input));
    });

    it('input khác nhau (title khác) trả về hash khác nhau', () => {
        const hash1 = generateContentHash({ title: 'Title A', link: 'https://example.com' });
        const hash2 = generateContentHash({ title: 'Title B', link: 'https://example.com' });
        expect(hash1).not.toBe(hash2);
    });

    it('input khác nhau (link khác) trả về hash khác nhau', () => {
        const hash1 = generateContentHash({ title: 'Same Title', link: 'https://example.com/a' });
        const hash2 = generateContentHash({ title: 'Same Title', link: 'https://example.com/b' });
        expect(hash1).not.toBe(hash2);
    });

    it('snippet undefined và snippet rỗng cho cùng hash', () => {
        const hash1 = generateContentHash({ title: 'T', link: 'https://x.com' });
        const hash2 = generateContentHash({ title: 'T', link: 'https://x.com', snippet: '' });
        expect(hash1).toBe(hash2);
    });
});
