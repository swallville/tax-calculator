import {
  TaxBracketSchema,
  TaxBracketsResponseSchema,
  TaxBracketsResponseContract,
  TaxFormInputSchema,
  VALID_YEARS,
  DEFAULT_YEAR,
} from './apiSchema';

describe('VALID_YEARS', () => {
  it('contains exactly [2019, 2020, 2021, 2022]', () => {
    expect([...VALID_YEARS]).toEqual([2019, 2020, 2021, 2022]);
  });

  it('has four entries', () => {
    expect(VALID_YEARS).toHaveLength(4);
  });

  it('is ordered ascending', () => {
    const sorted = [...VALID_YEARS].sort((a, b) => a - b);
    expect([...VALID_YEARS]).toEqual(sorted);
  });
});

describe('DEFAULT_YEAR', () => {
  it('equals the last element of VALID_YEARS', () => {
    expect(DEFAULT_YEAR).toBe(VALID_YEARS[VALID_YEARS.length - 1]);
  });

  it('is 2022', () => {
    expect(DEFAULT_YEAR).toBe(2022);
  });
});

describe('TaxBracketSchema', () => {
  it('accepts a valid bracket with max', () => {
    const result = TaxBracketSchema.safeParse({
      min: 0,
      max: 50197,
      rate: 0.15,
    });
    expect(result.success).toBe(true);
  });

  it('accepts a valid bracket without max (top bracket)', () => {
    const result = TaxBracketSchema.safeParse({ min: 221708, rate: 0.33 });
    expect(result.success).toBe(true);
  });

  it('rejects rate above 1', () => {
    const result = TaxBracketSchema.safeParse({
      min: 0,
      max: 50000,
      rate: 1.5,
    });
    expect(result.success).toBe(false);
  });

  it('rejects rate below 0', () => {
    const result = TaxBracketSchema.safeParse({
      min: 0,
      max: 50000,
      rate: -0.1,
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing min', () => {
    const result = TaxBracketSchema.safeParse({ max: 50000, rate: 0.15 });
    expect(result.success).toBe(false);
  });

  it('rejects non-numeric rate', () => {
    const result = TaxBracketSchema.safeParse({ min: 0, rate: 'fifteen' });
    expect(result.success).toBe(false);
  });
});

describe('TaxBracketsResponseSchema', () => {
  it('accepts a valid response with multiple brackets', () => {
    const result = TaxBracketsResponseSchema.safeParse({
      tax_brackets: [
        { min: 0, max: 50197, rate: 0.15 },
        { min: 50197, max: 100392, rate: 0.205 },
        { min: 100392, rate: 0.26 },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('accepts empty brackets array', () => {
    const result = TaxBracketsResponseSchema.safeParse({ tax_brackets: [] });
    expect(result.success).toBe(true);
  });

  it('rejects missing tax_brackets field', () => {
    const result = TaxBracketsResponseSchema.safeParse({ brackets: [] });
    expect(result.success).toBe(false);
  });

  it('rejects when tax_brackets is not an array', () => {
    const result = TaxBracketsResponseSchema.safeParse({
      tax_brackets: 'invalid',
    });
    expect(result.success).toBe(false);
  });

  it('rejects when a bracket inside is malformed', () => {
    const result = TaxBracketsResponseSchema.safeParse({
      tax_brackets: [{ min: 0, rate: 2.0 }], // rate > 1
    });
    expect(result.success).toBe(false);
  });

  it('strips unexpected extra fields (default Zod strip mode)', () => {
    const result = TaxBracketsResponseSchema.safeParse({
      tax_brackets: [{ min: 0, max: 50197, rate: 0.15 }],
      extra_field: 'should be stripped',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty('extra_field');
    }
  });
});

describe('TaxBracketsResponseContract', () => {
  it('validates a correct response', () => {
    const data = { tax_brackets: [{ min: 0, max: 50197, rate: 0.15 }] };
    expect(TaxBracketsResponseContract.isData(data)).toBe(true);
    expect(TaxBracketsResponseContract.getErrorMessages(data)).toEqual([]);
  });

  it('rejects a malformed response', () => {
    const data = { wrong_key: [] };
    expect(TaxBracketsResponseContract.isData(data)).toBe(false);
    const errors = TaxBracketsResponseContract.getErrorMessages(data);
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe('TaxFormInputSchema', () => {
  it('accepts valid salary and year', () => {
    const result = TaxFormInputSchema.safeParse({ salary: 100000, year: 2022 });
    expect(result.success).toBe(true);
  });

  it('accepts zero salary', () => {
    const result = TaxFormInputSchema.safeParse({ salary: 0, year: 2022 });
    expect(result.success).toBe(true);
  });

  it('rejects negative salary', () => {
    const result = TaxFormInputSchema.safeParse({ salary: -5000, year: 2022 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.salary).toBeDefined();
    }
  });

  it('rejects NaN salary', () => {
    const result = TaxFormInputSchema.safeParse({ salary: NaN, year: 2022 });
    expect(result.success).toBe(false);
  });

  it('rejects Infinity salary', () => {
    const result = TaxFormInputSchema.safeParse({
      salary: Infinity,
      year: 2022,
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-numeric salary', () => {
    const result = TaxFormInputSchema.safeParse({ salary: 'abc', year: 2022 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.salary?.[0]).toContain(
        'valid number',
      );
    }
  });

  it.each([2019, 2020, 2021, 2022])('accepts valid year %i', year => {
    const result = TaxFormInputSchema.safeParse({ salary: 50000, year });
    expect(result.success).toBe(true);
  });

  it.each([2018, 2023, 2024, 0, -1])('rejects invalid year %i', year => {
    const result = TaxFormInputSchema.safeParse({ salary: 50000, year });
    expect(result.success).toBe(false);
  });

  it('rejects non-numeric year', () => {
    const result = TaxFormInputSchema.safeParse({
      salary: 50000,
      year: 'twenty',
    });
    expect(result.success).toBe(false);
  });

  it('accepts salary of exactly 0 as a valid edge value', () => {
    // salary = 0 represents "no income" — schema must not reject it
    const result = TaxFormInputSchema.safeParse({ salary: 0, year: 2022 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.salary).toBe(0);
    }
  });

  it('accepts Number.MAX_SAFE_INTEGER as salary (extreme but structurally valid)', () => {
    const result = TaxFormInputSchema.safeParse({
      salary: Number.MAX_SAFE_INTEGER,
      year: 2022,
    });
    // The schema validates structure, not business-level reasonableness
    expect(result.success).toBe(true);
  });
});

describe('TaxBracketSchema — rate boundary values', () => {
  it('accepts rate of exactly 0 (lower inclusive boundary)', () => {
    const result = TaxBracketSchema.safeParse({ min: 0, max: 50000, rate: 0 });
    expect(result.success).toBe(true);
  });

  it('accepts rate of exactly 1 (upper inclusive boundary)', () => {
    const result = TaxBracketSchema.safeParse({ min: 0, max: 50000, rate: 1 });
    expect(result.success).toBe(true);
  });
});

describe('TaxBracketsResponseSchema — large arrays', () => {
  it('validates a response containing 100 bracket items without error', () => {
    const brackets = Array.from({ length: 100 }, (_, i) => ({
      min: i * 10000,
      max: (i + 1) * 10000,
      rate: 0.1,
    }));

    const result = TaxBracketsResponseSchema.safeParse({
      tax_brackets: brackets,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tax_brackets).toHaveLength(100);
    }
  });
});
