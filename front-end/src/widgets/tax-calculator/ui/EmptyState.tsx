/**
 * Placeholder shown in the results panel before the user submits their first
 * calculation.
 *
 * `role="status"` marks this as a live region with implicit `aria-live="polite"`.
 * Unlike `role="alert"` (assertive), status lets the screen reader finish
 * whatever it was announcing before describing this element, which is
 * appropriate here because there is no urgent information to communicate.
 */
export function EmptyState() {
  return (
    <div
      data-testid="empty-state"
      className="flex flex-col items-center justify-center text-center py-16 px-8 flex-1"
      role="status"
      aria-labelledby="empty-state-heading"
    >
      <svg
        className="w-16 h-16 text-text-muted/40 mb-6"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="4" y="2" width="16" height="20" rx="2" />
        <line x1="8" y1="6" x2="16" y2="6" />
        <line x1="8" y1="10" x2="10" y2="10" />
        <line x1="14" y1="10" x2="16" y2="10" />
        <line x1="8" y1="14" x2="10" y2="14" />
        <line x1="14" y1="14" x2="16" y2="14" />
        <line x1="8" y1="18" x2="16" y2="18" />
      </svg>
      <h2
        id="empty-state-heading"
        className="text-lg font-semibold text-text-primary mb-2"
      >
        Enter your salary
      </h2>
      <p
        data-testid="empty-state-description"
        className="text-sm text-text-muted max-w-70 leading-relaxed"
      >
        Input your annual income and select a tax year to see your Canadian
        federal tax breakdown.
      </p>
    </div>
  );
}
