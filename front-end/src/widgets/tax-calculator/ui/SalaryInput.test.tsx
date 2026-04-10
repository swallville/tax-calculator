import { render, screen } from '#/shared/lib/test/test-utils';

import { SalaryInput } from './SalaryInput';

describe('SalaryInput', () => {
  it('renders label "Annual Income"', () => {
    render(<SalaryInput disabled={false} />);
    expect(screen.getByLabelText(/annual income/i)).toBeInTheDocument();
  });

  it('label is associated with the input via htmlFor', () => {
    render(<SalaryInput disabled={false} />);
    // getByLabelText confirms the <label htmlFor="salary"> → <input id="salary"> link
    expect(screen.getByLabelText(/annual income/i)).toBeInTheDocument();
  });

  it('has data-testid="salary-input"', () => {
    render(<SalaryInput disabled={false} />);
    expect(screen.getByTestId('salary-input')).toBeInTheDocument();
  });

  it('renders the dollar sign prefix icon', () => {
    render(<SalaryInput disabled={false} />);
    // The SVG is wrapped in a <span aria-hidden="true"> — it is decorative.
    // We verify presence by querying the input's sibling container.
    const input = screen.getByTestId('salary-input');
    // The icon lives in the same relative wrapper as the input.
    const wrapper = input.parentElement;
    const icon = wrapper?.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });

  it('shows error message when error prop is provided', () => {
    render(
      <SalaryInput disabled={false} error={['Salary cannot be negative']} />,
    );
    expect(screen.getByTestId('salary-error')).toHaveTextContent(
      'Salary cannot be negative',
    );
  });

  it('does not render error element when error prop is absent', () => {
    render(<SalaryInput disabled={false} />);
    expect(screen.queryByTestId('salary-error')).not.toBeInTheDocument();
  });

  it('sets aria-invalid when error is present', () => {
    render(
      <SalaryInput disabled={false} error={['Please enter a valid number']} />,
    );
    expect(screen.getByTestId('salary-input')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });

  it('sets aria-invalid to false when no error', () => {
    render(<SalaryInput disabled={false} />);
    expect(screen.getByTestId('salary-input')).toHaveAttribute(
      'aria-invalid',
      'false',
    );
  });

  it('input is disabled when disabled=true', () => {
    render(<SalaryInput disabled={true} />);
    expect(screen.getByTestId('salary-input')).toBeDisabled();
  });

  it('input is enabled when disabled=false', () => {
    render(<SalaryInput disabled={false} />);
    expect(screen.getByTestId('salary-input')).not.toBeDisabled();
  });

  it('error alert role is present for screen readers', () => {
    render(<SalaryInput disabled={false} error={['Required']} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});
