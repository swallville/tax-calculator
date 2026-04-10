import { selectors as mockSelectors } from '#/entities/tax-brackets';
import { render, screen } from '#/shared/lib/test/test-utils';

import Home from './page';

// Mock widgets to simple stubs
jest.mock('#/widgets/tax-calculator', () => ({
  TaxForm: () => <div data-testid="tax-form" />,
  TaxBreakdown: () => <div data-testid="tax-breakdown" />,
  EmptyState: () => <div data-testid="empty-state" />,
  LoadingState: () => <div data-testid="loading-state" />,
  ErrorState: () => <div data-testid="error-state" />,
}));

// Mock samples side-effect import
jest.mock('#/entities/tax-brackets/model/samples', () => ({}));

// jest.mock factories are hoisted above variable declarations, so mockSelectors
// cannot be referenced inside the factory. Define the mock inline and obtain a
// reference to the selectors object after the mock is registered.
jest.mock('#/entities/tax-brackets', () => ({
  selectors: {
    useIsPending: jest.fn().mockReturnValue(false),
    useError: jest.fn().mockReturnValue(null),
    useBands: jest.fn().mockReturnValue([]),
    useCalculateRequested: jest.fn().mockReturnValue(jest.fn()),
    useResetResults: jest.fn().mockReturnValue(jest.fn()),
    useTotalTax: jest.fn().mockReturnValue(0),
    useEffectiveRate: jest.fn().mockReturnValue(0),
    useErrorType: jest.fn().mockReturnValue(null),
    useYear: jest.fn().mockReturnValue(2022),
    useSalary: jest.fn().mockReturnValue(0),
  },
  TaxFormInputSchema: { safeParse: jest.fn() },
}));

describe('Home page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockSelectors.useIsPending as jest.Mock).mockReturnValue(false);
    (mockSelectors.useError as jest.Mock).mockReturnValue(null);
    (mockSelectors.useBands as jest.Mock).mockReturnValue([]);
  });

  it('renders TaxForm always', () => {
    render(<Home />);
    expect(screen.getByTestId('tax-form')).toBeInTheDocument();
  });

  it('renders EmptyState when no results and no error', () => {
    render(<Home />);
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.queryByTestId('tax-breakdown')).not.toBeInTheDocument();
    expect(screen.queryByTestId('error-state')).not.toBeInTheDocument();
    expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
  });

  it('renders LoadingState when pending', () => {
    (mockSelectors.useIsPending as jest.Mock).mockReturnValue(true);
    render(<Home />);
    expect(screen.getByTestId('loading-state')).toBeInTheDocument();
    expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument();
  });

  it('renders ErrorState when error exists', () => {
    (mockSelectors.useError as jest.Mock).mockReturnValue(
      'Something went wrong',
    );
    render(<Home />);
    expect(screen.getByTestId('error-state')).toBeInTheDocument();
    expect(screen.queryByTestId('tax-breakdown')).not.toBeInTheDocument();
  });

  it('renders TaxBreakdown when results exist', () => {
    (mockSelectors.useBands as jest.Mock).mockReturnValue([
      { min: 0, max: 50197, rate: 0.15, tax: 7500 },
    ]);
    render(<Home />);
    expect(screen.getByTestId('tax-breakdown')).toBeInTheDocument();
    expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument();
  });

  it('has skip-to-content link', () => {
    render(<Home />);
    expect(screen.getByTestId('skip-link')).toBeInTheDocument();
  });

  it('has main landmark', () => {
    render(<Home />);
    expect(screen.getByRole('main')).toBeInTheDocument();
  });
});
