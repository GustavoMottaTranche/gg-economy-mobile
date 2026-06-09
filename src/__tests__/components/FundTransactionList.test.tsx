/**
 * FundTransactionList Component Tests
 *
 * Tests for the FundTransactionList component:
 * - Renders empty state when no transactions are provided
 * - Displays transaction title, formatted amount, date, and reference month
 * - Shows muted styling and "future" badge for future-dated transactions
 * - Does not show badge for current/past month transactions
 *
 * **Validates: Requirements 8.4, 8.5, 9.2, 9.3**
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { FundTransactionList } from '../../components/future-plans/FundTransactionList';
import { useThemeStore } from '../../stores/themeStore';
import type { FundTransactionWithDetails } from '../../repositories/FundTransactionRepository';

// Mock i18n
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'futurePlans.transactions.noLinkedTransactions': 'No linked transactions',
        'futurePlans.transactions.futureIndicator': 'future',
      };
      return translations[key] ?? key;
    },
  }),
}));

// Mock i18n formatters
jest.mock('../../i18n', () => ({
  formatCurrencyLocale: (amount: number, _locale: string) => `R$ ${amount.toFixed(2)}`,
  getCurrentLocale: () => 'pt-BR',
}));

// Mock getReferenceMonth to return a fixed current month for deterministic tests
jest.mock('../../utils/formatDate', () => ({
  getReferenceMonth: () => '2024-06',
}));

describe('FundTransactionList', () => {
  const pastTransaction: FundTransactionWithDetails = {
    id: 'ft-1',
    fundId: 'fund-1',
    transactionId: 'tx-1',
    createdAt: '2024-05-10T00:00:00.000Z',
    title: 'Flight tickets',
    amount: 150000, // R$ 1,500.00
    referenceMonth: '2024-05',
    date: '2024-05-10',
    isPaid: true,
  };

  const currentTransaction: FundTransactionWithDetails = {
    id: 'ft-2',
    fundId: 'fund-1',
    transactionId: 'tx-2',
    createdAt: '2024-06-15T00:00:00.000Z',
    title: 'Hotel booking',
    amount: 80000, // R$ 800.00
    referenceMonth: '2024-06',
    date: '2024-06-15',
    isPaid: true,
  };

  const futureTransaction: FundTransactionWithDetails = {
    id: 'ft-3',
    fundId: 'fund-1',
    transactionId: 'tx-3',
    createdAt: '2024-07-01T00:00:00.000Z',
    title: 'Tour package',
    amount: 200000, // R$ 2,000.00
    referenceMonth: '2024-07',
    date: '2024-07-01',
    isPaid: false,
  };

  beforeEach(() => {
    useThemeStore.setState({ resolvedScheme: 'light', preference: 'light' });
  });

  describe('empty state', () => {
    it('displays empty message when no transactions', () => {
      render(<FundTransactionList transactions={[]} testID="fund-tx-list" />);

      expect(screen.getByText('No linked transactions')).toBeTruthy();
      expect(screen.getByTestId('fund-tx-list-empty')).toBeTruthy();
    });
  });

  describe('transaction rendering', () => {
    it('displays transaction title', () => {
      render(<FundTransactionList transactions={[pastTransaction]} testID="fund-tx-list" />);

      expect(screen.getByText('Flight tickets')).toBeTruthy();
    });

    it('displays formatted amount', () => {
      render(<FundTransactionList transactions={[pastTransaction]} testID="fund-tx-list" />);

      // 150000 cents / 100 = 1500.00
      expect(screen.getByText('R$ 1500.00')).toBeTruthy();
    });

    it('displays formatted date and reference month', () => {
      render(<FundTransactionList transactions={[pastTransaction]} testID="fund-tx-list" />);

      // date: 2024-05-10 → 10/05, referenceMonth: 2024-05 → 05/2024
      expect(screen.getByText('10/05 • 05/2024')).toBeTruthy();
    });

    it('renders multiple transactions', () => {
      render(
        <FundTransactionList
          transactions={[pastTransaction, currentTransaction, futureTransaction]}
          testID="fund-tx-list"
        />
      );

      expect(screen.getByText('Flight tickets')).toBeTruthy();
      expect(screen.getByText('Hotel booking')).toBeTruthy();
      expect(screen.getByText('Tour package')).toBeTruthy();
    });
  });

  describe('future transaction styling', () => {
    it('shows "future" badge for transactions with referenceMonth > current month', () => {
      render(<FundTransactionList transactions={[futureTransaction]} testID="fund-tx-list" />);

      expect(screen.getByText('future')).toBeTruthy();
      expect(screen.getByTestId('fund-tx-list-future-badge-ft-3')).toBeTruthy();
    });

    it('does not show "future" badge for past month transactions', () => {
      render(<FundTransactionList transactions={[pastTransaction]} testID="fund-tx-list" />);

      expect(screen.queryByText('future')).toBeNull();
    });

    it('does not show "future" badge for current month transactions', () => {
      render(<FundTransactionList transactions={[currentTransaction]} testID="fund-tx-list" />);

      expect(screen.queryByText('future')).toBeNull();
    });

    it('applies muted styling (futureItem opacity) to future transactions', () => {
      render(<FundTransactionList transactions={[futureTransaction]} testID="fund-tx-list" />);

      const futureItem = screen.getByTestId('fund-tx-list-item-ft-3');
      const flatStyle = Array.isArray(futureItem.props.style)
        ? Object.assign({}, ...futureItem.props.style.filter(Boolean))
        : futureItem.props.style;
      expect(flatStyle.opacity).toBe(0.6);
    });

    it('does not apply muted opacity to current/past transactions', () => {
      render(<FundTransactionList transactions={[currentTransaction]} testID="fund-tx-list" />);

      const item = screen.getByTestId('fund-tx-list-item-ft-2');
      const flatStyle = Array.isArray(item.props.style)
        ? Object.assign({}, ...item.props.style.filter(Boolean))
        : item.props.style;
      expect(flatStyle.opacity).toBeUndefined();
    });
  });

  describe('test IDs', () => {
    it('assigns testID to container', () => {
      render(<FundTransactionList transactions={[pastTransaction]} testID="fund-tx-list" />);

      expect(screen.getByTestId('fund-tx-list')).toBeTruthy();
    });

    it('assigns testID to each transaction item', () => {
      render(<FundTransactionList transactions={[pastTransaction]} testID="fund-tx-list" />);

      expect(screen.getByTestId('fund-tx-list-item-ft-1')).toBeTruthy();
    });

    it('does not render testIDs when testID prop is not provided', () => {
      render(<FundTransactionList transactions={[pastTransaction]} />);

      expect(screen.queryByTestId('fund-tx-list')).toBeNull();
    });
  });
});
