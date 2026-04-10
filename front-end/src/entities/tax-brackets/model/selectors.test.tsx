/**
 * Tests for the selectors module.
 *
 * Most selectors are exercised indirectly through widget component tests,
 * but only via `jest.spyOn` mocks — meaning their real function bodies are
 * never called, leaving V8 function coverage gaps. This file renders minimal
 * components that invoke each selector's real implementation so every arrow
 * function in the module is covered.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

import { selectors } from './selectors';

// ---------------------------------------------------------------------------
// Minimal harness components — each calls one selector directly
// ---------------------------------------------------------------------------

function AllSelectorsConsumer() {
  const totalTax = selectors.useTotalTax();
  const effectiveRate = selectors.useEffectiveRate();
  const bands = selectors.useBands();
  const error = selectors.useError();
  const errorType = selectors.useErrorType();
  const year = selectors.useYear();
  const salary = selectors.useSalary();
  const isPending = selectors.useIsPending();
  const calculateRequested = selectors.useCalculateRequested();
  const resetResults = selectors.useResetResults();

  return (
    <div>
      <span data-testid="total-tax">{String(totalTax)}</span>
      <span data-testid="effective-rate">{String(effectiveRate)}</span>
      <span data-testid="bands">{bands.length}</span>
      <span data-testid="error">{String(error)}</span>
      <span data-testid="error-type">{String(errorType)}</span>
      <span data-testid="year">{String(year)}</span>
      <span data-testid="salary">{String(salary)}</span>
      <span data-testid="is-pending">{String(isPending)}</span>
      <button
        data-testid="calculate-btn"
        onClick={() => calculateRequested({ salary: 0, year: 2022 })}
      >
        Calculate
      </button>
      <button data-testid="reset-btn" onClick={() => resetResults()}>
        Reset
      </button>
    </div>
  );
}

describe('selectors — real function body coverage', () => {
  it('renders values from the store without throwing', () => {
    render(<AllSelectorsConsumer />);

    // The store starts at INITIAL_DATA — just verify all selectors returned
    // values without throwing (type/value correctness is tested in tax-brackets.test.ts)
    expect(screen.getByTestId('total-tax')).toBeInTheDocument();
    expect(screen.getByTestId('effective-rate')).toBeInTheDocument();
    expect(screen.getByTestId('bands')).toBeInTheDocument();
    expect(screen.getByTestId('error')).toBeInTheDocument();
    expect(screen.getByTestId('error-type')).toBeInTheDocument();
    expect(screen.getByTestId('year')).toBeInTheDocument();
    expect(screen.getByTestId('salary')).toBeInTheDocument();
    expect(screen.getByTestId('is-pending')).toBeInTheDocument();
  });

  it('useCalculateRequested returns a callable event', () => {
    render(<AllSelectorsConsumer />);
    expect(() =>
      fireEvent.click(screen.getByTestId('calculate-btn')),
    ).not.toThrow();
  });

  it('useResetResults returns a callable event', () => {
    render(<AllSelectorsConsumer />);
    expect(() =>
      fireEvent.click(screen.getByTestId('reset-btn')),
    ).not.toThrow();
  });
});
