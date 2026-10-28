import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import FreelancerDashboard from '../pages/FreelancerDashboard';
import client from '../api/client';

vi.mock('../api/client', async () => {
  const actual = await vi.importActual('../api/client');
  return {
    ...actual,
    default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
  };
});

const summary = {
  totalIncome: 3000,
  estimatedTax: 330,
  netIncome: 2670,
  effectiveRate: 11,
  marginalRate: 18,
  transactionCount: 2,
  monthly: [
    { month: '2026-08', income: 0 },
    { month: '2026-09', income: 1000 },
    { month: '2026-10', income: 2000 },
  ],
  breakdown: [
    { from: 0, to: 500, rate: 0, taxableInBracket: 500, tax: 0 },
    { from: 500, to: 2000, rate: 0.1, taxableInBracket: 1500, tax: 150 },
    { from: 2000, to: null, rate: 0.18, taxableInBracket: 1000, tax: 180 },
  ],
  method: 'Progressive bracket estimate.',
  disclaimer: 'Approximate estimate only.',
};

describe('FreelancerDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows income, tax and net income from the API', async () => {
    client.get.mockResolvedValue({ data: summary });
    render(<FreelancerDashboard />);

    expect(await screen.findByTestId('stat-gross')).toHaveTextContent('$3,000.00');
    expect(screen.getByTestId('stat-tax')).toHaveTextContent('$330.00');
    expect(screen.getByTestId('stat-net')).toHaveTextContent('$2,670.00');
    expect(screen.getByTestId('stat-marginal')).toHaveTextContent('18%');
    expect(client.get).toHaveBeenCalledWith('/bookings/freelancer/tax-summary');
  });

  it('renders both charts and the bracket explanation', async () => {
    client.get.mockResolvedValue({ data: summary });
    render(<FreelancerDashboard />);

    expect(await screen.findByTestId('income-bar-chart')).toBeInTheDocument();
    expect(screen.getAllByTestId('income-bar')).toHaveLength(3);
    expect(screen.getByTestId('tax-donut')).toBeInTheDocument();
    expect(screen.getByTestId('bracket-table')).toBeInTheDocument();
    expect(screen.getByText('Progressive bracket estimate.')).toBeInTheDocument();
    expect(screen.getByText('Approximate estimate only.')).toBeInTheDocument();
  });

  it('shows an empty state when there is no income', async () => {
    client.get.mockResolvedValue({
      data: { ...summary, totalIncome: 0, estimatedTax: 0, netIncome: 0, transactionCount: 0, effectiveRate: 0, marginalRate: 0 },
    });
    render(<FreelancerDashboard />);
    expect(await screen.findByTestId('empty-state')).toBeInTheDocument();
  });

  it('shows the backend error message when loading fails', async () => {
    client.get.mockRejectedValue({ response: { data: { message: 'Invalid or expired token.' } } });
    render(<FreelancerDashboard />);
    expect(await screen.findByTestId('alert-error')).toHaveTextContent('Invalid or expired token.');
  });
});
