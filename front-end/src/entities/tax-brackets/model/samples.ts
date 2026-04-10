import { sample } from 'effector';

import { logger } from '#/shared/lib/logger';
import { calculateTax } from '#/shared/lib/tax';

import { taxBracketsQuery } from './effects';
import { mapError } from './errorMapping';
import { calculateRequested, setBrackets, setError } from './events';
import { $taxBrackets } from './store';

// `sample()` wires Effector units declaratively — it describes reactive
// relationships rather than imperative calls. Each block below reads as:
// "whenever [clock] fires, optionally read [source], transform via [fn],
// and send the result to [target]."

// Step 1 — forward the user's intent to the query layer.
// Only `year` is extracted because `fetchTaxBracketsFx` takes a single number.
// `salary` is already stored via the `calculateRequested` .on() handler in
// store.ts and will be read in step 2.
sample({
  clock: calculateRequested,
  fn: ({ year }) => year,
  target: taxBracketsQuery.start,
});

// Step 2 — compute tax once the API response is Zod-validated.
//
// `clock: taxBracketsQuery.finished.success` (not `fetchTaxBracketsFx.doneData`)
// is intentional: `finished.success` fires only after the Farfetched contract
// has validated the response shape. Using the raw effect's done event would
// bypass Zod and risk passing malformed data into `calculateTax`.
//
// `source: $taxBrackets` is necessary because `salary` must be read at
// response time, not at request time. The event payload is gone by the time
// the async fetch resolves; storing it in the store (via the .on() handler in
// store.ts) makes it reliably available here as the sample's source.
sample({
  clock: taxBracketsQuery.finished.success,
  source: $taxBrackets,
  fn: ({ salary }, { result }) => {
    const calcResult = calculateTax(salary, result.tax_brackets);
    // Log aggregates only — never log salary to avoid PII in log streams.
    logger.info(
      {
        totalTax: calcResult.totalTax,
        effectiveRate: calcResult.effectiveRate,
      },
      'Tax calculated',
    );
    return calcResult;
  },
  target: setBrackets,
});

// Step 3 — surface a user-friendly error when the query fails.
// `mapError` translates raw API errors into the structured `ErrorType` the
// store and UI expect. Centralizing this here keeps error-handling logic out
// of both the effect and the store.
sample({
  clock: taxBracketsQuery.finished.failure,
  fn: ({ error }) => mapError(error),
  target: setError,
});
