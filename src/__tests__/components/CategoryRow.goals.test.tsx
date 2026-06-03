/**
 * CategoryRow Goals Display Tests
 *
 * Tests for the CategoryRow component's goal-related rendering behavior:
 * - Rendering with a category goal configured
 * - Rendering without a category goal (shows percentage instead)
 * - Suggestion indicator display when goal is set
 * - Accessibility labels include goal value when present
 * - Accessibility labels exclude goal when not configured
 *
 * **Validates: Requirements 4.1, 4.4, 9.4, 9.5**
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { CategoryRow } from '../../components/dashboard/CategoryRow';
import { useThemeStore } from '../../stores/themeStore';
import type { CategoryBreakdownItem } from '../../hooks/useDashboardData';

// Mock i18n
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'goals.suggestionIndicator': 'goal',
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

// Mock useCategoryTransactions hook
jest.mock('../../hooks/useCategoryTransactions', () => ({
  useCategoryTransactions: () => ({
    transactions: [],
    isLoading: false,
    error: null,
    retry: jest.fn(),
  }),
}));

describe('CategoryRow - Goals Display', () => {
  const sampleCategory: CategoryBreakdownItem = {
    categoryId: 'cat-food',
    categoryName: 'Food',
    categoryType: 'expense',
    categoryColor: '#FF5733',
    categoryIcon: 'utensils',
    expenseGroup: 'variable',
    total: 120000, // R$ 1,200.00 in cents
    count: 15,
    percentage: 35,
  };

  const defaultProps = {
    category: sampleCategory,
    isExpanded: false,
    onPress: jest.fn(),
    selectedMonth: '2024-06',
    testID: 'category-row',
  };

  beforeEach(() => {
    useThemeStore.setState({ resolvedScheme: 'light', preference: 'light' });
    jest.clearAllMocks();
  });

  describe('rendering with category goal', () => {
    it('displays goal value formatted as currency with suggestion indicator', () => {
      render(<CategoryRow {...defaultProps} goalAmount={200000} />);

      // Goal amount of 200000 cents = R$ 2000.00
      expect(screen.getByText('goal R$ 2000.00')).toBeTruthy();
    });

    it('does not display percentage when goal is set', () => {
      render(<CategoryRow {...defaultProps} goalAmount={200000} />);

      expect(screen.queryByText('35%')).toBeNull();
    });

    it('still displays the actual amount', () => {
      render(<CategoryRow {...defaultProps} goalAmount={200000} />);

      expect(screen.getByText('R$ 1200.00')).toBeTruthy();
    });

    it('renders goal element with correct testID', () => {
      render(<CategoryRow {...defaultProps} goalAmount={200000} />);

      expect(screen.getByTestId('category-row-goal')).toBeTruthy();
    });
  });

  describe('rendering without category goal', () => {
    it('displays percentage when no goal is configured (null)', () => {
      render(<CategoryRow {...defaultProps} goalAmount={null} />);

      expect(screen.getByText('35%')).toBeTruthy();
    });

    it('displays percentage when goalAmount is undefined', () => {
      render(<CategoryRow {...defaultProps} />);

      expect(screen.getByText('35%')).toBeTruthy();
    });

    it('does not display any goal text when no goal is set', () => {
      render(<CategoryRow {...defaultProps} goalAmount={null} />);

      expect(screen.queryByTestId('category-row-goal')).toBeNull();
    });

    it('does not render a goal placeholder or reserved space', () => {
      render(<CategoryRow {...defaultProps} goalAmount={null} />);

      expect(screen.queryByText(/goal/)).toBeNull();
    });
  });

  describe('suggestion indicator', () => {
    it('includes the suggestion indicator text before the goal value', () => {
      render(<CategoryRow {...defaultProps} goalAmount={150000} />);

      // Should render "goal R$ 1500.00"
      const goalElement = screen.getByTestId('category-row-goal');
      expect(goalElement.props.children).toEqual(['goal', ' ', 'R$ 1500.00']);
    });

    it('does not show suggestion indicator when no goal', () => {
      render(<CategoryRow {...defaultProps} goalAmount={null} />);

      expect(screen.queryByText(/goal/)).toBeNull();
    });
  });

  describe('accessibility labels', () => {
    it('includes goal value in accessibilityLabel when goal is configured', () => {
      render(<CategoryRow {...defaultProps} goalAmount={200000} />);

      const pressable = screen.getByTestId('category-row-pressable');
      expect(pressable.props.accessibilityLabel).toContain('Food');
      expect(pressable.props.accessibilityLabel).toContain('R$ 1200.00');
      expect(pressable.props.accessibilityLabel).toContain('goal');
      expect(pressable.props.accessibilityLabel).toContain('R$ 2000.00');
    });

    it('excludes goal from accessibilityLabel when no goal is configured', () => {
      render(<CategoryRow {...defaultProps} goalAmount={null} />);

      const pressable = screen.getByTestId('category-row-pressable');
      expect(pressable.props.accessibilityLabel).toContain('Food');
      expect(pressable.props.accessibilityLabel).toContain('R$ 1200.00');
      expect(pressable.props.accessibilityLabel).toContain('35%');
      expect(pressable.props.accessibilityLabel).not.toContain('goal');
    });

    it('includes percentage in accessibilityLabel when no goal is set', () => {
      render(<CategoryRow {...defaultProps} />);

      const pressable = screen.getByTestId('category-row-pressable');
      expect(pressable.props.accessibilityLabel).toContain('35%');
    });
  });

  describe('edge cases', () => {
    it('renders with zero actual spending and a goal configured', () => {
      const zeroCategory: CategoryBreakdownItem = {
        ...sampleCategory,
        total: 0,
        percentage: 0,
      };

      render(<CategoryRow {...defaultProps} category={zeroCategory} goalAmount={100000} />);

      expect(screen.getByText('R$ 0.00')).toBeTruthy();
      expect(screen.getByText('goal R$ 1000.00')).toBeTruthy();
    });

    it('treats goalAmount of 0 as no goal configured', () => {
      render(<CategoryRow {...defaultProps} goalAmount={0} />);

      expect(screen.getByText('35%')).toBeTruthy();
      expect(screen.queryByTestId('category-row-goal')).toBeNull();
    });
  });
});
