import userEvent from '@testing-library/user-event';

import * as entitySelectors from '#/entities/tax-brackets/model/selectors';
import { render, screen, waitFor } from '#/shared/lib/test/test-utils';

import { useCalculateAction } from './useCalculateAction';

/**
 * Test harness that renders a minimal form wired to useCalculateAction.
 * This exercises the hook end-to-end through a real form submission.
 */
function TestForm() {
  const { state, formAction, isPending } = useCalculateAction();
  return (
    <form action={formAction}>
      <input name="salary" data-testid="salary" />
      <input name="year" value="2022" readOnly data-testid="year" />
      <button type="submit" data-testid="submit" disabled={isPending}>
        {isPending ? 'Loading' : 'Submit'}
      </button>
      {state.errors.salary && (
        <p data-testid="salary-error">{state.errors.salary[0]}</p>
      )}
      {state.submitted && <p data-testid="submitted">OK</p>}
    </form>
  );
}

const mockCalculateRequested = jest.fn();

beforeEach(() => {
  jest.restoreAllMocks();
  mockCalculateRequested.mockClear();
  jest
    .spyOn(entitySelectors.selectors, 'useCalculateRequested')
    .mockReturnValue(
      mockCalculateRequested as unknown as ReturnType<
        typeof entitySelectors.selectors.useCalculateRequested
      >,
    );
  jest.spyOn(entitySelectors.selectors, 'useIsPending').mockReturnValue(false);
});

describe('useCalculateAction', () => {
  it('returns initial state with no errors and not submitted', () => {
    render(<TestForm />);
    expect(screen.queryByTestId('salary-error')).not.toBeInTheDocument();
    expect(screen.queryByTestId('submitted')).not.toBeInTheDocument();
  });

  it('dispatches calculateRequested on valid submission', async () => {
    const user = userEvent.setup();
    render(<TestForm />);

    await user.type(screen.getByTestId('salary'), '100000');
    await user.click(screen.getByTestId('submit'));

    await waitFor(() => {
      expect(mockCalculateRequested).toHaveBeenCalledWith({
        salary: 100000,
        year: 2022,
      });
    });
  });

  it('dispatches correctly with currency-formatted salary', async () => {
    const user = userEvent.setup();
    render(<TestForm />);

    await user.type(screen.getByTestId('salary'), '$100,000.00');
    await user.click(screen.getByTestId('submit'));

    await waitFor(() => {
      expect(mockCalculateRequested).toHaveBeenCalledWith({
        salary: 100000,
        year: 2022,
      });
    });
  });

  it('shows validation error for negative salary', async () => {
    const user = userEvent.setup();
    render(<TestForm />);

    await user.type(screen.getByTestId('salary'), '-5000');
    await user.click(screen.getByTestId('submit'));

    await waitFor(() => {
      expect(screen.getByTestId('salary-error')).toBeInTheDocument();
    });
    expect(mockCalculateRequested).not.toHaveBeenCalled();
  });

  it('shows validation error for non-numeric salary', async () => {
    const user = userEvent.setup();
    render(<TestForm />);

    await user.type(screen.getByTestId('salary'), 'abc');
    await user.click(screen.getByTestId('submit'));

    await waitFor(() => {
      expect(screen.getByTestId('salary-error')).toBeInTheDocument();
    });
    expect(mockCalculateRequested).not.toHaveBeenCalled();
  });

  it('reflects isPending from Effector selector', () => {
    jest.spyOn(entitySelectors.selectors, 'useIsPending').mockReturnValue(true);
    render(<TestForm />);
    expect(screen.getByTestId('submit')).toBeDisabled();
    expect(screen.getByTestId('submit')).toHaveTextContent('Loading');
  });
});
