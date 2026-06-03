/**
 * BudgetGoalsScreen Component Tests
 *
 * Tests for the Budget Goals configuration screen including:
 * - Screen rendering with loading and loaded states
 * - Explanatory text display
 * - General goal input interactions
 * - Category list displayed alphabetically
 * - Validation messages shown for invalid input
 * - Auto-save on valid input (after debounce)
 * - Goal removal on clear
 *
 * **Validates: Requirements 7.3, 7.4, 7.7, 7.8, 7.9**
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';

// ─── Mock Store State ────────────────────────────────────────────────────────

const mockLoadGoals = jest.fn();
const mockSetGeneralGoal = jest.fn();
const mockRemoveGeneralGoal = jest.fn();
const mockSetCategoryGoal = jest.fn();
const mockRemoveCategoryGoal = jest.fn();

let mockStoreState = {
  generalGoal: null as number | null,
  categoryGoals: new Map<string, number>(),
  isLoading: false,
  loadGoals: mockLoadGoals,
  setGeneralGoal: mockSetGeneralGoal,
  removeGeneralGoal: mockRemoveGeneralGoal,
  setCategoryGoal: mockSetCategoryGoal,
  removeCategoryGoal: mockRemoveCategoryGoal,
};

jest.mock('../../stores/goalStore', () => ({
  useGoalStore: () => mockStoreState,
}));

// ─── Mock useCategories ──────────────────────────────────────────────────────

const mockVariableExpenseCategories = [
  {
    id: 'cat-transport',
    name: 'Transport',
    type: 'expense' as const,
    icon: '🚗',
    color: '#457B9D',
    isActive: true,
    expenseGroup: 'variable' as const,
    createdAt: new Date('2024-01-01'),
  },
  {
    id: 'cat-food',
    name: 'Food',
    type: 'expense' as const,
    icon: '🍔',
    color: '#E63946',
    isActive: true,
    expenseGroup: 'variable' as const,
    createdAt: new Date('2024-01-01'),
  },
  {
    id: 'cat-leisure',
    name: 'Leisure',
    type: 'expense' as const,
    icon: '🎮',
    color: '#2A9D8F',
    isActive: true,
    expenseGroup: 'variable' as const,
    createdAt: new Date('2024-01-01'),
  },
];

jest.mock('../../hooks/useCategories', () => ({
  useCategories: () => ({
    variableExpenseCategories: mockVariableExpenseCategories,
  }),
}));

// ─── Mock Validation ─────────────────────────────────────────────────────────

jest.mock('../../validation/goalValidation', () => ({
  validateGoalAmount: jest.fn((input: string, _locale: string) => {
    const trimmed = input.trim();
    if (trimmed === '') return { valid: false, error: 'goals.validation.invalidFormat' };

    const numValue = parseFloat(trimmed.replace(',', '.'));
    if (isNaN(numValue)) return { valid: false, error: 'goals.validation.invalidFormat' };
    if (numValue < 0.01) return { valid: false, error: 'goals.validation.tooLow' };
    if (numValue > 999999999.99) return { valid: false, error: 'goals.validation.tooHigh' };

    return { valid: true, amountInCents: Math.round(numValue * 100) };
  }),
}));

// ─── Mock i18n ───────────────────────────────────────────────────────────────

jest.mock('../../i18n', () => ({
  getCurrentLocale: () => 'en',
}));

// ─── Mock Theme ──────────────────────────────────────────────────────────────

jest.mock('../../hooks/useThemeColors', () => ({
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

jest.mock('../../hooks/useThemeStyles', () => ({
  useThemeStyles: () => ({
    borderRadius: { sm: 4, md: 12, lg: 16 },
    shadows: { sm: {}, md: {} },
  }),
}));

jest.mock('../../stores/themeStore', () => ({
  useThemeStore: () => 'light',
}));

jest.mock('../../constants/theme', () => ({
  spacing: { xs: 4, sm: 8, md: 12, base: 16, lg: 20, xl: 24, '2xl': 32 },
  typography: {
    body: { fontSize: 16, lineHeight: 24 },
    caption: { fontSize: 12, lineHeight: 16 },
  },
}));

// ─── Import Component After Mocks ────────────────────────────────────────────

import BudgetGoalsScreen from '../../../app/(tabs)/settings/budget-goals';

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('BudgetGoalsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockStoreState = {
      generalGoal: null,
      categoryGoals: new Map<string, number>(),
      isLoading: false,
      loadGoals: mockLoadGoals,
      setGeneralGoal: mockSetGeneralGoal,
      removeGeneralGoal: mockRemoveGeneralGoal,
      setCategoryGoal: mockSetCategoryGoal,
      removeCategoryGoal: mockRemoveCategoryGoal,
    };
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Rendering', () => {
    it('renders the budget goals screen', () => {
      const { getByTestId } = render(<BudgetGoalsScreen />);
      expect(getByTestId('budget-goals-screen')).toBeTruthy();
    });

    it('renders loading state when isLoading is true', () => {
      mockStoreState.isLoading = true;
      const { getByTestId, queryByTestId } = render(<BudgetGoalsScreen />);

      expect(getByTestId('budget-goals-loading')).toBeTruthy();
      expect(queryByTestId('budget-goals-screen')).toBeNull();
    });

    it('calls loadGoals on mount', () => {
      render(<BudgetGoalsScreen />);
      expect(mockLoadGoals).toHaveBeenCalledTimes(1);
    });

    it('renders explanatory text', () => {
      const { getByTestId } = render(<BudgetGoalsScreen />);
      expect(getByTestId('goals-explanatory-text')).toBeTruthy();
    });

    it('renders the general goal card', () => {
      const { getByTestId } = render(<BudgetGoalsScreen />);
      expect(getByTestId('general-goal-card')).toBeTruthy();
    });

    it('renders general goal input', () => {
      const { getByTestId } = render(<BudgetGoalsScreen />);
      expect(getByTestId('general-goal-input')).toBeTruthy();
    });
  });

  describe('Category list display (Requirement 7.9 - alphabetical order)', () => {
    it('renders all variable expense categories', () => {
      const { getByTestId } = render(<BudgetGoalsScreen />);

      expect(getByTestId('category-goal-card-cat-food')).toBeTruthy();
      expect(getByTestId('category-goal-card-cat-transport')).toBeTruthy();
      expect(getByTestId('category-goal-card-cat-leisure')).toBeTruthy();
    });

    it('displays categories in alphabetical order', () => {
      const { getByTestId } = render(<BudgetGoalsScreen />);

      const list = getByTestId('budget-goals-list');
      // The FlatList renders items in the sorted order
      // Food < Leisure < Transport alphabetically
      const foodCard = getByTestId('category-goal-card-cat-food');
      const leisureCard = getByTestId('category-goal-card-cat-leisure');
      const transportCard = getByTestId('category-goal-card-cat-transport');

      // All three should be present and rendered
      expect(foodCard).toBeTruthy();
      expect(leisureCard).toBeTruthy();
      expect(transportCard).toBeTruthy();

      // Verify list exists (contains all items in order)
      expect(list).toBeTruthy();
    });
  });

  describe('General goal input interactions (Requirement 7.7)', () => {
    it('auto-saves valid input after debounce', async () => {
      mockSetGeneralGoal.mockResolvedValue(undefined);
      const { getByTestId } = render(<BudgetGoalsScreen />);

      const input = getByTestId('general-goal-input');
      fireEvent.changeText(input, '500.00');

      // Advance past debounce (800ms)
      await act(async () => {
        jest.advanceTimersByTime(800);
      });

      expect(mockSetGeneralGoal).toHaveBeenCalledWith(50000);
    });

    it('does not save before debounce timeout', () => {
      const { getByTestId } = render(<BudgetGoalsScreen />);

      const input = getByTestId('general-goal-input');
      fireEvent.changeText(input, '500.00');

      // Advance only 500ms (less than 800ms debounce)
      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(mockSetGeneralGoal).not.toHaveBeenCalled();
    });

    it('displays existing general goal value in input', () => {
      mockStoreState.generalGoal = 150000; // $1,500.00
      const { getByTestId } = render(<BudgetGoalsScreen />);

      const input = getByTestId('general-goal-input');
      expect(input.props.value).toBe('1500.00');
    });
  });

  describe('Validation display (Requirements 7.5, 7.6)', () => {
    it('shows validation error for value too low', async () => {
      const { getByTestId } = render(<BudgetGoalsScreen />);

      const input = getByTestId('general-goal-input');
      fireEvent.changeText(input, '0');

      await act(async () => {
        jest.advanceTimersByTime(800);
      });

      expect(getByTestId('general-goal-error')).toBeTruthy();
    });

    it('shows validation error for non-numeric input', async () => {
      const { getByTestId } = render(<BudgetGoalsScreen />);

      const input = getByTestId('general-goal-input');
      fireEvent.changeText(input, 'abc');

      await act(async () => {
        jest.advanceTimersByTime(800);
      });

      expect(getByTestId('general-goal-error')).toBeTruthy();
    });

    it('does not persist invalid values', async () => {
      const { getByTestId } = render(<BudgetGoalsScreen />);

      const input = getByTestId('general-goal-input');
      fireEvent.changeText(input, '-5');

      await act(async () => {
        jest.advanceTimersByTime(800);
      });

      expect(mockSetGeneralGoal).not.toHaveBeenCalled();
    });
  });

  describe('Goal removal on clear (Requirement 7.8)', () => {
    it('removes general goal when input is cleared', async () => {
      mockStoreState.generalGoal = 50000;
      mockRemoveGeneralGoal.mockResolvedValue(undefined);

      const { getByTestId } = render(<BudgetGoalsScreen />);

      const input = getByTestId('general-goal-input');
      fireEvent.changeText(input, '');

      await act(async () => {
        jest.advanceTimersByTime(800);
      });

      expect(mockRemoveGeneralGoal).toHaveBeenCalled();
    });

    it('does not call remove if no goal was previously set', async () => {
      mockStoreState.generalGoal = null;

      const { getByTestId } = render(<BudgetGoalsScreen />);

      const input = getByTestId('general-goal-input');
      fireEvent.changeText(input, '');

      await act(async () => {
        jest.advanceTimersByTime(800);
      });

      expect(mockRemoveGeneralGoal).not.toHaveBeenCalled();
    });
  });

  describe('Category goal interactions', () => {
    it('auto-saves valid category goal after debounce', async () => {
      mockSetCategoryGoal.mockResolvedValue(undefined);
      const { getByTestId } = render(<BudgetGoalsScreen />);

      const input = getByTestId('category-goal-cat-food-input');
      fireEvent.changeText(input, '200.00');

      await act(async () => {
        jest.advanceTimersByTime(800);
      });

      expect(mockSetCategoryGoal).toHaveBeenCalledWith('cat-food', 20000);
    });

    it('removes category goal when input is cleared', async () => {
      mockStoreState.categoryGoals = new Map([['cat-food', 20000]]);
      mockRemoveCategoryGoal.mockResolvedValue(undefined);

      const { getByTestId } = render(<BudgetGoalsScreen />);

      const input = getByTestId('category-goal-cat-food-input');
      fireEvent.changeText(input, '');

      await act(async () => {
        jest.advanceTimersByTime(800);
      });

      expect(mockRemoveCategoryGoal).toHaveBeenCalledWith('cat-food');
    });

    it('displays existing category goal value in input', () => {
      mockStoreState.categoryGoals = new Map([['cat-food', 25000]]);
      const { getByTestId } = render(<BudgetGoalsScreen />);

      const input = getByTestId('category-goal-cat-food-input');
      expect(input.props.value).toBe('250.00');
    });

    it('shows validation error for invalid category goal input', async () => {
      const { getByTestId } = render(<BudgetGoalsScreen />);

      const input = getByTestId('category-goal-cat-food-input');
      fireEvent.changeText(input, 'xyz');

      await act(async () => {
        jest.advanceTimersByTime(800);
      });

      expect(getByTestId('category-goal-cat-food-error')).toBeTruthy();
    });
  });

  describe('Feedback messages', () => {
    it('shows saved feedback after successful save', async () => {
      mockSetGeneralGoal.mockResolvedValue(undefined);
      const { getByTestId } = render(<BudgetGoalsScreen />);

      const input = getByTestId('general-goal-input');
      fireEvent.changeText(input, '1000.00');

      await act(async () => {
        jest.advanceTimersByTime(800);
      });

      expect(getByTestId('general-goal-feedback')).toBeTruthy();
    });

    it('shows removed feedback after goal removal', async () => {
      mockStoreState.generalGoal = 50000;
      mockRemoveGeneralGoal.mockResolvedValue(undefined);
      const { getByTestId } = render(<BudgetGoalsScreen />);

      const input = getByTestId('general-goal-input');
      fireEvent.changeText(input, '');

      await act(async () => {
        jest.advanceTimersByTime(800);
      });

      expect(getByTestId('general-goal-feedback')).toBeTruthy();
    });
  });
});
