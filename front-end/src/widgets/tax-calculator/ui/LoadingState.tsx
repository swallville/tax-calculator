import { rowStripe } from './styles';

/**
 * Number of skeleton rows to render, matching the typical federal bracket count
 * for supported tax years (2019-2022). Keeping this in sync with the real
 * bracket count minimizes layout shift when TaxBreakdown replaces the skeleton.
 */
const SKELETON_ROW_COUNT = 5;

// Shared chrome for the pill-shaped skeleton bars. Width is the only
// per-instance variable, so callers append `w-[XX%]` (or `ml-auto`) instead
// of restating the colour, height, and rounding.
const SKELETON_BAR = 'h-3 rounded-full bg-text-muted/15';

/**
 * Skeleton placeholder shown while an API calculation is in-flight.
 *
 * The skeleton structure intentionally mirrors TaxBreakdown's visual layout
 * (heading, N data rows, total row) so there is no layout shift when the real
 * content replaces it. Row count matches the typical bracket count for
 * supported tax years, keeping the perceived transition seamless.
 *
 * The `sr-only` span at the bottom provides an accessible announcement for
 * screen readers because the animated skeleton divs carry no text content —
 * without it, AT users would receive no feedback that a calculation is running.
 */
export function LoadingState() {
  return (
    <div
      data-testid="loading-state"
      className="flex flex-col gap-5 flex-1"
      role="status"
      aria-label="Loading tax calculation"
      aria-busy="true"
    >
      {/* Heading skeleton — taller bar than body bars (h-5 vs h-3). */}
      <div className="h-5 w-[40%] rounded-full bg-text-muted/15 animate-pulse" />

      {/* Row skeletons — column widths approximate bracket/rate/tax proportions */}
      <div className="flex flex-col gap-3">
        {Array.from({ length: SKELETON_ROW_COUNT }, (_, i) => (
          <div
            key={i}
            className={`h-13 rounded-lg flex items-center gap-3 px-4 animate-pulse ${rowStripe(i)}`}
          >
            <div className={`${SKELETON_BAR} w-[45%]`} />
            <div className={`${SKELETON_BAR} w-[20%]`} />
            <div className={`${SKELETON_BAR} w-[25%] ml-auto`} />
          </div>
        ))}
      </div>

      {/* Total skeleton */}
      <div className="h-13 rounded-lg bg-bg-total animate-pulse flex items-center px-4">
        <div className={`${SKELETON_BAR} w-[30%]`} />
        <div className={`${SKELETON_BAR} w-[25%] ml-auto`} />
      </div>

      {/* Visible only to screen readers — the animated divs above are silent */}
      <span data-testid="loading-text" className="sr-only">
        Calculating your taxes...
      </span>
    </div>
  );
}
