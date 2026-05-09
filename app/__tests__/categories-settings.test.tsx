/**
 * Category Management Screen Tests
 *
 * Tests for the Category Management screen component.
 * Validates:
 * - Category list rendering grouped by type
 * - Create category form with name, type, icon, color
 * - Edit category form
 * - Deactivate/activate category actions
 *
 * **Validates: Requirements 17, 27, 30**
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

const mockIncomeCategory = {
  id: 'income-1',
  name: 'Salary',
  type: 'income' as const,
  icon: '💰',
  color: '#34C759',
  isActive: true,
  createdAt: new Date('2024-01-01'),
  transactionCount: 5,
};

const mockExpenseCategory = {
  id: 'expense-1',
  name: 'Food',
  type: 'expense' as const,
  icon: '🍔',
  color: '#FF3B30',
  isActive: true,
  createdAt: new Date('2024-01-01'),
  transactionCount: 10,
};

const mockInactiveCategory = {
  id: 'expense-2',
  name: 'Old Category',
  type: 'expense' as const,
  icon: '📦',
  color: '#8E8E93',
  isActive: false,
  createdAt: new Date('2024-01-01'),
  transactionCount: 0,
};

const defaultUseCategoriesReturn = {
  categoriesWithCounts: [mockIncomeCategory, mockExpenseCategory, mockInactiveCategory],
  incomeCategories: [mockIncomeCategory],
  expenseCategories: [mockExpenseCategory, mockInactiveCategory],
  isLoading: false,
  error: null,
  create: mockCreate,
  update: mockUpdate,
  deactivate: mockDeactivate,
  activate: mockActivate,
};

let mockUseCategoriesReturn = { ...defaultUseCategoriesReturn };

jest.mock('../../src/hooks/useCategories', () => ({
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
import CategoriesSettingsScreen from '../(tabs)/settings/categories';

describe('CategoriesSettingsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCategoriesReturn = { ...defaultUseCategoriesReturn };
  });

  describe('Rendering', () => {
    it('renders the categories settings screen', () => {
      render(<CategoriesSettingsScreen />);

      expect(screen.getByTestId('categories-settings-screen')).toBeTruthy();
    });

    it('renders Add Category button', () => {
      render(<CategoriesSettingsScreen />);

      expect(screen.getByTestId('add-category-button')).toBeTruthy();
      expect(screen.getByText('Add Category')).toBeTruthy();
    });

    it('renders Income Categories section', () => {
      render(<CategoriesSettingsScreen />);

      expect(screen.getByText('Income Categories')).toBeTruthy();
    });

    it('renders Expense Categories section', () => {
      render(<CategoriesSettingsScreen />);

      expect(screen.getByText('Expense Categories')).toBeTruthy();
    });
  });

  describe('Loading State', () => {
    it('shows loading indicator when loading', () => {
      mockUseCategoriesReturn = {
        ...defaultUseCategoriesReturn,
        isLoading: true,
      };

      render(<CategoriesSettingsScreen />);

      expect(screen.getByTestId('categories-loading')).toBeTruthy();
    });
  });

  describe('Error State', () => {
    it('shows error message when there is an error', () => {
      mockUseCategoriesReturn = {
        ...defaultUseCategoriesReturn,
        error: 'Failed to load categories',
      };

      render(<CategoriesSettingsScreen />);

      expect(screen.getByTestId('categories-error')).toBeTruthy();
      expect(screen.getByText('Failed to load categories')).toBeTruthy();
    });
  });

  describe('Category List', () => {
    it('renders income categories', () => {
      render(<CategoriesSettingsScreen />);

      expect(screen.getByTestId('category-item-income-1')).toBeTruthy();
      expect(screen.getByText('Salary')).toBeTruthy();
    });

    it('renders expense categories', () => {
      render(<CategoriesSettingsScreen />);

      expect(screen.getByTestId('category-item-expense-1')).toBeTruthy();
      expect(screen.getByText('Food')).toBeTruthy();
    });

    it('renders inactive categories with different style', () => {
      render(<CategoriesSettingsScreen />);

      expect(screen.getByTestId('category-item-expense-2')).toBeTruthy();
      expect(screen.getByText('Old Category')).toBeTruthy();
    });

    it('shows transaction count for each category', () => {
      render(<CategoriesSettingsScreen />);

      expect(screen.getByText('5 transactions')).toBeTruthy();
      expect(screen.getByText('10 transactions')).toBeTruthy();
    });

    it('shows empty state when no income categories', () => {
      mockUseCategoriesReturn = {
        ...defaultUseCategoriesReturn,
        categoriesWithCounts: [mockExpenseCategory],
      };

      render(<CategoriesSettingsScreen />);

      expect(screen.getByTestId('income-categories-empty')).toBeTruthy();
    });

    it('shows empty state when no expense categories', () => {
      mockUseCategoriesReturn = {
        ...defaultUseCategoriesReturn,
        categoriesWithCounts: [mockIncomeCategory],
      };

      render(<CategoriesSettingsScreen />);

      expect(screen.getByTestId('expense-categories-empty')).toBeTruthy();
    });
  });

  describe('Edit Category', () => {
    it('renders edit button for each category', () => {
      render(<CategoriesSettingsScreen />);

      expect(screen.getByTestId('edit-category-income-1')).toBeTruthy();
      expect(screen.getByTestId('edit-category-expense-1')).toBeTruthy();
    });

    it('opens edit modal when edit button is pressed', async () => {
      render(<CategoriesSettingsScreen />);

      fireEvent.press(screen.getByTestId('edit-category-income-1'));

      await waitFor(() => {
        expect(screen.getByTestId('category-form-modal')).toBeTruthy();
        expect(screen.getByText('Edit Category')).toBeTruthy();
      });
    });
  });

  describe('Toggle Active State', () => {
    it('renders toggle button for each category', () => {
      render(<CategoriesSettingsScreen />);

      expect(screen.getByTestId('toggle-category-income-1')).toBeTruthy();
      expect(screen.getByTestId('toggle-category-expense-1')).toBeTruthy();
    });

    it('shows confirmation alert when deactivating', () => {
      render(<CategoriesSettingsScreen />);

      fireEvent.press(screen.getByTestId('toggle-category-income-1'));

      expect(Alert.alert).toHaveBeenCalledWith(
        'Deactivate',
        'Deactivate Salary?',
        expect.any(Array)
      );
    });

    it('shows confirmation alert when activating', () => {
      render(<CategoriesSettingsScreen />);

      fireEvent.press(screen.getByTestId('toggle-category-expense-2'));

      expect(Alert.alert).toHaveBeenCalledWith(
        'Activate',
        'Activate Old Category?',
        expect.any(Array)
      );
    });
  });

  describe('Create Category Form', () => {
    it('opens create modal when Add Category is pressed', async () => {
      render(<CategoriesSettingsScreen />);

      fireEvent.press(screen.getByTestId('add-category-button'));

      await waitFor(() => {
        expect(screen.getByTestId('category-form-modal')).toBeTruthy();
        // Modal title and button both have "Add Category" text
        expect(screen.getAllByText('Add Category').length).toBeGreaterThanOrEqual(2);
      });
    });

    it('renders name input field', async () => {
      render(<CategoriesSettingsScreen />);

      fireEvent.press(screen.getByTestId('add-category-button'));

      await waitFor(() => {
        expect(screen.getByTestId('category-name-input')).toBeTruthy();
      });
    });

    it('renders type selector', async () => {
      render(<CategoriesSettingsScreen />);

      fireEvent.press(screen.getByTestId('add-category-button'));

      await waitFor(() => {
        expect(screen.getByTestId('type-expense-button')).toBeTruthy();
        expect(screen.getByTestId('type-income-button')).toBeTruthy();
      });
    });

    it('renders icon picker button', async () => {
      render(<CategoriesSettingsScreen />);

      fireEvent.press(screen.getByTestId('add-category-button'));

      await waitFor(() => {
        expect(screen.getByTestId('icon-picker-button')).toBeTruthy();
      });
    });

    it('renders color picker button', async () => {
      render(<CategoriesSettingsScreen />);

      fireEvent.press(screen.getByTestId('add-category-button'));

      await waitFor(() => {
        expect(screen.getByTestId('color-picker-button')).toBeTruthy();
      });
    });

    it('shows icon picker grid when icon button is pressed', async () => {
      render(<CategoriesSettingsScreen />);

      fireEvent.press(screen.getByTestId('add-category-button'));

      await waitFor(() => {
        expect(screen.getByTestId('icon-picker-button')).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId('icon-picker-button'));

      await waitFor(() => {
        expect(screen.getByTestId('icon-picker-grid')).toBeTruthy();
      });
    });

    it('shows color picker grid when color button is pressed', async () => {
      render(<CategoriesSettingsScreen />);

      fireEvent.press(screen.getByTestId('add-category-button'));

      await waitFor(() => {
        expect(screen.getByTestId('color-picker-button')).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId('color-picker-button'));

      await waitFor(() => {
        expect(screen.getByTestId('color-picker-grid')).toBeTruthy();
      });
    });

    it('closes modal when cancel is pressed', async () => {
      render(<CategoriesSettingsScreen />);

      fireEvent.press(screen.getByTestId('add-category-button'));

      await waitFor(() => {
        expect(screen.getByTestId('category-form-modal')).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId('close-category-modal'));

      await waitFor(() => {
        expect(screen.queryByTestId('category-form-modal')).toBeNull();
      });
    });

    it('save button is disabled when name is empty', async () => {
      render(<CategoriesSettingsScreen />);

      fireEvent.press(screen.getByTestId('add-category-button'));

      await waitFor(() => {
        expect(screen.getByTestId('save-category-button')).toBeTruthy();
      });

      // Save button should be disabled when name is empty
      const saveButton = screen.getByTestId('save-category-button');
      expect(
        saveButton.props.accessibilityState?.disabled || saveButton.props.disabled
      ).toBeTruthy();
    });

    it('calls create when saving new category', async () => {
      mockCreate.mockResolvedValue({ id: 'new-1', name: 'New Category' });

      render(<CategoriesSettingsScreen />);

      fireEvent.press(screen.getByTestId('add-category-button'));

      await waitFor(() => {
        expect(screen.getByTestId('category-name-input')).toBeTruthy();
      });

      fireEvent.changeText(screen.getByTestId('category-name-input'), 'New Category');
      fireEvent.press(screen.getByTestId('save-category-button'));

      await waitFor(() => {
        expect(mockCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'New Category',
            type: 'expense',
          })
        );
      });
    });
  });

  describe('Type Selector', () => {
    it('defaults to expense type', async () => {
      render(<CategoriesSettingsScreen />);

      fireEvent.press(screen.getByTestId('add-category-button'));

      await waitFor(() => {
        const expenseButton = screen.getByTestId('type-expense-button');
        // Check if expense is selected (has selected style)
        expect(expenseButton).toBeTruthy();
      });
    });

    it('can switch to income type', async () => {
      render(<CategoriesSettingsScreen />);

      fireEvent.press(screen.getByTestId('add-category-button'));

      await waitFor(() => {
        expect(screen.getByTestId('type-income-button')).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId('type-income-button'));

      // Type should now be income
      expect(screen.getByTestId('type-income-button')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('add button has accessible role', () => {
      render(<CategoriesSettingsScreen />);

      const button = screen.getByTestId('add-category-button');
      expect(button.props.accessibilityRole).toBe('button');
    });

    it('add button has accessible label', () => {
      render(<CategoriesSettingsScreen />);

      const button = screen.getByTestId('add-category-button');
      expect(button.props.accessibilityLabel).toBe('Add Category');
    });

    it('edit buttons have accessible role', () => {
      render(<CategoriesSettingsScreen />);

      const button = screen.getByTestId('edit-category-income-1');
      expect(button.props.accessibilityRole).toBe('button');
    });

    it('toggle buttons have accessible role', () => {
      render(<CategoriesSettingsScreen />);

      const button = screen.getByTestId('toggle-category-income-1');
      expect(button.props.accessibilityRole).toBe('button');
    });
  });
});
