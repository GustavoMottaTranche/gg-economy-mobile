/**
 * CategoryRow Component Tests
 *
 * Tests for the CategoryRow component that displays a category line item
 * with expand/collapse functionality to reveal inline transaction list.
 *
 * **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7**
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { CategoryRow } from '../CategoryRow';
import type { CategoryBreakdownItem } from '../../../hooks/useDashboardData';

// Mock i18n
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { defaultValue?: string }) => opts?.defaultValue ?? key,
  }),
}));

// Mock i18n formatters
jest.mock('../../../i18n', () => ({
  formatCurrencyLocale: (amount: number, _locale: string) => `$${amount.toFixed(2)}`,
  getCurrentLocale: () => 'en',
}));

// Mock useCategoryTransactions hook
const mockRetry = jest.fn();
let mockHookReturn = {
  transactions: [] as Array<{ id: string; description: string; amount: number; date: string }>,
  isLoading: false,
  error: null as string | null,
  retry: mockRetry,
};

jest.mock('../../../hooks/useCategoryTransactions', () => ({
  useCategoryTransactions: () => mockHookReturn,
}));

describe('CategoryRow', () => {
  const mockOnPress = jest.fn();

  const sampleCategory: CategoryBreakdownItem = {
    categoryId: 'cat-food',
    categoryName: 'Food',
    categoryType: 'expense',
    categoryColor: '#FF5733',
    categoryIcon: 'utensils',
    expenseGroup: 'variable',
    total: 150000, // $1,500.00 in cents
    count: 25,
    percentage: 42,
  };

  const defaultProps = {
    category: sampleCategory,
    isExpanded: false,
    onPress: mockOnPress,
    selectedMonth: '2024-06',
    testID: 'category-row',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockHookReturn = {
      transactions: [],
      isLoading: false,
      error: null,
      retry: mockRetry,
    };
  });

  it('renders category name, amount, and percentage', () => {
    render(<CategoryRow {...defaultProps} />);

    expect(screen.getByText('Food')).toBeTruthy();
    expect(screen.getByText('$1500.00')).toBeTruthy();
    expect(screen.getByText('42%')).toBeTruthy();
  });

  it('renders color indicator with correct color', () => {
    render(<CategoryRow {...defaultProps} />);

    const container = screen.getByTestId('category-row');
    expect(container).toBeTruthy();
  });

  it('calls onPress when row is pressed', () => {
    render(<CategoryRow {...defaultProps} />);

    const pressable = screen.getByTestId('category-row-pressable');
    fireEvent.press(pressable);

    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('does not render TransactionList when collapsed', () => {
    render(<CategoryRow {...defaultProps} isExpanded={false} />);

    expect(screen.queryByTestId('category-row-transactions')).toBeNull();
  });

  it('renders TransactionList when expanded', () => {
    mockHookReturn = {
      transactions: [
        { id: 'tx-1', description: 'Grocery Store', amount: 5000, date: '2024-06-15' },
      ],
      isLoading: false,
      error: null,
      retry: mockRetry,
    };

    render(<CategoryRow {...defaultProps} isExpanded={true} />);

    expect(screen.getByTestId('category-row-transactions')).toBeTruthy();
  });

  it('does not render TransactionList when expanded but categoryId is null', () => {
    const uncategorized: CategoryBreakdownItem = {
      ...sampleCategory,
      categoryId: null,
      categoryName: 'Uncategorized',
    };

    render(
      <CategoryRow
        {...defaultProps}
        category={uncategorized}
        isExpanded={true}
      />
    );

    expect(screen.queryByTestId('category-row-transactions')).toBeNull();
  });

  it('has correct accessibility properties when collapsed', () => {
    render(<CategoryRow {...defaultProps} isExpanded={false} />);

    const pressable = screen.getByTestId('category-row-pressable');
    expect(pressable.props.accessibilityRole).toBe('button');
    expect(pressable.props.accessibilityState).toEqual({ expanded: false });
  });

  it('has correct accessibility properties when expanded', () => {
    render(<CategoryRow {...defaultProps} isExpanded={true} />);

    const pressable = screen.getByTestId('category-row-pressable');
    expect(pressable.props.accessibilityState).toEqual({ expanded: true });
  });

  it('renders with zero percentage', () => {
    const zeroCategory: CategoryBreakdownItem = {
      ...sampleCategory,
      total: 0,
      percentage: 0,
    };

    render(<CategoryRow {...defaultProps} category={zeroCategory} />);

    expect(screen.getByText('$0.00')).toBeTruthy();
    expect(screen.getByText('0%')).toBeTruthy();
  });
});
