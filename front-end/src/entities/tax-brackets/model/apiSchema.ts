import { zodContract } from '@farfetched/zod';
import { z } from 'zod';

/**
 * Exhaustive list of tax years currently supported by the EY API.
 *
 * Declared `as const` so TypeScript infers a readonly tuple of literal numbers
 * rather than `number[]`. Both the Zod `.refine()` allowlist and the YearSelect
 * dropdown options derive from this single source of truth — add a year here
 * when the API starts returning brackets for it.
 */
export const VALID_YEARS = [2019, 2020, 2021, 2022] as const;

/** Union of every year in `VALID_YEARS`, e.g. `2019 | 2020 | 2021 | 2022`. */
type ValidYear = (typeof VALID_YEARS)[number];

/**
 * The most recent year in `VALID_YEARS`, used as the pre-selected option in
 * the tax year dropdown and as the initial year in the Effector store.
 *
 * Non-null assertion is safe: `VALID_YEARS` is a non-empty tuple literal.
 */
export const DEFAULT_YEAR: ValidYear = VALID_YEARS[VALID_YEARS.length - 1]!;

/**
 * Schema for a single tax bracket as returned by the API.
 *
 * `max` is optional because the top bracket has no upper bound.
 * `rate` is constrained to [0, 1] — a fraction, not a percentage — matching
 * the calculation logic in `#/shared/lib/tax`.
 */
export const TaxBracketSchema = z.object({
  min: z.number(),
  max: z.number().optional(),
  rate: z.number().min(0).max(1),
});

/**
 * Schema for the full API response envelope.
 *
 * Validates the `tax_brackets` array so downstream code can trust every
 * element conforms to `TaxBracketSchema` before any calculation runs.
 */
export const TaxBracketsResponseSchema = z.object({
  tax_brackets: z.array(TaxBracketSchema),
});

/**
 * Farfetched contract wrapping the response schema.
 *
 * Passed to `createQuery` so the framework rejects malformed responses before
 * they reach application logic — failures surface via `finished.failure`
 * rather than silent bad data.
 */
export const TaxBracketsResponseContract = zodContract(
  TaxBracketsResponseSchema,
);

/** Inferred TypeScript type for the validated API response. */
export type TaxBracketsResponse = z.infer<typeof TaxBracketsResponseSchema>;

/**
 * Schema for the user-facing tax form inputs before they are submitted.
 *
 * Validated client-side via `safeParse` with `useActionState` — gives
 * immediate feedback without a network round-trip.
 */
export const TaxFormInputSchema = z.object({
  salary: z
    .number({ invalid_type_error: 'Please enter a valid number' })
    // `.finite()` rejects Infinity/-Infinity that `.number()` alone allows;
    // those values would silently produce NaN in the tax calculation.
    .finite('Please enter a valid number')
    .min(0, 'Salary cannot be negative'),
  year: z
    .number()
    // `.refine()` is used instead of `.enum()` because the valid years are a
    // runtime allowlist, not a TypeScript union. Keeps the constraint in one
    // place — add a year here when the API supports it.
    .refine(
      y => VALID_YEARS.includes(y as ValidYear),
      'Please select a valid tax year (2019-2022)',
    ),
});

