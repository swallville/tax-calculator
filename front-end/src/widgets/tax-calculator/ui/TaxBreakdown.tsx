'use client';
import { memo } from 'react';

import { selectors } from '#/entities/tax-brackets';
import { formatCurrency, formatPercent } from '#/shared/lib/format';
import type { BandBreakdown } from '#/shared/lib/tax/types';

import { PANEL_CARD, rowStripe } from './styles';

type BandRowProps = BandBreakdown & { index: number };

// All header cells share the same chrome — only the text alignment differs
// per column. Centralising these strings here keeps the <thead> readable.
const TH_BASE =
  'px-4 py-3 text-xs font-semibold uppercase tracking-widest text-text-muted';
const TD_BODY_BASE = 'px-4 py-3 font-mono text-sm text-text-secondary';

/**
 * A single tax-bracket row inside the results table.
 *
 * Memoised because TaxBreakdown re-renders on every Effector store tick, but
 * individual band values are stable once a calculation completes. Without
 * memo, every store subscription update would re-render all rows needlessly.
 *
 * `key={band.min}` (set at the call site) is preferred over array index
 * because bracket minimums are unique and stable across re-renders; using the
 * index would cause React to reuse DOM nodes incorrectly if the band list ever
 * changes order or length between tax years.
 */
const BandRow = memo(function BandRow({
  min,
  max,
  rate,
  tax,
  index,
}: BandRowProps) {
  const maxLabel = max ? formatCurrency(max) : '∞';
  return (
    <tr
      data-testid={`band-row-${index}`}
      className={`h-13 ${rowStripe(index)} hover:bg-bg-row-hover transition-colors duration-150`}
      // animationDelay cannot be expressed as a Tailwind utility without a
      // custom plugin — an inline style is the narrowest exception allowed
      // by project rules when a value is computed at runtime.
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <td className={`${TD_BODY_BASE} first:rounded-l-lg`}>
        {formatCurrency(min)} – {maxLabel}
      </td>
      <td className="px-4 py-3 font-mono text-label font-semibold text-text-accent text-right">
        {formatPercent(rate)}
      </td>
      <td className={`${TD_BODY_BASE} text-right last:rounded-r-lg`}>
        {formatCurrency(tax)}
      </td>
    </tr>
  );
});

/**
 * Displays the full per-bracket tax breakdown once a calculation succeeds.
 *
 * The section uses `aria-live="polite"` + `aria-atomic="true"` so that screen
 * readers announce the entire updated region as one coherent unit after each
 * calculation, rather than reading out individual cell changes piecemeal as
 * the DOM updates.
 */
export function TaxBreakdown() {
  const totalTax = selectors.useTotalTax();
  const effectiveRate = selectors.useEffectiveRate();
  const bands = selectors.useBands();

  if (bands.length === 0) return null;

  return (
    <section
      data-testid="tax-breakdown"
      className={`${PANEL_CARD} flex-1 min-w-0 flex flex-col gap-5 animate-fade-in-up`}
      aria-labelledby="tax-breakdown-heading"
    >
      <h2
        id="tax-breakdown-heading"
        data-testid="tax-breakdown-heading"
        className="text-xl font-semibold text-text-primary"
      >
        Tax Breakdown
      </h2>

      <div className="overflow-x-auto">
        <table data-testid="tax-table" className="w-full min-w-120">
          <thead>
            <tr className="border-b border-border-subtle">
              <th scope="col" className={`${TH_BASE} text-left`}>
                Bracket Range
              </th>
              <th scope="col" className={`${TH_BASE} text-right`}>
                Rate
              </th>
              <th scope="col" className={`${TH_BASE} text-right`}>
                Tax
              </th>
            </tr>
          </thead>
          <tbody>
            {bands.map((band, i) => (
              // key on band.min — bracket lower bounds are unique per year
              <BandRow key={band.min} {...band} index={i} />
            ))}
          </tbody>
          <tfoot>
            <tr
              data-testid="total-row"
              className="h-13 bg-bg-total border-t-2 border-border-subtle"
            >
              <th
                scope="row"
                className="px-4 py-3 font-mono text-sm font-semibold text-text-primary first:rounded-l-lg text-left"
              >
                Total Tax
              </th>
              <td aria-hidden="true" />
              <td
                className="px-4 py-3 font-mono text-sm font-bold text-text-primary text-right last:rounded-r-lg"
                aria-label={`Total Tax: ${formatCurrency(totalTax)}`}
              >
                {formatCurrency(totalTax)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div
        data-testid="effective-rate"
        className="flex items-center justify-between px-4 py-3"
      >
        <span className="text-sm font-medium text-text-secondary">
          Effective Rate
        </span>
        <span className="inline-flex items-center px-3 py-1 rounded-full bg-pill-bg text-pill-text font-mono text-label font-semibold">
          {formatPercent(effectiveRate)}
        </span>
      </div>
    </section>
  );
}
