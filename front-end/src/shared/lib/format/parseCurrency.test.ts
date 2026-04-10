import { parseCurrency } from './parseCurrency';

describe('parseCurrency', () => {
  describe('happy paths', () => {
    it('parses plain number', () => {
      expect(parseCurrency('100000')).toBe(100000);
    });

    it('strips commas from formatted value', () => {
      expect(parseCurrency('100,000')).toBe(100000);
    });

    it('strips commas and preserves decimals', () => {
      expect(parseCurrency('100,000.00')).toBe(100000);
    });

    it('handles millions with commas', () => {
      expect(parseCurrency('1,234,567.89')).toBe(1234567.89);
    });

    it('strips dollar sign', () => {
      expect(parseCurrency('$100,000')).toBe(100000);
    });

    it('strips dollar sign with decimals', () => {
      expect(parseCurrency('$1,234,567.89')).toBe(1234567.89);
    });

    it('strips spaces', () => {
      expect(parseCurrency('100 000')).toBe(100000);
    });

    it('handles decimal without commas', () => {
      expect(parseCurrency('50000.50')).toBe(50000.5);
    });

    it('handles zero', () => {
      expect(parseCurrency('0')).toBe(0);
    });

    it('handles small values', () => {
      expect(parseCurrency('0.01')).toBe(0.01);
    });
  });

  describe('edge cases', () => {
    it('returns NaN for empty string', () => {
      expect(parseCurrency('')).toBeNaN();
    });

    it('returns NaN for non-numeric text', () => {
      expect(parseCurrency('abc')).toBeNaN();
    });

    it('returns NaN for only symbols', () => {
      expect(parseCurrency('$,')).toBeNaN();
    });

    it('handles leading/trailing spaces', () => {
      expect(parseCurrency('  100,000  ')).toBe(100000);
    });

    it('handles dollar sign with space', () => {
      expect(parseCurrency('$ 100,000')).toBe(100000);
    });
  });
});
