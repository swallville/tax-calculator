// Side-effect import: activates the Effector sample() wiring when any
// consumer imports from this barrel. Do not remove — there is no
// TypeScript error if it disappears, but the reactive graph goes dead.
import './model/samples';

export type { ErrorType } from './types';
export {
  TaxFormInputSchema,
  VALID_YEARS,
  DEFAULT_YEAR,
} from './model/apiSchema';
export { selectors } from './model/selectors';
export { persistTaxBracketsStore } from './persistence';
