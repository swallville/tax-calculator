import { calculateTax } from './calculateTax';

const BRACKETS_2022 = [
  { min: 0, max: 50197, rate: 0.15 },
  { min: 50197, max: 100392, rate: 0.205 },
  { min: 100392, max: 155625, rate: 0.26 },
  { min: 155625, max: 221708, rate: 0.29 },
  { min: 221708, rate: 0.33 },
];

describe('calculateTax', () => {
  describe('edge cases', () => {
    it('returns zero tax for zero salary', () => {
      const result = calculateTax(0, BRACKETS_2022);
      expect(result.totalTax).toBe(0);
      expect(result.effectiveRate).toBe(0);
      expect(result.bands).toEqual([]);
    });

    it('returns zero tax for negative salary', () => {
      const result = calculateTax(-50000, BRACKETS_2022);
      expect(result.totalTax).toBe(0);
      expect(result.effectiveRate).toBe(0);
      expect(result.bands).toEqual([]);
    });

    it('returns zero tax for empty brackets', () => {
      const result = calculateTax(100000, []);
      expect(result.totalTax).toBe(0);
      expect(result.effectiveRate).toBe(0);
      expect(result.bands).toEqual([]);
    });

    it('returns zero tax for NaN salary', () => {
      const result = calculateTax(NaN, BRACKETS_2022);
      expect(result.totalTax).toBe(0);
      expect(result.effectiveRate).toBe(0);
      expect(result.bands).toEqual([]);
    });

    it('returns zero tax for Infinity salary', () => {
      const result = calculateTax(Infinity, BRACKETS_2022);
      expect(result.totalTax).toBe(0);
      expect(result.effectiveRate).toBe(0);
      expect(result.bands).toEqual([]);
    });
  });

  describe('single bracket', () => {
    it('calculates $50,000 salary falling entirely in the first bracket', () => {
      const result = calculateTax(50000, BRACKETS_2022);

      expect(result.totalTax).toBe(7500);
      expect(result.effectiveRate).toBe(0.15);
    });

    it('produces all 5 band entries for a $50,000 salary', () => {
      const result = calculateTax(50000, BRACKETS_2022);

      expect(result.bands).toHaveLength(5);
    });

    it('charges tax only in the first band for a $50,000 salary', () => {
      const result = calculateTax(50000, BRACKETS_2022);

      expect(result.bands[0]!.tax).toBe(7500);
      expect(result.bands[1]!.tax).toBe(0);
      expect(result.bands[2]!.tax).toBe(0);
      expect(result.bands[3]!.tax).toBe(0);
      expect(result.bands[4]!.tax).toBe(0);
    });
  });

  describe('multiple brackets', () => {
    it('calculates $100,000 salary spanning two brackets', () => {
      const result = calculateTax(100000, BRACKETS_2022);

      // 50197 * 0.15 = 7529.55, (100000 - 50197) * 0.205 = 10209.615 → 10209.62
      expect(result.totalTax).toBe(17739.17);
      expect(result.effectiveRate).toBe(0.1774);
    });

    it('breaks $100,000 salary into correct per-band amounts', () => {
      const result = calculateTax(100000, BRACKETS_2022);

      expect(result.bands[0]!.tax).toBe(7529.55);
      expect(result.bands[1]!.tax).toBe(10209.62);
      expect(result.bands[2]!.tax).toBe(0);
      expect(result.bands[3]!.tax).toBe(0);
      expect(result.bands[4]!.tax).toBe(0);
    });

    it('calculates $1,234,000 salary spanning all five brackets', () => {
      const result = calculateTax(1234000, BRACKETS_2022);

      expect(result.bands).toHaveLength(5);
      // Top bracket: (1234000 - 221708) * 0.33 = 334056.36
      expect(result.bands[4]!.tax).toBe(334056.36);
      expect(result.totalTax).toBe(385400.53);
    });
  });

  describe('flat tax (single open-ended bracket)', () => {
    it('applies a single rate to the full salary', () => {
      const result = calculateTax(100000, [{ min: 0, rate: 0.2 }]);

      expect(result.totalTax).toBe(20000);
      expect(result.effectiveRate).toBe(0.2);
      expect(result.bands).toHaveLength(1);
    });
  });

  describe('bracket boundary', () => {
    it('taxes income exactly at a bracket boundary only in lower bracket', () => {
      // $50,197 is the exact top of the first bracket — no spillover into the second
      const result = calculateTax(50197, BRACKETS_2022);

      expect(result.bands[0]!.tax).toBe(7529.55);
      expect(result.bands[1]!.tax).toBe(0);
    });

    it('taxes one dollar above a bracket boundary in both brackets', () => {
      const result = calculateTax(50198, BRACKETS_2022);

      expect(result.bands[0]!.tax).toBe(7529.55);
      // $1 * 0.205 = $0.21 (rounded)
      expect(result.bands[1]!.tax).toBe(0.21);
    });
  });

  describe('additional edge cases', () => {
    it('salary exactly at $50,197 boundary has zero taxable income in the second bracket', () => {
      const result = calculateTax(50197, BRACKETS_2022);

      // All income is consumed by the first bracket; taxable portion in band[1] is 0
      expect(result.bands[1]!.tax).toBe(0);
      expect(result.totalTax).toBe(7529.55);
    });

    it('calculates without numeric overflow for a very large salary ($999,999,999)', () => {
      const result = calculateTax(999_999_999, BRACKETS_2022);

      expect(Number.isFinite(result.totalTax)).toBe(true);
      expect(result.totalTax).toBeGreaterThan(0);
      // Top bracket: (999999999 - 221708) * 0.33
      const expectedTopBandTax =
        Math.round((999_999_999 - 221_708) * 0.33 * 100) / 100;
      expect(result.bands[4]!.tax).toBe(expectedTopBandTax);
    });

    it('returns zero total tax when the single bracket has rate 0', () => {
      const result = calculateTax(75000, [{ min: 0, rate: 0 }]);

      expect(result.totalTax).toBe(0);
      expect(result.effectiveRate).toBe(0);
      expect(result.bands).toHaveLength(1);
    });

    it('returns tax equal to salary when the single bracket has rate 1', () => {
      const result = calculateTax(75000, [{ min: 0, rate: 1 }]);

      expect(result.totalTax).toBe(75000);
      expect(result.effectiveRate).toBe(1);
    });

    it('handles adjacent brackets with rate 0 and rate 1 at their exact boundary values', () => {
      const brackets = [
        { min: 0, max: 50000, rate: 0 },
        { min: 50000, rate: 1 },
      ];
      const result = calculateTax(100000, brackets);

      // Band 0: $50,000 * 0 = $0
      expect(result.bands[0]!.tax).toBe(0);
      // Band 1: $50,000 * 1 = $50,000
      expect(result.bands[1]!.tax).toBe(50000);
      expect(result.totalTax).toBe(50000);
    });
  });
});
