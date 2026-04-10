import { render, screen } from '#/shared/lib/test/test-utils';

import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('renders heading and descriptive message', () => {
    render(<EmptyState />);
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.getByTestId('empty-state-description')).toBeInTheDocument();
  });

  it('has status role for screen readers', () => {
    render(<EmptyState />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('has accessible label linked to heading via aria-labelledby', () => {
    render(<EmptyState />);
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-labelledby', 'empty-state-heading');
    expect(screen.getByRole('heading', { level: 2 })).toHaveAttribute(
      'id',
      'empty-state-heading',
    );
  });

  it('renders without selectors or props', () => {
    const { container } = render(<EmptyState />);
    expect(container.firstChild).not.toBeNull();
  });
});
