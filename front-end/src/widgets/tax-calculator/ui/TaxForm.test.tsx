import userEvent from '@testing-library/user-event';

import * as entitySelectors from '#/entities/tax-brackets/model/selectors';
import { render, screen, waitFor } from '#/shared/lib/test/test-utils';

import { TaxForm } from './TaxForm';

const mockCalculateRequested = jest.fn();

beforeEach(() => {
  jest
    .spyOn(entitySelectors.selectors, 'useCalculateRequested')
    .mockReturnValue(
      mockCalculateRequested as unknown as ReturnType<
        typeof entitySelectors.selectors.useCalculateRequested
      >,
    );
  jest.spyOn(entitySelectors.selectors, 'useIsPending').mockReturnValue(false);
});

describe('TaxForm', () => {
  it('renders salary input and year dropdown', () => {
    render(<TaxForm />);
    expect(screen.getByLabelText(/annual income/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/tax year/i)).toBeInTheDocument();
  });

  it('renders calculate button', () => {
    render(<TaxForm />);
    expect(
      screen.getByRole('button', { name: /calculate/i }),
    ).toBeInTheDocument();
  });

  it('shows Calculating... and disables button when pending', () => {
    jest.spyOn(entitySelectors.selectors, 'useIsPending').mockReturnValue(true);
    render(<TaxForm />);
    const btn = screen.getByRole('button', { name: /calculating/i });
    expect(btn).toBeDisabled();
  });

  it('has year options 2019 through 2022', () => {
    render(<TaxForm />);
    const select = screen.getByLabelText(/tax year/i);
    expect(select).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '2022' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '2021' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '2020' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '2019' })).toBeInTheDocument();
  });

  it('input and select are enabled when not pending', () => {
    render(<TaxForm />);
    expect(screen.getByLabelText(/annual income/i)).not.toBeDisabled();
    expect(screen.getByLabelText(/tax year/i)).not.toBeDisabled();
  });

  it('input and select are disabled when pending', () => {
    jest.spyOn(entitySelectors.selectors, 'useIsPending').mockReturnValue(true);
    render(<TaxForm />);
    expect(screen.getByLabelText(/annual income/i)).toBeDisabled();
    expect(screen.getByLabelText(/tax year/i)).toBeDisabled();
  });
});

describe('TaxForm — calculateAction (form submission)', () => {
  it('calls calculateRequested with salary and year on valid submission', async () => {
    const user = userEvent.setup();
    render(<TaxForm />);

    await user.type(screen.getByLabelText(/annual income/i), '100000');
    await user.click(screen.getByRole('button', { name: /calculate/i }));

    await waitFor(() => {
      expect(mockCalculateRequested).toHaveBeenCalledWith({
        salary: 100000,
        year: 2022,
      });
    });
  });

  it('shows salary-error when salary is negative', async () => {
    const user = userEvent.setup();
    render(<TaxForm />);

    await user.type(screen.getByLabelText(/annual income/i), '-5000');
    await user.click(screen.getByRole('button', { name: /calculate/i }));

    await waitFor(() => {
      expect(screen.getByTestId('salary-error')).toBeInTheDocument();
    });
    expect(mockCalculateRequested).not.toHaveBeenCalled();
  });

  it('shows salary-error when salary is non-numeric text', async () => {
    const user = userEvent.setup();
    render(<TaxForm />);

    // 'abc' → Number('abc') === NaN → fails Zod finite/type check
    await user.type(screen.getByLabelText(/annual income/i), 'abc');
    await user.click(screen.getByRole('button', { name: /calculate/i }));

    await waitFor(() => {
      expect(screen.getByTestId('salary-error')).toBeInTheDocument();
    });
    expect(mockCalculateRequested).not.toHaveBeenCalled();
  });
});
