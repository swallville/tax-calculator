// Side-effect import: activates the Effector sample() wiring at the moment
// this barrel is consumed. Previously the activation was a direct
// side-effect import from page.tsx reaching into #/entities/tax-brackets/model/samples,
// which bypassed the public API and was a silent landmine — a future
// developer "cleaning up" the internal-path import would have deactivated
// all reactive wiring with zero TypeScript error. Moving it here makes the
// activation implicit in any consumer of the entity barrel, which is the
// correct encapsulation boundary. See Phase 8.5 architecture review.
import './model/samples';

export type { ErrorType } from './types';
export {
  TaxFormInputSchema,
  VALID_YEARS,
  DEFAULT_YEAR,
} from './model/apiSchema';
export { selectors } from './model/selectors';
export { persistTaxBracketsStore } from './persistence';
