/**
 * Strips currency formatting characters (commas, dollar signs, spaces)
 * and returns a clean number. Accepts formats like:
 * - "100,000.00" → 100000
 * - "$100,000" → 100000
 * - "100000" → 100000
 * - "1,234,567.89" → 1234567.89
 * - "" → NaN
 * - "abc" → NaN
 */
export function parseCurrency(value: string): number {
  // Remove `$`, thousands-separator commas, and any surrounding whitespace.
  // The `\s` class covers regular spaces, non-breaking spaces, and tabs so
  // copy-pasted values from formatted documents are handled correctly.
  const cleaned = value.replace(/[$,\s]/g, '');
  // `Number('')` returns `0`, which would silently accept blank input as a
  // valid salary. Returning `NaN` instead lets callers distinguish between
  // "user typed nothing" and "user typed zero".
  return cleaned === '' ? NaN : Number(cleaned);
}
