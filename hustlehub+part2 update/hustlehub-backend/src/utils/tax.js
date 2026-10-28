'use strict';
// Tax estimation for freelancers.
//
// METHOD (also shown to freelancers in the dashboard and documented in the README)
//  * Gross income  = sum of all completed transaction amounts received by the freelancer.
//  * The estimate uses a PROGRESSIVE (marginal) bracket model: only the part of
//    the income that falls inside a bracket is taxed at that bracket's rate.
//    A freelancer therefore never "loses" money by moving into a higher bracket.
//  * Tax = sum over brackets of (income inside the bracket x bracket rate).
//  * Net income    = gross income - estimated tax.
//  * Effective rate = estimated tax / gross income (what share is really paid).
//  * Marginal rate  = rate applied to the next unit of income earned.
//
// The brackets below are a simplified, illustrative model sized for the
// small-value gigs on this platform. They are NOT official tax tables; to use
// official tables (e.g. SARS) replace the TAX_BRACKETS array - nothing else changes.

const TAX_BRACKETS = [
  { upTo: 500, rate: 0 },
  { upTo: 2000, rate: 0.1 },
  { upTo: 5000, rate: 0.18 },
  { upTo: 10000, rate: 0.26 },
  { upTo: Infinity, rate: 0.36 },
];

const TAX_METHOD_DESCRIPTION =
  'Progressive bracket estimate: only the portion of your income inside each bracket is taxed at that bracket\'s rate. ' +
  'Estimated tax is the sum of the tax from every bracket; net income is gross income minus estimated tax.';

const TAX_DISCLAIMER =
  'This is an approximate estimate for planning purposes only and is not professional tax advice.';

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

function estimateTax(totalIncome, brackets = TAX_BRACKETS) {
  if (typeof totalIncome !== 'number' || !Number.isFinite(totalIncome) || totalIncome < 0) {
    throw new RangeError('Income must be a non-negative finite number.');
  }

  let lower = 0;
  let tax = 0;
  let marginalRate = brackets[0].rate;
  const breakdown = [];

  for (const bracket of brackets) {
    const upper = bracket.upTo;
    const taxableInBracket = Math.max(0, Math.min(totalIncome, upper) - lower);
    const bracketTax = taxableInBracket * bracket.rate;

    breakdown.push({
      from: lower,
      to: upper === Infinity ? null : upper,
      rate: bracket.rate,
      taxableInBracket: round2(taxableInBracket),
      tax: round2(bracketTax),
    });

    if (totalIncome > lower) marginalRate = bracket.rate;
    tax += bracketTax;
    lower = upper;
    if (totalIncome <= upper) break;
  }

  const estimatedTax = round2(tax);
  return {
    totalIncome: round2(totalIncome),
    estimatedTax,
    netIncome: round2(totalIncome - estimatedTax),
    effectiveRate: totalIncome > 0 ? round2((estimatedTax / totalIncome) * 100) : 0,
    marginalRate: round2(marginalRate * 100),
    breakdown,
  };
}

// Groups transactions into the last `months` calendar months (UTC), including
// months with no income so the chart has a continuous x-axis.
function monthlyIncome(transactions, months = 6, now = new Date()) {
  const buckets = [];
  for (let i = months - 1; i >= 0; i -= 1) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    buckets.push({ month: key, income: 0 });
  }

  for (const t of transactions) {
    const d = new Date(t.createdAt);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    const bucket = buckets.find((b) => b.month === key);
    if (bucket) bucket.income = round2(bucket.income + t.amount);
  }

  return buckets;
}

module.exports = {
  TAX_BRACKETS,
  TAX_METHOD_DESCRIPTION,
  TAX_DISCLAIMER,
  estimateTax,
  monthlyIncome,
};
