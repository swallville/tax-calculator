'use client';
// The Effector `sample()` wiring that connects calculateRequested to the
// fetch effect is activated automatically when any consumer imports from the
// tax-brackets entity barrel — the barrel itself loads the samples module as
// a side effect. This component's imports from `#/widgets/tax-calculator` (and
// the widgets' transitive imports from `#/entities/tax-brackets`) trigger the
// activation, so no direct side-effect import is needed here. The previous
// explicit `import '#/entities/tax-brackets/model/samples'` was a landmine —
// it bypassed the public barrel and would silently deactivate all wiring if
// a future developer removed what looked like a "dead" import. Fixed in
// Phase 8.5 architecture review.
import {
  EmptyState,
  ErrorState,
  LoadingState,
  TaxBreakdown,
  TaxForm,
} from '#/widgets/tax-calculator';
import { useCalculatorState } from '#/widgets/tax-calculator/lib';

export default function Home() {
  const { isPending, hasResults, hasError } = useCalculatorState();

  return (
    <>
      <a
        href="#main-content"
        data-testid="skip-link"
        className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:top-4 focus-visible:left-4 focus-visible:z-50 focus-visible:bg-btn-primary focus-visible:text-white focus-visible:px-4 focus-visible:py-2 focus-visible:rounded-xl focus-visible:text-sm focus-visible:font-semibold"
      >
        Skip to content
      </a>
      <main
        id="main-content"
        data-testid="main-content"
        className="flex flex-1 flex-col gap-6 px-4 py-8 md:px-6 md:py-12 lg:items-start lg:gap-8 lg:px-12 lg:py-16 max-w-300 mx-auto w-full"
      >
        <h1 className="sr-only">Canadian Federal Tax Calculator</h1>
        <div className="flex flex-col gap-6 w-full lg:flex-row lg:items-start lg:gap-8">
          <TaxForm />
          {/* Persistent live region — must exist in DOM at page load so NVDA/JAWS
              register it before content changes. All four result states render
              inside this container rather than carrying their own aria-live. */}
          <div
            data-testid="results-panel"
            className="flex-1 min-w-0"
            aria-live="polite"
            aria-atomic="true"
          >
            {isPending && <LoadingState />}
            {/* Persistent alert wrapper — role="alert" must pre-exist in the DOM
                for NVDA/JAWS to announce it reliably when content is injected. */}
            <div role="alert" aria-label="Calculation error">
              {!isPending && hasError && <ErrorState />}
            </div>
            {!isPending && !hasError && hasResults && <TaxBreakdown />}
            {!isPending && !hasError && !hasResults && <EmptyState />}
          </div>
        </div>
      </main>
    </>
  );
}
