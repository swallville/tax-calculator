import * as entitySelectors from '#/entities/tax-brackets/model/selectors';
import type { BandBreakdown } from '#/shared/lib/tax';
import { render, screen } from '#/shared/lib/test/test-utils';

import { TaxBreakdown } from './TaxBreakdown';

const MOCK_BANDS: BandBreakdown[] = [
  { min: 0, max: 50197, rate: 0.15, tax: 7529.55 },
  { min: 50197, max: 100392, rate: 0.205, tax: 10209.62 },
];

function setupMocks(
  opts: {
    totalTax?: number;
    effectiveRate?: number;
    bands?: BandBreakdown[];
  } = {},
) {
  const {
    totalTax = 17739.17,
    effectiveRate = 0.1774,
    bands = MOCK_BANDS,
  } = opts;
  jest
    .spyOn(entitySelectors.selectors, 'useTotalTax')
    .mockReturnValue(totalTax);
  jest
    .spyOn(entitySelectors.selectors, 'useEffectiveRate')
    .mockReturnValue(effectiveRate);
  jest.spyOn(entitySelectors.selectors, 'useBands').mockReturnValue(bands);
}

describe('TaxBreakdown', () => {
  it('renders heading and table', () => {
    setupMocks();
    render(<TaxBreakdown />);
    expect(screen.getByTestId('tax-breakdown-heading')).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('renders correct number of bracket rows — header + data rows + total', () => {
    setupMocks();
    render(<TaxBreakdown />);
    // 1 header row + 2 band rows in tbody + 1 total row in tfoot = 4
    const rows = screen.getAllByRole('row');
    expect(rows).toHaveLength(4);
  });

  it('displays the Effective Rate label', () => {
    setupMocks();
    render(<TaxBreakdown />);
    expect(screen.getByTestId('effective-rate')).toBeInTheDocument();
  });

  it('formats and displays total tax amount', () => {
    setupMocks();
    render(<TaxBreakdown />);
    // formatCurrency(17739.17) in en-CA locale
    expect(screen.getByTestId('total-row')).toHaveTextContent(/17,739/);
  });

  it('returns null when bands array is empty', () => {
    setupMocks({ totalTax: 0, effectiveRate: 0, bands: [] });
    const { container } = render(<TaxBreakdown />);
    expect(container.firstChild).toBeNull();
  });

  it('renders a row for each band in tbody', () => {
    setupMocks();
    render(<TaxBreakdown />);
    // 2 data rows expected
    expect(screen.getAllByRole('row')).toHaveLength(4); // header + 2 data + total
  });

  it('renders infinity symbol for the last bracket band that has no max', () => {
    setupMocks({
      bands: [
        { min: 0, max: 50197, rate: 0.15, tax: 7529.55 },
        // no max on this band — exercises the `max === undefined` branch
        { min: 50197, max: undefined, rate: 0.205, tax: 10209.62 },
      ],
    });
    render(<TaxBreakdown />);
    expect(screen.getByText(/∞/)).toBeInTheDocument();
  });

  it('formats and renders very large tax numbers without throwing', () => {
    setupMocks({
      totalTax: 329_867_000,
      effectiveRate: 0.3299,
      bands: [
        { min: 0, max: 50197, rate: 0.15, tax: 7_529.55 },
        { min: 50197, max: undefined, rate: 0.33, tax: 329_859_470.45 },
      ],
    });
    render(<TaxBreakdown />);

    // The table must still render
    expect(screen.getByRole('table')).toBeInTheDocument();
    // The large numbers should appear in at least one cell (band row and/or total row)
    expect(screen.getAllByText(/329/).length).toBeGreaterThanOrEqual(1);
  });

  it('renders exactly one data row when given a single bracket result', () => {
    setupMocks({
      totalTax: 20000,
      effectiveRate: 0.2,
      bands: [{ min: 0, max: undefined, rate: 0.2, tax: 20000 }],
    });
    render(<TaxBreakdown />);

    // 1 header row + 1 band row in tbody + 1 total row in tfoot = 3 rows total
    const rows = screen.getAllByRole('row');
    expect(rows).toHaveLength(3);
  });
});
