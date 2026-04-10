import userEvent from '@testing-library/user-event';

import * as entitySelectors from '#/entities/tax-brackets/model/selectors';
import { render, screen } from '#/shared/lib/test/test-utils';

import { ErrorState } from './ErrorState';

const mockCalculateRequested = jest.fn();

beforeEach(() => {
  jest
    .spyOn(entitySelectors.selectors, 'useCalculateRequested')
    .mockReturnValue(
      mockCalculateRequested as unknown as ReturnType<
        typeof entitySelectors.selectors.useCalculateRequested
      >,
    );
  jest.spyOn(entitySelectors.selectors, 'useSalary').mockReturnValue(100000);
  jest.spyOn(entitySelectors.selectors, 'useYear').mockReturnValue(2022);
});

describe('ErrorState', () => {
  it('returns null when there is no error', () => {
    jest.spyOn(entitySelectors.selectors, 'useError').mockReturnValue(null);
    jest.spyOn(entitySelectors.selectors, 'useErrorType').mockReturnValue(null);
    const { container } = render(<ErrorState />);
    expect(container.firstChild).toBeNull();
  });

  it('returns null when errorType is null even if error text is set', () => {
    jest
      .spyOn(entitySelectors.selectors, 'useError')
      .mockReturnValue('Some error');
    jest.spyOn(entitySelectors.selectors, 'useErrorType').mockReturnValue(null);
    const { container } = render(<ErrorState />);
    expect(container.firstChild).toBeNull();
  });

  it('renders error container when an error is present', () => {
    jest
      .spyOn(entitySelectors.selectors, 'useError')
      .mockReturnValue('Something went wrong.');
    jest
      .spyOn(entitySelectors.selectors, 'useErrorType')
      .mockReturnValue('server_error');
    render(<ErrorState />);
    // role="alert" is on the persistent page wrapper, not ErrorState itself
    expect(screen.getByTestId('error-state')).toBeInTheDocument();
  });

  it('renders server_error with title "Calculation Failed" and retry button', () => {
    jest
      .spyOn(entitySelectors.selectors, 'useError')
      .mockReturnValue('Something went wrong. Please try again.');
    jest
      .spyOn(entitySelectors.selectors, 'useErrorType')
      .mockReturnValue('server_error');
    render(<ErrorState />);
    expect(screen.getByTestId('error-title')).toHaveTextContent(
      'Calculation Failed',
    );
    expect(
      screen.getByRole('button', { name: /try again/i }),
    ).toBeInTheDocument();
  });

  it('displays the error message text for server_error', () => {
    jest
      .spyOn(entitySelectors.selectors, 'useError')
      .mockReturnValue('Something went wrong. Please try again.');
    jest
      .spyOn(entitySelectors.selectors, 'useErrorType')
      .mockReturnValue('server_error');
    render(<ErrorState />);
    expect(screen.getByTestId('error-message')).toHaveTextContent(
      'Something went wrong. Please try again.',
    );
  });

  it('renders not_found error with title "Year Not Supported" and no retry button', () => {
    jest
      .spyOn(entitySelectors.selectors, 'useError')
      .mockReturnValue('Unsupported tax year.');
    jest
      .spyOn(entitySelectors.selectors, 'useErrorType')
      .mockReturnValue('not_found');
    render(<ErrorState />);
    expect(screen.getByTestId('error-title')).toHaveTextContent(
      'Year Not Supported',
    );
    expect(
      screen.queryByRole('button', { name: /try again/i }),
    ).not.toBeInTheDocument();
  });

  it('calls calculateRequested with stored salary and year when retry is clicked', async () => {
    const user = userEvent.setup();

    jest
      .spyOn(entitySelectors.selectors, 'useError')
      .mockReturnValue('Something went wrong. Please try again.');
    jest
      .spyOn(entitySelectors.selectors, 'useErrorType')
      .mockReturnValue('server_error');
    jest.spyOn(entitySelectors.selectors, 'useSalary').mockReturnValue(75000);
    jest.spyOn(entitySelectors.selectors, 'useYear').mockReturnValue(2021);

    render(<ErrorState />);
    await user.click(screen.getByRole('button', { name: /try again/i }));

    expect(mockCalculateRequested).toHaveBeenCalledWith({
      salary: 75000,
      year: 2021,
    });
  });

  it('renders without overflow when the error string is 500 characters long', () => {
    const longError = 'E'.repeat(500);
    jest
      .spyOn(entitySelectors.selectors, 'useError')
      .mockReturnValue(longError);
    jest
      .spyOn(entitySelectors.selectors, 'useErrorType')
      .mockReturnValue('server_error');

    render(<ErrorState />);

    // ErrorState must still render the full text without truncation
    const errorContainer = screen.getByTestId('error-state');
    expect(errorContainer).toBeInTheDocument();
    expect(errorContainer).toHaveTextContent(longError);
  });
});
