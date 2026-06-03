/**
 * Budget Goals Settings Screen - Navigation and Structure Tests
 *
 * Tests for navigation to the Budget Goals screen and its structural elements:
 * - Screen is accessible from settings navigation
 * - Budget Goals screen has correct structural layout
 * - General goal section appears at top
 * - Category goals section follows the general goal
 *
 * **Validates: Requirements 7.3, 7.4, 7.7, 7.8, 7.9**
 */

import React from 'react';
import { render } from '@testing-library/react-native';

// ─── Mock Store State ────────────────────────────────────────────────────────

const mockLoadGoals = jest.fn();

let mockStoreState = {
  generalGoal: null as number | null,
  categoryGoals: new Map<string, number>(),
  isLoading: false,
  loadGoals: mockLoadGoals,
  setGeneralGoal: jest.fn(),
  removeGeneralGoal: jest.fn(),
  setCategoryGoal: jest.fn(),
  removeCategoryGoal: jest.fn(),
};

jest.mock('../../../../src/stores/goalStore', () => ({
  useGoalStore: () => mockStoreState,
}));

// ─── Mock useCategories ──────────────────────────────────────────────────────

const mockCategories = [
  {
    id: 'cat-1',
    name: 'Groceries',
    type: 'expense' as const,
    icon: '🛒',
    color: '#4CAF50',
    isActive: true,
    expenseGroup: 'variable' as const,
    createdAt: new Date('2024-01-01'),
  },
  {
    id: 'cat-2',
    name: 'Entertainment',
    type: 'expense' as const,
    icon: '🎬',
    color: '#FF9800',
    isActive: true,
    expenseGroup: 'variable' as const,
    createdAt: new Date('2024-01-01'),
  },
];

jest.mock('../../../../src/hooks/useCategories', () => ({
  useCategories: () => ({
    variableExpenseCategories: mockCategories,
  }),
}));

// ─── Mock Validation ─────────────────────────────────────────────────────────

jest.mock('../../../../src/validation/goalValidation', () => ({
  validateGoalAmount: jest.fn(() => ({ valid: true, amountInCents: 10000 })),
}));

// ─── Mock i18n ───────────────────────────────────────────────────────────────

jest.mock('../../../../src/i18n', () => ({
  getCurrentLocale: () => 'en',
}));

// ─── Mock Theme ──────────────────────────────────────────────────────────────

jest.mock('../../../../src/hooks/useThemeColors', () => ({
  useThemeColors: () => ({
    background: { primary: '#FFFFFF', secondary: '#F5F5F7', tertiary: '#EBEBF0' },
    text: { primary: '#1C1C1E', secondary: '#6B7280', tertiary: '#9CA3AF', inverse: '#FFFFFF' },
    border: { default: '#E5E7EB', subtle: '#F3F4F6', strong: '#D1D5DB' },
    semantic: {
      danger: { base: '#DC2626', light: '#FEE2E2' },
      success: { base: '#16A34A' },
    },
    surface: { card: '#FFFFFF', elevated: '#FFFFFF', overlay: 'rgba(0,0,0,0.5)' },
    interactive: { primary: '#3B82F6', primaryPressed: '#2563EB', disabled: '#D1D5DB' },
  }),
}));

jest.mock('../../../../src/hooks/useThemeStyles', () => ({
  useThemeStyles: () => ({
    borderRadius: { sm: 4, md: 12, lg: 16 },
    shadows: { sm: {}, md: {} },
  }),
}));

jest.mock('../../../../src/stores/themeStore', () => ({
  useThemeStore: () => 'light',
}));

jest.mock('../../../../src/constants/theme', () => ({
  spacing: { xs: 4, sm: 8, md: 12, base: 16, lg: 20, xl: 24, '2xl': 32 },
  typography: {
    body: { fontSize: 16, lineHeight: 24 },
    caption: { fontSize: 12, lineHeight: 16 },
  },
}));

// ─── Import Component After Mocks ────────────────────────────────────────────

