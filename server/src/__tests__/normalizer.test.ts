import { describe, it, expect } from 'vitest';
import { normalizeTags, normalizeKeywords, normalizeUrl } from '../lib/normalizer.js';

describe('Normalizer', () => {
  describe('normalizeTags', () => {
    it('should lowercase and trim tags', () => {
      const result = normalizeTags(['  Education  ', 'EdTech', 'BLOCKCHAIN']);
      expect(result).toEqual(['education', 'edtech', 'blockchain']);
    });

    it('should remove duplicates', () => {
      const result = normalizeTags(['education', 'Education', 'EDUCATION']);
      expect(result).toEqual(['education']);
    });

    it('should filter empty strings', () => {
      const result = normalizeTags(['education', '', '  ', 'edtech']);
      expect(result).toEqual(['education', 'edtech']);
    });
  });

  describe('normalizeKeywords', () => {
    it('should lowercase and trim keywords', () => {
      const result = normalizeKeywords(['  Price  ', 'Trading', 'PUMP']);
      expect(result).toEqual(['price', 'trading', 'pump']);
    });

    it('should remove duplicates', () => {
      const result = normalizeKeywords(['price', 'Price', 'PRICE']);
      expect(result).toEqual(['price']);
    });
  });

  describe('normalizeUrl', () => {
    it('should trim and remove trailing slash', () => {
      expect(normalizeUrl('  https://example.com/  ')).toBe('https://example.com');
      expect(normalizeUrl('https://example.com/feed/')).toBe('https://example.com/feed');
    });

    it('should handle URLs without trailing slash', () => {
      expect(normalizeUrl('https://example.com')).toBe('https://example.com');
    });
  });
});

