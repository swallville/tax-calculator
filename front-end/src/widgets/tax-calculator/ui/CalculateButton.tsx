/**
 * Submit button for the tax calculator form.
 *
 * Reflects the Effector-tracked async pending state rather than React's own
 * `useActionState` isPending — the async API call outlives the synchronous
 * action duration, so the button must stay disabled for the full request window.
 */
interface CalculateButtonProps {
  /**
   * Whether an API request is currently in-flight.
   *
   * Sourced from the Effector store via `selectors.useIsPending()` rather than
   * `useActionState`'s third element, which only covers the synchronous phase
   * of the action function.
   */
  isPending: boolean;
}

/**
 * Full-width submit button that switches its label between "Calculate" and
 * "Calculating..." and becomes disabled while a request is pending.
 *
 * `aria-busy` communicates the loading state to assistive technologies without
 * requiring a separate live region for this element.
 */
export function CalculateButton({ isPending }: CalculateButtonProps) {
  return (
    <button
      type="submit"
      data-testid="calculate-button"
      disabled={isPending}
      aria-busy={isPending}
      className="bg-btn-primary text-white rounded-xl h-12 w-full font-semibold text-[0.9375rem] hover:bg-btn-primary-hover hover:scale-[1.02] active:bg-btn-primary-active active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-200 mt-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-card"
    >
      {isPending ? 'Calculating...' : 'Calculate'}
    </button>
  );
}
