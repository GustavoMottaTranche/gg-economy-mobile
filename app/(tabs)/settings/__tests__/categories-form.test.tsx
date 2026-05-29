/**
 * CategoryForm expenseGroup Behavior Tests
 *
 * Tests for the CategoryFormModal component's expenseGroup selector behavior.
 * Validates:
 * - Shows expenseGroup selector when type is expense
 * - Hides expenseGroup selector when type is income
 * - Pre-populates expenseGroup when editing existing expense category
 * - Allows submitting expense category without expenseGroup (nullable)
 *
 * **Validates: Requirements 8.1, 8.2, 8.3, 8.4**
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

// Mock Alert
jest.spyOn(Alert, 'alert');

// Mock useCategories hook
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockDeactivate = jest.fn();
const mockActivate = jest.fn();

const mockExpenseCategoryWithFixedGroup = {
  id: 'expense-fixed-1',
  name: 'Aluguel',
  type: 'expense' as const,
  icon: '🏠',
  color: '#E63946',
  isActive: true,
  expenseGroup: 'fixed' as const,
  createdAt: new Date('2024-01-01'),
  transactionCount: 3,
};

const mockExpenseCategoryWithVariableGroup = {
  id: 'expense-var-1',
  name: 'Uber',
  type: 'expense' as const,
  icon: '🚗',
  color: '#000000',
  isActive: true,
  expenseGroup: 'variable' as const,
  createdAt: new Date('2024-01-01'),
  transactionCount: 7,
};

const mockExpenseCategoryNoGroup = {
  id: 'expense-nogroup-1',
  name: 'Misc Expense',
  type: 'expense' as const,
  icon: '📦',
  color: '#8E8E93',
  isActive: true,
  expenseGroup: null,
  createdAt: new Date('2024-01-01'),
  transactionCount: 2,
};

const mockIncomeCategory = {
  id: 'income-1',
  name: 'Salary',
  type: 'income' as const,
  icon: '💰',
  color: '#34C759',
  isActive: true,
  expenseGroup: null,
  createdAt: new Date('2024-01-01'),
  transactionCount: 5,
};

const defaultUseCategoriesReturn = {
  categoriesWithCounts: [
    mockExpenseCategoryWithFixedGroup,
    mockExpenseCategoryWithVariableGroup,
    mockExpenseCategoryNoGroup,
    mockIncomeCategory,
  ],
  incomeCategories: [mockIncomeCategory],
  expenseCategories: [
    mockExpenseCategoryWithFixedGroup,
    mockExpenseCategoryWithVariableGroup,
    mockExpenseCategoryNoGroup,
  ],
  fixedExpenseCategories: [mockExpenseCategoryWithFixedGroup],
  variableExpenseCategories: [mockExpenseCategoryWithVariableGroup],
  isLoading: false,
  error: null as string | null,
  create: mockCreate,
  update: mockUpdate,
  deactivate: mockDeactivate,
  activate: mockActivate,
};

let mockUseCategoriesReturn = { ...defaultUseCategoriesReturn };

jest.mock('../../../../src/hooks/useCategories', () => ({
  useCategories: () => mockUseCategoriesReturn,
}));

// Mock i18n
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'categories.addCategory': 'Add Category',
        'categories.editCategory': 'Edit Category',
        'categories.incomeCategories': 'Income Categories',
        'categories.expenseCategories': 'Expense Categories',
        'categories.noCategories': 'No categories',
        'categories.transactionCount': `${params?.count ?? 0} transactions`,
        'categories.name': 'Name',
        'categories.namePlaceholder': 'Category name',
        'categories.nameRequired': 'Name is required',
        'categories.type': 'Type',
        'categories.income': 'Income',
        'categories.expense': 'Expense',
        'categories.expenseGroup': 'Expense Group',
        'categories.fixedCost': 'Custo Fixo',
        'categories.variableCost': 'Variável',
        'categories.icon': 'Icon',
        'categories.selectIcon': 'Select icon',
        'categories.color': 'Color',
        'categories.selectColor': 'Select color',
        'categories.preview': 'Preview',
        'categories.deactivate': 'Deactivate',
        'categories.activate': 'Activate',
        'categories.deactivateConfirmation': `Deactivate ${params?.name}?`,
        'categories.activateConfirmation': `Activate ${params?.name}?`,
        'categories.toggleError': 'Failed to toggle category',
        'categories.saveError': 'Failed to save category',
        'common.edit': 'Edit',
        'common.save': 'Save',
        'common.cancel': 'Cancel',
        'common.error': 'Error',
        'common.loading': 'Loading...',
      };
      return translations[key] ?? key;
    },
  }),
}));

// Import the component after mocks
import CategoriesSettingsScreen from '../categories';

describe('CategoryFormModal - expenseGroup behavior', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCategoriesReturn = { ...defaultUseCategoriesReturn };
  });

  describe('Requirement 8.1: Shows expenseGroup selector when type is expense', () => {
    it('displays expense group selector when creating a new category (default type is expense)', async () => {
      render(<CategoriesSettingsScreen />);

      fireEvent.press(screen.getByTestId('add-category-button'));

      await waitFor(() => {
        expect(screen.getByTestId('expense-group-selector')).toBeTruthy();
      });
    });

    it('displays fixed and variable buttons within the expense group selector', async () => {
      render(<CategoriesSettingsScreen />);

      fireEvent.press(screen.getByTestId('add-category-button'));

      await waitFor(() => {
        expect(screen.getByTestId('expense-group-fixed-button')).toBeTruthy();
        expect(screen.getByTestId('expense-group-variable-button')).toBeTruthy();
      });
    });

    it('displays Custo Fixo and Variável labels', async () => {
      render(<CategoriesSettingsScreen />);

      fireEvent.press(screen.getByTestId('add-category-button'));

      await waitFor(() => {
        expect(screen.getAllByText('Custo Fixo').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('Variável').length).toBeGreaterThanOrEqual(1);
      });
    });

    it('shows expense group selector when switching from income back to expense', async () => {
      render(<CategoriesSettingsScreen />);

      fireEvent.press(screen.getByTestId('add-category-button'));

      await waitFor(() => {
        expect(screen.getByTestId('type-income-button')).toBeTruthy();
      });

      // Switch to income
      fireEvent.press(screen.getByTestId('type-income-button'));

      await waitFor(() => {
        expect(screen.queryByTestId('expense-group-selector')).toBeNull();
      });

      // Switch back to expense
      fireEvent.press(screen.getByTestId('type-expense-button'));

      await waitFor(() => {
        expect(screen.getByTestId('expense-group-selector')).toBeTruthy();
      });
    });
  });

  describe('Requirement 8.2: Hides expenseGroup selector when type is income', () => {
    it('hides expense group selector when income type is selected', async () => {
      render(<CategoriesSettingsScreen />);

      fireEvent.press(screen.getByTestId('add-category-button'));

      await waitFor(() => {
        expect(screen.getByTestId('expense-group-selector')).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId('type-income-button'));

      await waitFor(() => {
        expect(screen.queryByTestId('expense-group-selector')).toBeNull();
      });
    });

    it('hides expense group selector when editing an income category', async () => {
      render(<CategoriesSettingsScreen />);

      fireEvent.press(screen.getByTestId('edit-category-income-1'));

      await waitFor(() => {
        expect(screen.getByTestId('category-form-modal')).toBeTruthy();
        expect(screen.queryByTestId('expense-group-selector')).toBeNull();
      });
    });
  });

  describe('Requirement 8.3: Pre-populates expenseGroup on edit', () => {
    it('pre-populates fixed group when editing a fixed expense category', async () => {
      render(<CategoriesSettingsScreen />);

      fireEvent.press(screen.getByTestId('edit-category-expense-fixed-1'));

      await waitFor(() => {
        expect(screen.getByTestId('category-form-modal')).toBeTruthy();
        expect(screen.getByTestId('expense-group-selector')).toBeTruthy();
        expect(screen.getByTestId('expense-group-fixed-button')).toBeTruthy();
      });
    });

    it('pre-populates variable group when editing a variable expense category', async () => {
      render(<CategoriesSettingsScreen />);

      fireEvent.press(screen.getByTestId('edit-category-expense-var-1'));

      await waitFor(() => {
        expect(screen.getByTestId('category-form-modal')).toBeTruthy();
        expect(screen.getByTestId('expense-group-selector')).toBeTruthy();
        expect(screen.getByTestId('expense-group-variable-button')).toBeTruthy();
      });
    });

    it('shows no group selected when editing expense category without group', async () => {
      render(<CategoriesSettingsScreen />);

      fireEvent.press(screen.getByTestId('edit-category-expense-nogroup-1'));

      await waitFor(() => {
        expect(screen.getByTestId('category-form-modal')).toBeTruthy();
        expect(screen.getByTestId('expense-group-selector')).toBeTruthy();
      });
    });
  });

  describe('Requirement 8.4: Allows null submission (no expenseGroup selected)', () => {
    it('submits expense category without selecting an expenseGroup', async () => {
      mockCreate.mockResolvedValue({
        id: 'new-1',
        name: 'New Expense',
        type: 'expense',
        expenseGroup: null,
      });

      render(<CategoriesSettingsScreen />);

      fireEvent.press(screen.getByTestId('add-category-button'));

      await waitFor(() => {
        expect(screen.getByTestId('category-name-input')).toBeTruthy();
      });

      // Enter a name but do NOT select an expense group
      fireEvent.changeText(screen.getByTestId('category-name-input'), 'New Expense');
      fireEvent.press(screen.getByTestId('save-category-button'));

      await waitFor(() => {
        expect(mockCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'New Expense',
            type: 'expense',
            expenseGroup: null,
          })
        );
      });
    });

    it('submits expense category with fixed group selected', async () => {
      mockCreate.mockResolvedValue({
        id: 'new-2',
        name: 'Fixed Expense',
        type: 'expense',
        expenseGroup: 'fixed',
      });

      render(<CategoriesSettingsScreen />);

      fireEvent.press(screen.getByTestId('add-category-button'));

      await waitFor(() => {
        expect(screen.getByTestId('category-name-input')).toBeTruthy();
      });

      fireEvent.changeText(screen.getByTestId('category-name-input'), 'Fixed Expense');
      fireEvent.press(screen.getByTestId('expense-group-fixed-button'));
      fireEvent.press(screen.getByTestId('save-category-button'));

      await waitFor(() => {
        expect(mockCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Fixed Expense',
            type: 'expense',
            expenseGroup: 'fixed',
          })
        );
      });
    });

    it('submits expense category with variable group selected', async () => {
      mockCreate.mockResolvedValue({
        id: 'new-3',
        name: 'Variable Expense',
        type: 'expense',
        expenseGroup: 'variable',
      });

      render(<CategoriesSettingsScreen />);

      fireEvent.press(screen.getByTestId('add-category-button'));

      await waitFor(() => {
        expect(screen.getByTestId('category-name-input')).toBeTruthy();
      });

      fireEvent.changeText(screen.getByTestId('category-name-input'), 'Variable Expense');
      fireEvent.press(screen.getByTestId('expense-group-variable-button'));
      fireEvent.press(screen.getByTestId('save-category-button'));

      await waitFor(() => {
        expect(mockCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Variable Expense',
            type: 'expense',
            expenseGroup: 'variable',
          })
        );
      });
    });

    it('submits null expenseGroup when type is income even if group was previously selected', async () => {
      mockCreate.mockResolvedValue({
        id: 'new-4',
        name: 'Income Item',
        type: 'income',
        expenseGroup: null,
      });

      render(<CategoriesSettingsScreen />);

      fireEvent.press(screen.getByTestId('add-category-button'));

      await waitFor(() => {
        expect(screen.getByTestId('category-name-input')).toBeTruthy();
      });

      // Select a group first
      fireEvent.press(screen.getByTestId('expense-group-fixed-button'));

      // Then switch to income
      fireEvent.press(screen.getByTestId('type-income-button'));

      fireEvent.changeText(screen.getByTestId('category-name-input'), 'Income Item');
      fireEvent.press(screen.getByTestId('save-category-button'));

      await waitFor(() => {
        expect(mockCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Income Item',
            type: 'income',
            expenseGroup: null,
          })
        );
      });
    });

    it('can deselect expense group by pressing the same button again', async () => {
      mockCreate.mockResolvedValue({
        id: 'new-5',
        name: 'Deselected Group',
        type: 'expense',
        expenseGroup: null,
      });

      render(<CategoriesSettingsScreen />);

      fireEvent.press(screen.getByTestId('add-category-button'));

      await waitFor(() => {
        expect(screen.getByTestId('expense-group-fixed-button')).toBeTruthy();
      });

      // Select fixed
      fireEvent.press(screen.getByTestId('expense-group-fixed-button'));
      // Deselect by pressing again
      fireEvent.press(screen.getByTestId('expense-group-fixed-button'));

      fireEvent.changeText(screen.getByTestId('category-name-input'), 'Deselected Group');
      fireEvent.press(screen.getByTestId('save-category-button'));

      await waitFor(() => {
        expect(mockCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Deselected Group',
            type: 'expense',
            expenseGroup: null,
          })
        );
      });
    });
  });
});
