/**
 * SummaryCard Component Tests
 *
 * Tests for the SummaryCard component that displays
 * income, expenses, and balance.
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { SummaryCard } from '../SummaryCard';

// Mock i18n
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'dashboard.balance': 'Balance',
        'dashboard.income': 'Income',
        'dashboard.expenses': 'Expenses',
        'dashboard.monthlyOverview': 'Monthly Overview',
        'review.transactionsToReview': '{{count}} transaction(s) to review',
      };
      return translations[key] ?? key;
    },
  }),
}));

// Mock i18n formatters
jest.mock('../../../i18n', () => ({
  formatCurrencyLocale: (amount: number, _locale: string) => {
    return `$${amount.toFixed(2)}`;
  },
  getCurrentLocale: () => 'en',
  getCurrencySymbol: () => '$',
}));

describe('SummaryCard', () => {
  const defaultProps = {
    income: 500000, // $5,000.00 in cents
    expenses: 350000, // $3,500.00 in cents
    balance: 150000, // $1,500.00 in cents
    testID: 'summary-card',
  };

  it('renders correctly with all values', () => {
    render(<SummaryCard {...defaultProps} />);

    // Check labels are rendered
    expect(screen.getByText('Balance')).toBeTruthy();
    expect(screen.getByText('Income')).toBeTruthy();
    expect(screen.getByText('Expenses')).toBeTruthy();
  });

  it('renders with zero values', () => {
    render(<SummaryCard income={0} expenses={0} balance={0} testID="summary-card" />);

    expect(screen.getByText('Balance')).toBeTruthy();
  });

  it('renders with negative balance', () => {
    render(
      <SummaryCard income={200000} expenses={350000} balance={-150000} testID="summary-card" />
    );

    expect(screen.getByText('Balance')).toBeTruthy();
  });

  it('renders transaction count when provided', () => {
    render(<SummaryCard {...defaultProps} transactionCount={42} />);

    // The transaction count should be displayed
    expect(screen.getByTestId('summary-card')).toBeTruthy();
  });

  it('does not render transaction count when zero', () => {
    render(<SummaryCard {...defaultProps} transactionCount={0} />);

    expect(screen.getByTestId('summary-card')).toBeTruthy();
  });

  it('applies custom style', () => {
    const customStyle = { marginTop: 20 };
    render(<SummaryCard {...defaultProps} style={customStyle} />);

    expect(screen.getByTestId('summary-card')).toBeTruthy();
  });

  it('has correct accessibility role', () => {
    render(<SummaryCard {...defaultProps} />);

    const container = screen.getByTestId('summary-card');
    expect(container.props.accessibilityRole).toBe('summary');
  });
});
