/**
 * CollapsibleSection Goals Display Tests
 *
 * Tests for the CollapsibleSection component's goal-related rendering behavior:
 * - Rendering with general goal configured (displays goal with suggestion indicator)
 * - Rendering without general goal (no goal placeholder or reserved space)
 * - Expected future spending display
 * - Accessibility labels include goal value when present
 * - Accessibility labels exclude goal when not configured
 *
 * **Validates: Requirements 3.1, 3.4, 9.4, 9.5**
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { CollapsibleSection } from '../../components/dashboard/CollapsibleSection';
import { useThemeStore } from '../../stores/themeStore';
import type { CategoryBreakdownItem } from '../../hooks/useDashboardData';

// Mock i18n
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'goals.suggestionIndicator': 'goal',
        'goals.expectedSpendingLabel': 'expected',
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

describe('CollapsibleSection - Goals Display', () => {
  const sampleCategories: CategoryBreakdownItem[] = [
    {
      categoryId: 'cat-food',
      categoryName: 'Food',
      categoryType: 'expense',
      categoryColor: '#FF5733',
      categoryIcon: 'utensils',
      expenseGroup: 'variable',
      total: 80000,
      count: 10,
      percentage: 40,
    },
    {
      categoryId: 'cat-transport',
      categoryName: 'Transport',
      categoryType: 'expense',
      categoryColor: '#33AAFF',
      categoryIcon: 'car',
      expenseGroup: 'variable',
      total: 60000,
      count: 8,
      percentage: 30,
    },
  ];

  const defaultProps = {
    title: 'Variável',
    total: 200000, // R$ 2,000.00 in cents
    categories: sampleCategories,
    isExpanded: false,
    onToggle: jest.fn(),
    onCategoryPress: jest.fn(),
    expandedCategoryId: null,
    selectedMonth: '2024-06',
    testID: 'variable-section',
  };

  beforeEach(() => {
    useThemeStore.setState({ resolvedScheme: 'light', preference: 'light' });
    jest.clearAllMocks();
  });

  describe('rendering with general goal', () => {
    it('displays goal value formatted as currency with suggestion indicator', () => {
      render(<CollapsibleSection {...defaultProps} generalGoal={300000} />);

      // Goal amount of 300000 cents = R$ 3000.00
      expect(screen.getByText('goal R$ 3000.00')).toBeTruthy();
    });

    it('renders goal element with correct testID', () => {
      render(<CollapsibleSection {...defaultProps} generalGoal={300000} />);

      expect(screen.getByTestId('variable-section-goal')).toBeTruthy();
    });

    it('still displays the actual total amount', () => {
      render(<CollapsibleSection {...defaultProps} generalGoal={300000} />);

      expect(screen.getByText('R$ 2000.00')).toBeTruthy();
    });
  });

  describe('rendering without general goal', () => {
    it('does not display any goal text when generalGoal is null', () => {
      render(<CollapsibleSection {...defaultProps} generalGoal={null} />);

      expect(screen.queryByTestId('variable-section-goal')).toBeNull();
    });

    it('does not display any goal text when generalGoal is undefined', () => {
      render(<CollapsibleSection {...defaultProps} />);

      expect(screen.queryByTestId('variable-section-goal')).toBeNull();
    });

    it('does not render a goal placeholder or reserved space', () => {
      render(<CollapsibleSection {...defaultProps} generalGoal={null} />);

      expect(screen.queryByText(/goal/)).toBeNull();
    });

    it('displays only the actual total', () => {
      render(<CollapsibleSection {...defaultProps} generalGoal={null} />);

      expect(screen.getByText('R$ 2000.00')).toBeTruthy();
    });
  });

  describe('expected future spending display', () => {
    it('displays expected spending with label when provided', () => {
      render(
        <CollapsibleSection
          {...defaultProps}
          generalGoal={300000}
          expectedFutureSpending={150000}
        />
      );

      expect(screen.getByText('expected R$ 1500.00')).toBeTruthy();
    });

    it('renders expected spending element with correct testID', () => {
      render(
        <CollapsibleSection
          {...defaultProps}
          generalGoal={300000}
          expectedFutureSpending={150000}
        />
      );

      expect(screen.getByTestId('variable-section-expected')).toBeTruthy();
    });

    it('does not display expected spending when not provided', () => {
      render(<CollapsibleSection {...defaultProps} generalGoal={300000} />);

      expect(screen.queryByTestId('variable-section-expected')).toBeNull();
    });

    it('displays zero expected spending when all goals are exceeded', () => {
      render(
        <CollapsibleSection {...defaultProps} generalGoal={300000} expectedFutureSpending={0} />
      );

      expect(screen.getByText('expected R$ 0.00')).toBeTruthy();
    });
  });

  describe('accessibility labels', () => {
    it('includes goal value in accessibilityLabel when goal is configured', () => {
      render(<CollapsibleSection {...defaultProps} generalGoal={300000} />);

      const header = screen.getByTestId('variable-section-header');
      expect(header.props.accessibilityLabel).toContain('Variável');
      expect(header.props.accessibilityLabel).toContain('R$ 2000.00');
      expect(header.props.accessibilityLabel).toContain('goal');
      expect(header.props.accessibilityLabel).toContain('R$ 3000.00');
    });

    it('excludes goal from accessibilityLabel when no goal is configured', () => {
      render(<CollapsibleSection {...defaultProps} generalGoal={null} />);

      const header = screen.getByTestId('variable-section-header');
      expect(header.props.accessibilityLabel).toContain('Variável');
      expect(header.props.accessibilityLabel).toContain('R$ 2000.00');
      expect(header.props.accessibilityLabel).not.toContain('goal');
    });

    it('excludes goal from accessibilityLabel when generalGoal is undefined', () => {
      render(<CollapsibleSection {...defaultProps} />);

      const header = screen.getByTestId('variable-section-header');
      expect(header.props.accessibilityLabel).not.toContain('goal');
    });
  });

  describe('edge cases', () => {
    it('renders with zero total and a goal configured', () => {
      render(<CollapsibleSection {...defaultProps} total={0} generalGoal={300000} />);

      expect(screen.getByText('R$ 0.00')).toBeTruthy();
      expect(screen.getByText('goal R$ 3000.00')).toBeTruthy();
    });

    it('renders with spending exceeding goal (no warning styling)', () => {
      // Total 200000 exceeds goal of 150000 — should still render normally
      render(<CollapsibleSection {...defaultProps} generalGoal={150000} />);

      expect(screen.getByText('R$ 2000.00')).toBeTruthy();
      expect(screen.getByText('goal R$ 1500.00')).toBeTruthy();
    });

    it('renders expected spending alongside goal', () => {
      render(
        <CollapsibleSection
          {...defaultProps}
          generalGoal={500000}
          expectedFutureSpending={250000}
        />
      );

      expect(screen.getByText('R$ 2000.00')).toBeTruthy();
      expect(screen.getByText('expected R$ 2500.00')).toBeTruthy();
      expect(screen.getByText('goal R$ 5000.00')).toBeTruthy();
    });
  });
});
