'use client';

import { useCalculateAction } from '../lib/useCalculateAction';

import { CalculateButton } from './CalculateButton';
import { SalaryInput } from './SalaryInput';
import { PANEL_CARD } from './styles';
import { YearSelect } from './YearSelect';

/**
 * Tax input form that collects annual salary and tax year, validates them,
 * and dispatches a calculation request into the Effector event bus.
 *
 * Uses React 19's `useActionState` (via `useCalculateAction` hook) for
 * progressive enhancement. Field rendering is delegated to sub-components
 * so each can evolve and be tested in isolation.
 */
export function TaxForm() {
  const { state, formAction, isPending } = useCalculateAction();

  return (
    <section
      data-testid="tax-form"
      className={`${PANEL_CARD} lg:w-110 lg:shrink-0`}
      aria-labelledby="tax-form-heading"
    >
      <h2
        id="tax-form-heading"
        className="text-[1.75rem] font-bold leading-tight tracking-tight text-text-primary mb-8"
      >
        Tax Calculator
      </h2>
      <form
        action={formAction}
        aria-label="Tax calculator"
        className="flex flex-col gap-6"
      >
        <SalaryInput error={state.errors.salary} disabled={isPending} />
        <YearSelect error={state.errors.year} disabled={isPending} />
        <CalculateButton isPending={isPending} />
      </form>
    </section>
  );
}
