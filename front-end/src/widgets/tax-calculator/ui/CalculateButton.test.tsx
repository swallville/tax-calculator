import { render, screen } from '#/shared/lib/test/test-utils';

import { CalculateButton } from './CalculateButton';

describe('CalculateButton', () => {
  it('has data-testid="calculate-button"', () => {
    render(<CalculateButton isPending={false} />);
    expect(screen.getByTestId('calculate-button')).toBeInTheDocument();
  });

  it('shows "Calculate" text when not pending', () => {
    render(<CalculateButton isPending={false} />);
    expect(
      screen.getByRole('button', { name: /^calculate$/i }),
    ).toBeInTheDocument();
  });

  it('shows "Calculating..." text when isPending=true', () => {
    render(<CalculateButton isPending={true} />);
    expect(
      screen.getByRole('button', { name: /calculating\.\.\./i }),
    ).toBeInTheDocument();
  });

  it('is enabled when isPending=false', () => {
    render(<CalculateButton isPending={false} />);
    expect(screen.getByTestId('calculate-button')).not.toBeDisabled();
  });

  it('is disabled when isPending=true', () => {
    render(<CalculateButton isPending={true} />);
    expect(screen.getByTestId('calculate-button')).toBeDisabled();
  });

  it('has aria-busy="true" when pending', () => {
    render(<CalculateButton isPending={true} />);
    expect(screen.getByTestId('calculate-button')).toHaveAttribute(
      'aria-busy',
      'true',
    );
  });

  it('has aria-busy="false" when not pending', () => {
    render(<CalculateButton isPending={false} />);
    expect(screen.getByTestId('calculate-button')).toHaveAttribute(
      'aria-busy',
      'false',
    );
  });

  it('is a submit button', () => {
    render(<CalculateButton isPending={false} />);
    expect(screen.getByTestId('calculate-button')).toHaveAttribute(
      'type',
      'submit',
    );
  });
});
