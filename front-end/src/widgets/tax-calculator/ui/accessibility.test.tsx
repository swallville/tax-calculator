import { axe, toHaveNoViolations } from 'jest-axe';

import * as entitySelectors from '#/entities/tax-brackets/model/selectors';
import { render } from '#/shared/lib/test/test-utils';

import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';
import { LoadingState } from './LoadingState';
import { TaxBreakdown } from './TaxBreakdown';
import { TaxForm } from './TaxForm';

expect.extend(toHaveNoViolations);

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
  jest.spyOn(entitySelectors.selectors, 'useIsPending').mockReturnValue(false);
  jest
    .spyOn(entitySelectors.selectors, 'useResetResults')
    .mockReturnValue(
      jest.fn() as unknown as ReturnType<
        typeof entitySelectors.selectors.useResetResults
      >,
    );
});

describe('Accessibility (axe)', () => {
  it('TaxForm has no a11y violations', async () => {
    const { container } = render(<TaxForm />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('EmptyState has no a11y violations', async () => {
    const { container } = render(<EmptyState />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('LoadingState has no a11y violations', async () => {
    const { container } = render(<LoadingState />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('ErrorState (server_error) has no a11y violations', async () => {
    jest
      .spyOn(entitySelectors.selectors, 'useError')
      .mockReturnValue('Something went wrong.');
    jest
      .spyOn(entitySelectors.selectors, 'useErrorType')
      .mockReturnValue('server_error');
    jest.spyOn(entitySelectors.selectors, 'useSalary').mockReturnValue(100000);
    jest.spyOn(entitySelectors.selectors, 'useYear').mockReturnValue(2022);

    const { container } = render(<ErrorState />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('ErrorState (not_found) has no a11y violations', async () => {
    jest
      .spyOn(entitySelectors.selectors, 'useError')
      .mockReturnValue('Unsupported tax year.');
    jest
      .spyOn(entitySelectors.selectors, 'useErrorType')
      .mockReturnValue('not_found');
    jest.spyOn(entitySelectors.selectors, 'useSalary').mockReturnValue(100000);
    jest.spyOn(entitySelectors.selectors, 'useYear').mockReturnValue(2022);

    const { container } = render(<ErrorState />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('TaxBreakdown has no a11y violations', async () => {
    jest
      .spyOn(entitySelectors.selectors, 'useTotalTax')
      .mockReturnValue(17739.17);
    jest
      .spyOn(entitySelectors.selectors, 'useEffectiveRate')
      .mockReturnValue(0.1774);
    jest.spyOn(entitySelectors.selectors, 'useBands').mockReturnValue([
      { min: 0, max: 50197, rate: 0.15, tax: 7529.55 },
      { min: 50197, max: 100392, rate: 0.205, tax: 10209.62 },
    ]);

    const { container } = render(<TaxBreakdown />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
