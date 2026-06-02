/**
 * ExpenseChart Component Tests
 *
 * Tests for the ExpenseChart component that displays expense visualization
 * in fixed-vs-variable comparison mode and per-group breakdown mode.
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { ExpenseChart } from '../ExpenseChart';
import type { CategoryBreakdownItem } from '../../../hooks/useDashboardData';

// Mock i18n
jest.mock('../../../i18n', () => ({
  formatCurrencyLocale: (amount: number, _locale: string) => {
    return `R$ ${amount.toFixed(2)}`;
  },
  getCurrentLocale: () => 'pt-BR',
}));

// Mock react-native-svg
jest.mock('react-native-svg', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ children, testID, ...props }: any) => (
      <View testID={testID} {...props}>
        {children}
      </View>
    ),
    Svg: ({ children, testID, ...props }: any) => (
      <View testID={testID} {...props}>
        {children}
      </View>
    ),
    G: ({ children, ...props }: any) => <View {...props}>{children}</View>,
    Path: (props: any) => <View {...props} />,
    Circle: (props: any) => <View {...props} />,
  };
});

describe('ExpenseChart', () => {
  const fixedCategories: CategoryBreakdownItem[] = [
    {
      categoryId: 'cat-1',
      categoryName: 'Aluguel',
      categoryType: 'expense',
      categoryColor: '#FF5733',
      categoryIcon: 'home',
      expenseGroup: 'fixed',
      total: 150000,
      count: 1,
      percentage: 75,
    },
    {
      categoryId: 'cat-2',
      categoryName: 'Internet',
      categoryType: 'expense',
      categoryColor: '#33FF57',
      categoryIcon: 'wifi',
      expenseGroup: 'fixed',
      total: 50000,
      count: 1,
      percentage: 25,
    },
  ];

  const variableCategories: CategoryBreakdownItem[] = [
    {
      categoryId: 'cat-3',
      categoryName: 'Alimentação',
      categoryType: 'expense',
      categoryColor: '#3357FF',
      categoryIcon: 'utensils',
      expenseGroup: 'variable',
      total: 80000,
      count: 10,
      percentage: 80,
    },
    {
      categoryId: 'cat-4',
      categoryName: 'Transporte',
      categoryType: 'expense',
      categoryColor: '#FF33A1',
      categoryIcon: 'car',
      expenseGroup: 'variable',
      total: 20000,
      count: 5,
      percentage: 20,
    },
  ];

  describe('Empty state', () => {
    it('shows empty state when total expenses are zero', () => {
      render(
        <ExpenseChart
          fixedTotal={0}
          variableTotal={0}
          fixedCategories={[]}
          variableCategories={[]}
          filter="all"
          testID="expense-chart"
        />
      );

      expect(screen.getByText('Sem dados para exibição')).toBeTruthy();
      expect(screen.getByTestId('expense-chart-empty')).toBeTruthy();
    });

    it('shows empty state when selected group has no data (fixed filter)', () => {
      render(
        <ExpenseChart
          fixedTotal={0}
          variableTotal={100000}
          fixedCategories={[]}
          variableCategories={variableCategories}
          filter="fixed"
          testID="expense-chart"
        />
      );

      expect(screen.getByText('Sem dados para exibição')).toBeTruthy();
    });

    it('shows empty state when selected group has no data (variable filter)', () => {
      render(
        <ExpenseChart
          fixedTotal={200000}
          variableTotal={0}
          fixedCategories={fixedCategories}
          variableCategories={[]}
          filter="variable"
          testID="expense-chart"
        />
      );

      expect(screen.getByText('Sem dados para exibição')).toBeTruthy();
    });
  });

  describe('Fixed vs Variable comparison mode (filter = all)', () => {
    it('renders chart with two segments showing fixed and variable', () => {
      render(
        <ExpenseChart
          fixedTotal={200000}
          variableTotal={100000}
          fixedCategories={fixedCategories}
          variableCategories={variableCategories}
          filter="all"
          testID="expense-chart"
        />
      );

      // Should show legend items for fixed and variable
      expect(screen.getByTestId('expense-chart-legend-fixed')).toBeTruthy();
      expect(screen.getByTestId('expense-chart-legend-variable')).toBeTruthy();
    });

    it('displays monetary values and percentages in legend', () => {
      render(
        <ExpenseChart
          fixedTotal={200000}
          variableTotal={100000}
          fixedCategories={fixedCategories}
          variableCategories={variableCategories}
          filter="all"
          testID="expense-chart"
        />
      );

      // Fixed: 200000 cents = R$ 2000.00, 67%
      // Variable: 100000 cents = R$ 1000.00, 33%
      expect(screen.getByText(/R\$ 2000\.00.*67%/)).toBeTruthy();
      expect(screen.getByText(/R\$ 1000\.00.*33%/)).toBeTruthy();
    });

    it('displays total in center label', () => {
      render(
        <ExpenseChart
          fixedTotal={200000}
          variableTotal={100000}
          fixedCategories={fixedCategories}
          variableCategories={variableCategories}
          filter="all"
          testID="expense-chart"
        />
      );

      // Total: 300000 cents = R$ 3000.00
      expect(screen.getByTestId('expense-chart-total')).toBeTruthy();
      expect(screen.getByText('R$ 3000.00')).toBeTruthy();
    });
  });

  describe('Per-group breakdown mode (filter = fixed)', () => {
    it('renders individual fixed category segments', () => {
      render(
        <ExpenseChart
          fixedTotal={200000}
          variableTotal={100000}
          fixedCategories={fixedCategories}
          variableCategories={variableCategories}
          filter="fixed"
          testID="expense-chart"
        />
      );

      expect(screen.getByTestId('expense-chart-legend-cat-1')).toBeTruthy();
      expect(screen.getByTestId('expense-chart-legend-cat-2')).toBeTruthy();
    });

    it('shows category names in legend', () => {
      render(
        <ExpenseChart
          fixedTotal={200000}
          variableTotal={100000}
          fixedCategories={fixedCategories}
          variableCategories={variableCategories}
          filter="fixed"
          testID="expense-chart"
        />
      );

      expect(screen.getByText('Aluguel')).toBeTruthy();
      expect(screen.getByText('Internet')).toBeTruthy();
    });

    it('uses roundPercentages so percentages sum to 100', () => {
      render(
        <ExpenseChart
          fixedTotal={200000}
          variableTotal={100000}
          fixedCategories={fixedCategories}
          variableCategories={variableCategories}
          filter="fixed"
          testID="expense-chart"
        />
      );

      // Aluguel: 150000/200000 = 75%, Internet: 50000/200000 = 25%
      expect(screen.getByText(/R\$ 1500\.00.*75%/)).toBeTruthy();
      expect(screen.getByText(/R\$ 500\.00.*25%/)).toBeTruthy();
    });
  });

  describe('Per-group breakdown mode (filter = variable)', () => {
    it('renders individual variable category segments', () => {
      render(
        <ExpenseChart
          fixedTotal={200000}
          variableTotal={100000}
          fixedCategories={fixedCategories}
          variableCategories={variableCategories}
          filter="variable"
          testID="expense-chart"
        />
      );

      expect(screen.getByTestId('expense-chart-legend-cat-3')).toBeTruthy();
      expect(screen.getByTestId('expense-chart-legend-cat-4')).toBeTruthy();
    });

    it('shows variable category names in legend', () => {
      render(
        <ExpenseChart
          fixedTotal={200000}
          variableTotal={100000}
          fixedCategories={fixedCategories}
          variableCategories={variableCategories}
          filter="variable"
          testID="expense-chart"
        />
      );

      expect(screen.getByText('Alimentação')).toBeTruthy();
      expect(screen.getByText('Transporte')).toBeTruthy();
    });
  });

  describe('SVG rendering', () => {
    it('renders the SVG chart element', () => {
      render(
        <ExpenseChart
          fixedTotal={200000}
          variableTotal={100000}
          fixedCategories={fixedCategories}
          variableCategories={variableCategories}
          filter="all"
          testID="expense-chart"
        />
      );

      expect(screen.getByTestId('expense-chart-svg')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('provides accessibility labels for legend items', () => {
      render(
        <ExpenseChart
          fixedTotal={200000}
          variableTotal={100000}
          fixedCategories={fixedCategories}
          variableCategories={variableCategories}
          filter="all"
          testID="expense-chart"
        />
      );

      const fixedLegend = screen.getByTestId('expense-chart-legend-fixed');
      expect(fixedLegend.props.accessibilityLabel).toContain('Fixo');
      expect(fixedLegend.props.accessibilityLabel).toContain('67%');
    });
  });
});
