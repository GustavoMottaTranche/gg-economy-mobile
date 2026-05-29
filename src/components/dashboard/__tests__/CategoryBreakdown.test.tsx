/**
 * CategoryBreakdown Component Tests
 *
 * Tests for the CategoryBreakdown component that displays
 * expense breakdown by category with a donut chart.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { CategoryBreakdown } from '../CategoryBreakdown';
import type { CategoryBreakdownItem } from '../../../hooks/useDashboardData';

// Mock i18n
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'dashboard.categoryBreakdown': 'By Category',
        'dashboard.expenses': 'Expenses',
        'dashboard.noData': 'No data for this month',
        'dashboard.viewAll': 'View all',
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
  formatPercentLocale: (value: number, _locale: string, _digits: number) => {
    return `${(value * 100).toFixed(1)}%`;
  },
  getCurrentLocale: () => 'en',
}));

// Mock DonutChart
jest.mock('../../charts/PieChart', () => ({
  DonutChart: ({ testID }: { testID?: string }) => {
    const { View, Text } = require('react-native');
    return (
      <View testID={testID}>
        <Text>Mocked DonutChart</Text>
      </View>
    );
  },
}));

describe('CategoryBreakdown', () => {
  const mockOnCategoryPress = jest.fn();

  const sampleData: CategoryBreakdownItem[] = [
    {
      categoryId: 'cat-1',
      categoryName: 'Food',
      categoryType: 'expense',
      categoryColor: '#FF5733',
      categoryIcon: 'utensils',
      expenseGroup: 'variable',
      total: 150000, // $1,500.00
      count: 25,
      percentage: 42.86,
    },
    {
      categoryId: 'cat-2',
      categoryName: 'Transport',
      categoryType: 'expense',
      categoryColor: '#33FF57',
      categoryIcon: 'car',
      expenseGroup: 'fixed',
      total: 100000, // $1,000.00
      count: 15,
      percentage: 28.57,
    },
    {
      categoryId: 'cat-3',
      categoryName: 'Entertainment',
      categoryType: 'expense',
      categoryColor: '#3357FF',
      categoryIcon: 'film',
      expenseGroup: 'variable',
      total: 100000, // $1,000.00
      count: 10,
      percentage: 28.57,
    },
  ];

  const defaultProps = {
    data: sampleData,
    totalExpenses: 350000, // $3,500.00
    onCategoryPress: mockOnCategoryPress,
    testID: 'category-breakdown',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with data', () => {
    render(<CategoryBreakdown {...defaultProps} />);

    expect(screen.getByText('By Category')).toBeTruthy();
    expect(screen.getByText('Food')).toBeTruthy();
    expect(screen.getByText('Transport')).toBeTruthy();
    expect(screen.getByText('Entertainment')).toBeTruthy();
  });

  it('renders empty state when no data', () => {
    render(<CategoryBreakdown data={[]} totalExpenses={0} testID="category-breakdown" />);

    expect(screen.getByText('No data for this month')).toBeTruthy();
  });

  it('renders empty state when totalExpenses is zero', () => {
    render(<CategoryBreakdown data={sampleData} totalExpenses={0} testID="category-breakdown" />);

    expect(screen.getByText('No data for this month')).toBeTruthy();
  });

  it('calls onCategoryPress when category is pressed', () => {
    render(<CategoryBreakdown {...defaultProps} />);

    const foodCategory = screen.getByTestId('category-breakdown-category-cat-1');
    fireEvent.press(foodCategory);

    expect(mockOnCategoryPress).toHaveBeenCalledWith('cat-1', 'Food');
  });

  it('handles uncategorized items correctly', () => {
    const dataWithUncategorized: CategoryBreakdownItem[] = [
      ...sampleData,
      {
        categoryId: null,
        categoryName: 'Uncategorized',
        categoryType: null,
        categoryColor: '#808080',
        categoryIcon: 'help-circle',
        expenseGroup: null,
        total: 50000,
        count: 5,
        percentage: 14.29,
      },
    ];

    render(
      <CategoryBreakdown
        data={dataWithUncategorized}
        totalExpenses={400000}
        onCategoryPress={mockOnCategoryPress}
        testID="category-breakdown"
      />
    );

    expect(screen.getByText('Uncategorized')).toBeTruthy();

    const uncategorizedItem = screen.getByTestId('category-breakdown-category-uncategorized');
    fireEvent.press(uncategorizedItem);

    expect(mockOnCategoryPress).toHaveBeenCalledWith(null, 'Uncategorized');
  });

  it('shows "View All" when more than 5 categories', () => {
    const manyCategories: CategoryBreakdownItem[] = Array.from({ length: 7 }, (_, i) => ({
      categoryId: `cat-${i}`,
      categoryName: `Category ${i}`,
      categoryType: 'expense' as const,
      categoryColor: '#FF5733',
      categoryIcon: 'tag',
      expenseGroup: 'variable' as const,
      total: 50000,
      count: 5,
      percentage: 14.29,
    }));

    render(
      <CategoryBreakdown
        data={manyCategories}
        totalExpenses={350000}
        onCategoryPress={mockOnCategoryPress}
        testID="category-breakdown"
      />
    );

    expect(screen.getByText('View all')).toBeTruthy();
  });

  it('does not show "View All" when 5 or fewer categories', () => {
    render(<CategoryBreakdown {...defaultProps} />);

    expect(screen.queryByText('View all')).toBeNull();
  });

  it('renders the donut chart', () => {
    render(<CategoryBreakdown {...defaultProps} />);

    expect(screen.getByTestId('category-breakdown-chart')).toBeTruthy();
  });

  it('applies custom style', () => {
    const customStyle = { marginTop: 20 };
    render(<CategoryBreakdown {...defaultProps} style={customStyle} />);

    expect(screen.getByTestId('category-breakdown')).toBeTruthy();
  });
});
