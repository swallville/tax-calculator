import { renderHook } from '@testing-library/react';

import * as entitySelectors from '#/entities/tax-brackets/model/selectors';

import { useCalculatorState } from './useCalculatorState';

describe('useCalculatorState', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('returns isPending=false, hasResults=false, hasError=false in initial state', () => {
    jest
      .spyOn(entitySelectors.selectors, 'useIsPending')
      .mockReturnValue(false);
    jest.spyOn(entitySelectors.selectors, 'useError').mockReturnValue(null);
    jest.spyOn(entitySelectors.selectors, 'useBands').mockReturnValue([]);

    const { result } = renderHook(() => useCalculatorState());

    expect(result.current.isPending).toBe(false);
    expect(result.current.hasResults).toBe(false);
    expect(result.current.hasError).toBe(false);
  });

  it('returns isPending=true when query is in-flight', () => {
    jest.spyOn(entitySelectors.selectors, 'useIsPending').mockReturnValue(true);
    jest.spyOn(entitySelectors.selectors, 'useError').mockReturnValue(null);
    jest.spyOn(entitySelectors.selectors, 'useBands').mockReturnValue([]);

    const { result } = renderHook(() => useCalculatorState());

    expect(result.current.isPending).toBe(true);
    expect(result.current.hasResults).toBe(false);
    expect(result.current.hasError).toBe(false);
  });

  it('returns hasError=true when error exists', () => {
    jest
      .spyOn(entitySelectors.selectors, 'useIsPending')
      .mockReturnValue(false);
    jest
      .spyOn(entitySelectors.selectors, 'useError')
      .mockReturnValue('Something went wrong');
    jest.spyOn(entitySelectors.selectors, 'useBands').mockReturnValue([]);

    const { result } = renderHook(() => useCalculatorState());

    expect(result.current.hasError).toBe(true);
    expect(result.current.hasResults).toBe(false);
  });

  it('returns hasResults=true when bands are populated', () => {
    jest
      .spyOn(entitySelectors.selectors, 'useIsPending')
      .mockReturnValue(false);
    jest.spyOn(entitySelectors.selectors, 'useError').mockReturnValue(null);
    jest
      .spyOn(entitySelectors.selectors, 'useBands')
      .mockReturnValue([{ min: 0, max: 50197, rate: 0.15, tax: 7500 }]);

    const { result } = renderHook(() => useCalculatorState());

    expect(result.current.hasResults).toBe(true);
    expect(result.current.hasError).toBe(false);
  });

  it('returns hasError=true even when bands also exist (error takes priority in UI)', () => {
    jest
      .spyOn(entitySelectors.selectors, 'useIsPending')
      .mockReturnValue(false);
    jest.spyOn(entitySelectors.selectors, 'useError').mockReturnValue('Error');
    jest
      .spyOn(entitySelectors.selectors, 'useBands')
      .mockReturnValue([{ min: 0, max: 50197, rate: 0.15, tax: 7500 }]);

    const { result } = renderHook(() => useCalculatorState());

    expect(result.current.hasError).toBe(true);
    expect(result.current.hasResults).toBe(true);
  });
});
