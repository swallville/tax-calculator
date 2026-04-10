import { renderHook, act } from '@testing-library/react';

import * as entitySelectors from '#/entities/tax-brackets/model/selectors';

import { useRetryCalculation } from './useRetryCalculation';

describe('useRetryCalculation', () => {
  const mockCalculateRequested = jest.fn();

  beforeEach(() => {
    jest.restoreAllMocks();
    jest
      .spyOn(entitySelectors.selectors, 'useCalculateRequested')
      .mockReturnValue(
        mockCalculateRequested as unknown as ReturnType<
          typeof entitySelectors.selectors.useCalculateRequested
        >,
      );
  });

  it('returns a function', () => {
    jest.spyOn(entitySelectors.selectors, 'useSalary').mockReturnValue(100000);
    jest.spyOn(entitySelectors.selectors, 'useYear').mockReturnValue(2022);

    const { result } = renderHook(() => useRetryCalculation());

    expect(typeof result.current).toBe('function');
  });

  it('dispatches calculateRequested with stored salary and year', () => {
    jest.spyOn(entitySelectors.selectors, 'useSalary').mockReturnValue(75000);
    jest.spyOn(entitySelectors.selectors, 'useYear').mockReturnValue(2021);

    const { result } = renderHook(() => useRetryCalculation());

    act(() => {
      result.current();
    });

    expect(mockCalculateRequested).toHaveBeenCalledTimes(1);
    expect(mockCalculateRequested).toHaveBeenCalledWith({
      salary: 75000,
      year: 2021,
    });
  });

  it('uses current store values on each call', () => {
    jest.spyOn(entitySelectors.selectors, 'useSalary').mockReturnValue(50000);
    jest.spyOn(entitySelectors.selectors, 'useYear').mockReturnValue(2020);

    const { result } = renderHook(() => useRetryCalculation());

    act(() => {
      result.current();
    });

    expect(mockCalculateRequested).toHaveBeenCalledWith({
      salary: 50000,
      year: 2020,
    });
  });

  it('returns a stable function reference (memoized via useCallback)', () => {
    jest.spyOn(entitySelectors.selectors, 'useSalary').mockReturnValue(100000);
    jest.spyOn(entitySelectors.selectors, 'useYear').mockReturnValue(2022);

    const { result, rerender } = renderHook(() => useRetryCalculation());

    const firstRef = result.current;
    rerender();
    const secondRef = result.current;

    expect(firstRef).toBe(secondRef);
  });
});
