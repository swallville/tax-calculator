import { VALID_YEARS, DEFAULT_YEAR } from '#/entities/tax-brackets';
import { render, screen } from '#/shared/lib/test/test-utils';

import { YearSelect } from './YearSelect';

describe('YearSelect', () => {
  it('renders label "Tax Year"', () => {
    render(<YearSelect disabled={false} />);
    expect(screen.getByLabelText(/tax year/i)).toBeInTheDocument();
  });

  it('label is associated with the select via htmlFor', () => {
    render(<YearSelect disabled={false} />);
    expect(screen.getByLabelText(/tax year/i)).toBeInTheDocument();
  });

  it('has data-testid="year-select"', () => {
    render(<YearSelect disabled={false} />);
    expect(screen.getByTestId('year-select')).toBeInTheDocument();
  });

  it('renders exactly as many options as VALID_YEARS contains', () => {
    render(<YearSelect disabled={false} />);
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(VALID_YEARS.length);
  });

  it('renders an option for every year in VALID_YEARS', () => {
    render(<YearSelect disabled={false} />);
    for (const year of VALID_YEARS) {
      expect(
        screen.getByRole('option', { name: String(year) }),
      ).toBeInTheDocument();
    }
  });

  it('default selected value is DEFAULT_YEAR (last element of VALID_YEARS)', () => {
    render(<YearSelect disabled={false} />);
    const select = screen.getByTestId('year-select') as HTMLSelectElement;
    // defaultValue sets the initial DOM selection; cast to read .value
    expect(Number(select.value)).toBe(DEFAULT_YEAR);
  });

  it('DEFAULT_YEAR equals the last element of VALID_YEARS', () => {
    expect(DEFAULT_YEAR).toBe(VALID_YEARS[VALID_YEARS.length - 1]);
  });

  it('shows error message when error prop is provided', () => {
    render(
      <YearSelect
        disabled={false}
        error={['Please select a valid tax year']}
      />,
    );
    expect(screen.getByTestId('year-error')).toHaveTextContent(
      'Please select a valid tax year',
    );
  });

  it('does not render error element when error prop is absent', () => {
    render(<YearSelect disabled={false} />);
    expect(screen.queryByTestId('year-error')).not.toBeInTheDocument();
  });

  it('sets aria-invalid when error is present', () => {
    render(<YearSelect disabled={false} error={['Invalid year']} />);
    expect(screen.getByTestId('year-select')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });

  it('sets aria-invalid to false when no error', () => {
    render(<YearSelect disabled={false} />);
    expect(screen.getByTestId('year-select')).toHaveAttribute(
      'aria-invalid',
      'false',
    );
  });

  it('is disabled when disabled=true', () => {
    render(<YearSelect disabled={true} />);
    expect(screen.getByTestId('year-select')).toBeDisabled();
  });

  it('is enabled when disabled=false', () => {
    render(<YearSelect disabled={false} />);
    expect(screen.getByTestId('year-select')).not.toBeDisabled();
  });

  it('error alert role is present for screen readers', () => {
    render(<YearSelect disabled={false} error={['Required']} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});
