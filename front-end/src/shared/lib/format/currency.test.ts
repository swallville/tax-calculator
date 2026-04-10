import { formatCurrency, formatPercent } from './currency';

describe('formatCurrency', () => {
  it('formats positive amounts with comma separator and two decimal places', () => {
    expect(formatCurrency(1234.56)).toMatch(/1,234\.56/);
  });

  it('formats zero as 0.00', () => {
    expect(formatCurrency(0)).toMatch(/0\.00/);
  });

  it('formats large amounts with comma separators', () => {
    expect(formatCurrency(1000000)).toMatch(/1,000,000\.00/);
  });

  it('rounds to 2 decimal places (half-up)', () => {
    expect(formatCurrency(1234.567)).toMatch(/1,234\.57/);
  });

  it('rounds down when third decimal is below 5', () => {
    expect(formatCurrency(1234.561)).toMatch(/1,234\.56/);
  });
});

describe('formatPercent', () => {
  it('formats a rate as a percentage with two decimal places', () => {
    expect(formatPercent(0.15)).toMatch(/15\.00%/);
  });

  it('formats zero rate as 0.00%', () => {
    expect(formatPercent(0)).toMatch(/0\.00%/);
  });

  it('formats a fractional effective rate correctly', () => {
    expect(formatPercent(0.1774)).toMatch(/17\.74%/);
  });

  it('formats 100% rate', () => {
    expect(formatPercent(1)).toMatch(/100\.00%/);
  });
});
