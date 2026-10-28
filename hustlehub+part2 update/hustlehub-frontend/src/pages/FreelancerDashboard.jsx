import { useEffect, useState } from 'react';
import client, { apiErrorMessage } from '../api/client';
import Alert from '../components/Alert';
import IncomeBarChart from '../components/IncomeBarChart';
import TaxDonut from '../components/TaxDonut';
import { formatMoney, formatPercent } from '../utils/format';

// Freelancer income & tax dashboard: summary cards, charts and the bracket table.
// All figures come from GET /api/bookings/freelancer/tax-summary; the tax
// calculation itself is done on the server (src/utils/tax.js), never in the browser.
export default function FreelancerDashboard() {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    client
      .get('/bookings/freelancer/tax-summary')
      .then((res) => {
        if (active) setSummary(res.data);
      })
      .catch((err) => {
        if (active) setError(apiErrorMessage(err, 'Could not load your income summary.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="page">
      <h2>Income &amp; Tax Dashboard</h2>

      <Alert type="error" message={error} />

      {loading && <p>Loading…</p>}

      {!loading && summary && (
        <>
          <div className="stat-grid" data-testid="stat-grid">
            <div className="stat-card">
              <span className="stat-label">Gross income</span>
              <strong data-testid="stat-gross">{formatMoney(summary.totalIncome)}</strong>
              <small>{summary.transactionCount} transaction(s)</small>
            </div>
            <div className="stat-card">
              <span className="stat-label">Estimated tax</span>
              <strong data-testid="stat-tax">{formatMoney(summary.estimatedTax)}</strong>
              <small>Effective rate {formatPercent(summary.effectiveRate)}</small>
            </div>
            <div className="stat-card">
              <span className="stat-label">Net income</span>
              <strong data-testid="stat-net">{formatMoney(summary.netIncome)}</strong>
              <small>After estimated tax</small>
            </div>
            <div className="stat-card">
              <span className="stat-label">Marginal rate</span>
              <strong data-testid="stat-marginal">{formatPercent(summary.marginalRate)}</strong>
              <small>Rate on your next earnings</small>
            </div>
          </div>

          {summary.transactionCount === 0 && (
            <p data-testid="empty-state">
              You have no income yet. Once clients book your gigs, your earnings and estimated tax will appear here.
            </p>
          )}

          <div className="chart-grid">
            <section className="chart-card">
              <h3>Income per month</h3>
              <IncomeBarChart data={summary.monthly} />
            </section>
            <section className="chart-card">
              <h3>Net income vs estimated tax</h3>
              <TaxDonut netIncome={summary.netIncome} estimatedTax={summary.estimatedTax} />
            </section>
          </div>

          <section className="chart-card">
            <h3>How your tax was calculated</h3>
            <p>{summary.method}</p>
            <table className="table" data-testid="bracket-table">
              <thead>
                <tr>
                  <th>Income bracket</th>
                  <th>Rate</th>
                  <th>Your income in bracket</th>
                  <th>Tax</th>
                </tr>
              </thead>
              <tbody>
                {summary.breakdown.map((b) => (
                  <tr key={b.from}>
                    <td>
                      {formatMoney(b.from)} – {b.to === null ? 'and above' : formatMoney(b.to)}
                    </td>
                    <td>{formatPercent(Math.round(b.rate * 10000) / 100)}</td>
                    <td>{formatMoney(b.taxableInBracket)}</td>
                    <td>{formatMoney(b.tax)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="disclaimer">{summary.disclaimer}</p>
          </section>
        </>
      )}
    </div>
  );
}
