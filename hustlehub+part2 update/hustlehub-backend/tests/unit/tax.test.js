const { estimateTax, monthlyIncome, TAX_BRACKETS } = require('../../src/utils/tax');

describe('estimateTax', () => {
  it('returns zero tax for zero income', () => {
    const r = estimateTax(0);
    expect(r.estimatedTax).toBe(0);
    expect(r.netIncome).toBe(0);
    expect(r.effectiveRate).toBe(0);
  });

  it('does not tax income inside the tax-free bracket', () => {
    expect(estimateTax(500).estimatedTax).toBe(0);
  });

  it('taxes only the portion of income inside each bracket (progressive)', () => {
    // 500 @0% + 1500 @10% + 1000 @18% = 0 + 150 + 180
    const r = estimateTax(3000);
    expect(r.estimatedTax).toBe(330);
    expect(r.netIncome).toBe(2670);
    expect(r.effectiveRate).toBe(11);
    expect(r.marginalRate).toBe(18);
  });

  it('applies the top bracket to very large incomes', () => {
    // 0 + 150 + 540 + 1300 + (10000 @36%) = 5590
    expect(estimateTax(20000).estimatedTax).toBe(5590);
  });

  it('never taxes more than the income earned and net + tax = gross', () => {
    [1, 499.99, 2000, 7500, 123456.78].forEach((income) => {
      const r = estimateTax(income);
      expect(r.estimatedTax).toBeLessThanOrEqual(income);
      expect(Math.round((r.estimatedTax + r.netIncome) * 100) / 100).toBe(r.totalIncome);
    });
  });

  it('breakdown tax values add up to the estimated tax', () => {
    const r = estimateTax(8000);
    const sum = r.breakdown.reduce((s, b) => s + b.tax, 0);
    expect(Math.round(sum * 100) / 100).toBe(r.estimatedTax);
  });

  it('rejects invalid income values', () => {
    expect(() => estimateTax(-1)).toThrow(RangeError);
    expect(() => estimateTax(NaN)).toThrow(RangeError);
    expect(() => estimateTax('100')).toThrow(RangeError);
  });

  it('has strictly increasing brackets', () => {
    for (let i = 1; i < TAX_BRACKETS.length; i += 1) {
      expect(TAX_BRACKETS[i].upTo).toBeGreaterThan(TAX_BRACKETS[i - 1].upTo);
    }
  });
});

describe('monthlyIncome', () => {
  it('returns a continuous list of months and sums income per month', () => {
    const now = new Date(Date.UTC(2026, 9, 15)); // 15 Oct 2026
    const result = monthlyIncome(
      [
        { amount: 100, createdAt: new Date(Date.UTC(2026, 9, 1)) },
        { amount: 50, createdAt: new Date(Date.UTC(2026, 9, 20)) },
        { amount: 75, createdAt: new Date(Date.UTC(2026, 7, 5)) },
        { amount: 999, createdAt: new Date(Date.UTC(2025, 0, 1)) }, // outside the window
      ],
      3,
      now
    );
    expect(result).toEqual([
      { month: '2026-08', income: 75 },
      { month: '2026-09', income: 0 },
      { month: '2026-10', income: 150 },
    ]);
  });
});
