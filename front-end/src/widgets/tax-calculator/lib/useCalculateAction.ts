'use client';
import { useActionState } from 'react';

import { selectors, TaxFormInputSchema } from '#/entities/tax-brackets';
import { parseCurrency } from '#/shared/lib/format';

/**
 * Transient validation state for the tax form.
 *
 * Separate from the Effector store — this tracks client-side Zod validation
 * errors that should never propagate to the global state layer.
 */
export type FormState = {
  errors: { salary?: string[]; year?: string[] };
  submitted: boolean;
};

const initialState: FormState = { errors: {}, submitted: false };

/**
 * Encapsulates the React 19 `useActionState` form action for tax calculation.
 *
 * Responsibilities:
 * - Parses currency-formatted salary input via `parseCurrency`
 * - Validates via `TaxFormInputSchema.safeParse`
 * - Dispatches `calculateRequested` on valid input
 *
 * Returns `[state, formAction, isPending]` — the form action is wired
 * directly to `<form action={formAction}>`.
 *
 * @example
 * ```tsx
 * const { state, formAction, isPending } = useCalculateAction();
 * return <form action={formAction}>...</form>;
 * ```
 */
export function useCalculateAction() {
  const calculateRequested = selectors.useCalculateRequested();
  const isPending = selectors.useIsPending();

  async function calculateAction(
    _prevState: FormState,
    formData: FormData,
  ): Promise<FormState> {
    const raw = {
      salary: parseCurrency(String(formData.get('salary') ?? '')),
      year: Number(formData.get('year')),
    };

    const result = TaxFormInputSchema.safeParse(raw);
    if (!result.success) {
      return { errors: result.error.flatten().fieldErrors, submitted: false };
    }

    calculateRequested({ salary: result.data.salary, year: result.data.year });
    return { errors: {}, submitted: true };
  }

  const [state, formAction] = useActionState<FormState, FormData>(
    calculateAction,
    initialState,
  );

  return { state, formAction, isPending };
}
