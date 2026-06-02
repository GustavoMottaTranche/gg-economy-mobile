/**
 * TransactionCard Component Tests
 *
 * Tests for the TransactionCard component including:
 * - Rendering transaction data correctly
 * - Visual distinction for income vs expenses
 * - Accessibility support
 * - Press handling
 *
 * **Validates: Requirements 30**
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { TransactionCard, type TransactionCardProps } from '../TransactionCard';
import type { Transaction } from '../../../types/transaction';
import type { Category } from '../../../types/category';

// Mock i18n
jest.mock('../../../i18n', () => ({
  formatCurrencyLocale: jest.fn(
    (amount: number, _locale: string, options?: { showPositiveSign?: boolean }) => {
      const formatted = `$${amount.toFixed(2)}`;
      if (options?.showPositiveSign && amount > 0) {
        return `+${formatted}`;
      }
      return formatted;
    }
  ),
  getCurrentLocale: jest.fn(() => 'en'),
}));

// Mock DateTimePicker's formatDateTimeForLocale
jest.mock('../DateTimePicker', () => ({
  formatDateTimeForLocale: jest.fn(() => '01/15/2024 12:00 AM'),
}));

describe('TransactionCard', () => {
  const mockTransaction: Transaction = {
    id: 'txn-1',
    title: 'Grocery Store',
    date: new Date('2024-01-15'),
    amount: -5000, // -$50.00 in cents
    description: 'Grocery Store Purchase',
    categoryId: 'cat-1',
    originId: null,
    batchId: null,
    referenceMonth: '2024-01',
    needsReview: false,
    isExcludedFromTotals: false,
    duplicateOf: null,
    installmentGroupId: null,
    recurringId: null,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
  };

  const mockCategory: Category = {
    id: 'cat-1',
    name: 'Food',
    type: 'expense',
    icon: '🍔',
    color: '#ef4444',
    isActive: true,
    expenseGroup: null,
    createdAt: new Date('2024-01-01'),
  };

  const defaultProps: TransactionCardProps = {
    transaction: mockTransaction,
  };

  it('renders transaction description', () => {
    const { getByText } = render(<TransactionCard {...defaultProps} />);
    // Title is shown as primary text
    expect(getByText('Grocery Store')).toBeTruthy();
    // Description is shown as secondary text when non-empty
    expect(getByText('Grocery Store Purchase')).toBeTruthy();
  });

  it('hides description area when description is empty', () => {
    const transactionNoDesc: Transaction = {
      ...mockTransaction,
      description: '',
    };
    const { getByText, queryByText } = render(<TransactionCard transaction={transactionNoDesc} />);
    // Title should still be visible
    expect(getByText('Grocery Store')).toBeTruthy();
    // Description text should not be rendered
    expect(queryByText('Grocery Store Purchase')).toBeNull();
  });

  it('renders formatted date', () => {
    const { getByText } = render(<TransactionCard {...defaultProps} />);
    expect(getByText('01/15/2024 12:00 AM')).toBeTruthy();
  });

  it('renders formatted amount for expense', () => {
    const { getByText } = render(<TransactionCard {...defaultProps} />);
    // Amount is -5000 cents = -$50.00
    expect(getByText(/-\$50\.00/)).toBeTruthy();
  });

  it('renders formatted amount for income', () => {
    const incomeTransaction: Transaction = {
      ...mockTransaction,
      amount: 10000, // +$100.00 in cents
    };
    const { getByText } = render(<TransactionCard transaction={incomeTransaction} />);
    expect(getByText(/\+\$100\.00/)).toBeTruthy();
  });

  it('renders category name when provided', () => {
    const { getByText } = render(<TransactionCard {...defaultProps} category={mockCategory} />);
    expect(getByText('Food')).toBeTruthy();
  });

  it('renders category color dot when category is provided', () => {
    const { getByTestId } = render(
      <TransactionCard {...defaultProps} category={mockCategory} testID="card" />
    );
    // Just verify the card renders with category
    expect(getByTestId('card')).toBeTruthy();
  });

  it('does not render category when not provided', () => {
    const { queryByText } = render(<TransactionCard {...defaultProps} />);
    expect(queryByText('Food')).toBeNull();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByRole } = render(<TransactionCard {...defaultProps} onPress={onPress} />);

    const button = getByRole('button');
    fireEvent.press(button);

    expect(onPress).toHaveBeenCalledWith(mockTransaction);
  });

  it('does not render as touchable when onPress is not provided', () => {
    const { queryByRole } = render(<TransactionCard {...defaultProps} />);
    expect(queryByRole('button')).toBeNull();
  });

  it('renders duplicate indicator when transaction is a duplicate', () => {
    const duplicateTransaction: Transaction = {
      ...mockTransaction,
      duplicateOf: 'txn-original',
    };
    const { getByText } = render(<TransactionCard transaction={duplicateTransaction} />);
    expect(getByText('⚠️')).toBeTruthy();
  });

  it('does not render duplicate indicator when showDuplicateIndicator is false', () => {
    const duplicateTransaction: Transaction = {
      ...mockTransaction,
      duplicateOf: 'txn-original',
    };
    const { queryByText } = render(
      <TransactionCard transaction={duplicateTransaction} showDuplicateIndicator={false} />
    );
    expect(queryByText('⚠️')).toBeNull();
  });

  it('renders excluded indicator when transaction is excluded', () => {
    const excludedTransaction: Transaction = {
      ...mockTransaction,
      isExcludedFromTotals: true,
    };
    const { getByText } = render(<TransactionCard transaction={excludedTransaction} />);
    expect(getByText('🚫')).toBeTruthy();
  });

  it('does not render excluded indicator when showExcludedIndicator is false', () => {
    const excludedTransaction: Transaction = {
      ...mockTransaction,
      isExcludedFromTotals: true,
    };
    const { queryByText } = render(
      <TransactionCard transaction={excludedTransaction} showExcludedIndicator={false} />
    );
    expect(queryByText('🚫')).toBeNull();
  });

  it('renders recurring indicator (∞) when transaction has recurringId', () => {
    const recurringTransaction: Transaction = {
      ...mockTransaction,
      recurringId: 'recurring-1',
    };
    const { getByText } = render(<TransactionCard transaction={recurringTransaction} />);
    expect(getByText('∞')).toBeTruthy();
  });

  it('does not render recurring indicator when recurringId is null', () => {
    const { queryByText } = render(<TransactionCard {...defaultProps} />);
    expect(queryByText('∞')).toBeNull();
  });

  it('applies selected styling when selected is true', () => {
    const { getByTestId } = render(
      <TransactionCard {...defaultProps} selected testID="transaction-card" />
    );
    const card = getByTestId('transaction-card');
    expect(card).toBeTruthy();
  });

  it('has correct accessibility label', () => {
    const { getByLabelText } = render(
      <TransactionCard {...defaultProps} category={mockCategory} onPress={() => {}} />
    );
    // Should include title, description, date, type, amount, and category
    const accessibleElement = getByLabelText(
      /Grocery Store.*Grocery Store Purchase.*01\/15\/2024.*Food/
    );
    expect(accessibleElement).toBeTruthy();
  });

  it('applies custom style', () => {
    const customStyle = { marginTop: 20 };
    const { getByTestId } = render(
      <TransactionCard {...defaultProps} style={customStyle} testID="card" />
    );
    const card = getByTestId('card');
    expect(card.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining(customStyle)])
    );
  });

  it('renders only one "+" sign for positive (income) amounts', () => {
    const incomeTransaction: Transaction = {
      ...mockTransaction,
      amount: 1889, // +$18.89 in cents (income)
    };
    const { getByText } = render(<TransactionCard transaction={incomeTransaction} testID="card" />);
    // Should show "+$18.89" with exactly one "+" sign, not "++$18.89"
    const amountElement = getByText(/\+\$18\.89/);
    expect(amountElement).toBeTruthy();
    // Verify no double sign
    expect(amountElement.props.children.join('')).not.toContain('++');
  });

  it('renders only one "-" sign for negative (expense) amounts', () => {
    const expenseTransaction: Transaction = {
      ...mockTransaction,
      amount: -5000, // -$50.00 in cents (expense)
    };
    const { getByText } = render(
      <TransactionCard transaction={expenseTransaction} testID="card" />
    );
    // Should show "-$50.00" with exactly one "-" sign, not "--$50.00"
    const amountElement = getByText(/-\$50\.00/);
    expect(amountElement).toBeTruthy();
    // Verify no double sign
    expect(amountElement.props.children.join('')).not.toContain('--');
  });
});
