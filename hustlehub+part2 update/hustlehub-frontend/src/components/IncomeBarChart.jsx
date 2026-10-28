import { formatMoney, formatMonth } from '../utils/format';

// Dependency-free SVG bar chart of income per month.
// Rendering charts with plain SVG avoids adding a third-party charting library
// (smaller bundle, fewer dependencies to audit).
export default function IncomeBarChart({ data = [] }) {
  const width = 480;
  const height = 220;
  const pad = { top: 16, right: 12, bottom: 34, left: 52 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  const max = Math.max(1, ...data.map((d) => d.income));
  const barSlot = data.length ? innerW / data.length : innerW;
  const barW = Math.min(46, barSlot * 0.6);
  const ticks = [...new Set([0, 0.5, 1].map((f) => Math.round(max * f)))];

  const summary = data.map((d) => `${formatMonth(d.month)}: ${formatMoney(d.income)}`).join(', ');

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`Monthly income bar chart. ${summary}`}
      className="chart-svg"
      data-testid="income-bar-chart"
    >
      {ticks.map((t) => {
        const y = pad.top + innerH - (t / max) * innerH;
        return (
          <g key={t}>
            <line x1={pad.left} x2={width - pad.right} y1={y} y2={y} stroke="#e3e3ee" />
            <text x={pad.left - 6} y={y + 4} textAnchor="end" fontSize="10" fill="#666">
              {t}
            </text>
          </g>
        );
      })}

      {data.map((d, i) => {
        const h = (d.income / max) * innerH;
        const x = pad.left + i * barSlot + (barSlot - barW) / 2;
        const y = pad.top + innerH - h;
        return (
          <g key={d.month}>
            <rect x={x} y={y} width={barW} height={h} rx="3" fill="#4b4bff" data-testid="income-bar">
              <title>{`${formatMonth(d.month)}: ${formatMoney(d.income)}`}</title>
            </rect>
            <text x={x + barW / 2} y={height - 14} textAnchor="middle" fontSize="10" fill="#444">
              {formatMonth(d.month).split(' ')[0]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
