import { render, screen } from '#/shared/lib/test/test-utils';

import { LoadingState } from './LoadingState';

describe('LoadingState', () => {
  it('has status role', () => {
    render(<LoadingState />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('has accessible label announcing loading', () => {
    render(<LoadingState />);
    expect(screen.getByRole('status')).toHaveAttribute(
      'aria-label',
      'Loading tax calculation',
    );
  });

  it('renders sr-only text for screen readers', () => {
    render(<LoadingState />);
    expect(screen.getByTestId('loading-text')).toBeInTheDocument();
  });

  it('renders skeleton placeholder rows', () => {
    const { container } = render(<LoadingState />);
    // 5 skeleton row divs are rendered
    const skeletonRows = container.querySelectorAll('.animate-pulse');
    expect(skeletonRows.length).toBeGreaterThanOrEqual(5);
  });
});