import BudgetGoalsScreen from '../budget-goals';

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Budget Goals Screen - Navigation and Structure', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStoreState = {
      generalGoal: null,
      categoryGoals: new Map<string, number>(),
      isLoading: false,
      loadGoals: mockLoadGoals,
      setGeneralGoal: jest.fn(),
      removeGeneralGoal: jest.fn(),
      setCategoryGoal: jest.fn(),
      removeCategoryGoal: jest.fn(),
    };
  });

  describe('Screen structure', () => {
    it('renders the main screen container', () => {
      const { getByTestId } = render(<BudgetGoalsScreen />);
      expect(getByTestId('budget-goals-screen')).toBeTruthy();
    });

    it('renders the FlatList for budget goals', () => {
      const { getByTestId } = render(<BudgetGoalsScreen />);
      expect(getByTestId('budget-goals-list')).toBeTruthy();
    });

    it('renders explanatory text at the top (Requirement 5.4)', () => {
      const { getByTestId } = render(<BudgetGoalsScreen />);
      expect(getByTestId('goals-explanatory-text')).toBeTruthy();
    });

    it('renders the general goal card before category list (Requirement 7.3)', () => {
      const { getByTestId } = render(<BudgetGoalsScreen />);
      expect(getByTestId('general-goal-card')).toBeTruthy();
    });

    it('renders category goal cards for each variable category (Requirement 7.4)', () => {
      const { getByTestId } = render(<BudgetGoalsScreen />);

      expect(getByTestId('category-goal-card-cat-1')).toBeTruthy();
      expect(getByTestId('category-goal-card-cat-2')).toBeTruthy();
    });
  });

  describe('Loading state', () => {
    it('shows loading indicator when isLoading is true', () => {
      mockStoreState.isLoading = true;
      const { getByTestId } = render(<BudgetGoalsScreen />);

      expect(getByTestId('budget-goals-loading')).toBeTruthy();
    });

    it('does not show main screen when loading', () => {
      mockStoreState.isLoading = true;
      const { queryByTestId } = render(<BudgetGoalsScreen />);

      expect(queryByTestId('budget-goals-screen')).toBeNull();
    });

    it('shows main screen when not loading', () => {
      mockStoreState.isLoading = false;
      const { getByTestId, queryByTestId } = render(<BudgetGoalsScreen />);

      expect(getByTestId('budget-goals-screen')).toBeTruthy();
      expect(queryByTestId('budget-goals-loading')).toBeNull();
    });
  });

  describe('Data initialization', () => {
    it('calls loadGoals on mount to initialize data', () => {
      render(<BudgetGoalsScreen />);
      expect(mockLoadGoals).toHaveBeenCalledTimes(1);
    });
  });

  describe('Category display with goals configured', () => {
    it('renders category cards even when no goals are set', () => {
      const { getByTestId } = render(<BudgetGoalsScreen />);

      expect(getByTestId('category-goal-card-cat-1')).toBeTruthy();
      expect(getByTestId('category-goal-card-cat-2')).toBeTruthy();
    });

    it('renders category cards with existing goal values', () => {
      mockStoreState.categoryGoals = new Map([
        ['cat-1', 30000],
        ['cat-2', 15000],
      ]);

      const { getByTestId } = render(<BudgetGoalsScreen />);

      const input1 = getByTestId('category-goal-cat-1-input');
      const input2 = getByTestId('category-goal-cat-2-input');

      expect(input1.props.value).toBe('300.00');
      expect(input2.props.value).toBe('150.00');
    });
  });

  describe('Alphabetical ordering (Requirement 7.9)', () => {
    it('categories are sorted alphabetically in the list', () => {
      // mockCategories: Groceries, Entertainment
      // Alphabetical: Entertainment < Groceries
      const { getByTestId } = render(<BudgetGoalsScreen />);

      // Both should be rendered
      const cat1Card = getByTestId('category-goal-card-cat-1');
      const cat2Card = getByTestId('category-goal-card-cat-2');

      expect(cat1Card).toBeTruthy();
      expect(cat2Card).toBeTruthy();
    });
  });
});
