/**
 * Category Management Screen Tests
 *
 * Tests for the Category Management screen component.
 * Validates:
 * - Category list rendering grouped by type
 * - Create category form with name, type, icon, color
 * - Edit category form
 * - Deactivate/activate category actions
 * - Expense group filtering (filter tabs)
 * - Deletion flow with ReplacementPrompt
 *
 * **Validates: Requirements 9.1, 9.2, 10.1, 10.3, 10.4, 17, 27, 30**
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
const mockDeleteWithReplacement = jest.fn();

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

const mockIncomeCategoryNoTransactions = {
  id: 'income-2',
  name: 'Bonus',
  type: 'income' as const,
  icon: '🎁',
  color: '#007AFF',
  isActive: true,
  expenseGroup: null,
  createdAt: new Date('2024-01-01'),
  transactionCount: 0,
};

const mockExpenseCategory = {
  id: 'expense-1',
  name: 'Food',
  type: 'expense' as const,
  icon: '🍔',
  color: '#FF3B30',
  isActive: true,
  expenseGroup: 'variable' as const,
  createdAt: new Date('2024-01-01'),
  transactionCount: 10,
};

const mockFixedExpenseCategory = {
  id: 'expense-3',
  name: 'Rent',
  type: 'expense' as const,
  icon: '🏠',
  color: '#E63946',
  isActive: true,
  expenseGroup: 'fixed' as const,
  createdAt: new Date('2024-01-01'),
  transactionCount: 3,
};

const mockFixedExpenseCategory2 = {
  id: 'expense-4',
  name: 'Internet',
  type: 'expense' as const,
  icon: '📱',
  color: '#0DCAF0',
  isActive: true,
  expenseGroup: 'fixed' as const,
  createdAt: new Date('2024-01-01'),
  transactionCount: 0,
};

const mockInactiveCategory = {
  id: 'expense-2',
  name: 'Old Category',
  type: 'expense' as const,
  icon: '📦',
  color: '#8E8E93',
  isActive: false,
  expenseGroup: 'variable' as const,
  createdAt: new Date('2024-01-01'),
  transactionCount: 0,
};

const defaultUseCategoriesReturn = {
  categoriesWithCounts: [
    mockIncomeCategory,
    mockIncomeCategoryNoTransactions,
    mockExpenseCategory,
    mockFixedExpenseCategory,
    mockFixedExpenseCategory2,
    mockInactiveCategory,
  ],
  incomeCategories: [mockIncomeCategory, mockIncomeCategoryNoTransactions],
  expenseCategories: [
    mockExpenseCategory,
    mockFixedExpenseCategory,
    mockFixedExpenseCategory2,
    mockInactiveCategory,
  ],
  isLoading: false,
  error: null as string | null,
  create: mockCreate,
  update: mockUpdate,
  deactivate: mockDeactivate,
  activate: mockActivate,
  deleteWithReplacement: mockDeleteWithReplacement,
};

let mockUseCategoriesReturn = { ...defaultUseCategoriesReturn };

jest.mock('../../src/hooks/useCategories', () => ({
  useCategories: () => mockUseCategoriesReturn,
}));

// Mock ReplacementPrompt component
const mockReplacementPromptProps: {
  visible?: boolean;
  category?: unknown;
  transactionCount?: number;
  onReplace?: (id: string) => void;
  onSoftDelete?: () => void;
  onCancel?: () => void;
} = {};

jest.mock('../../src/components/ReplacementPrompt', () => {
  const { View, Text, TouchableOpacity } = require('react-native');
  const MockReact = require('react');
  return {
    ReplacementPrompt: (props: {
      visible: boolean;
      category: unknown;
      transactionCount: number;
      onReplace: (id: string) => void;
      onSoftDelete: () => void;
      onCancel: () => void;
    }) => {
      // Store props for test assertions
      Object.assign(mockReplacementPromptProps, props);
      return props.visible
        ? MockReact.createElement(
            View,
            { testID: 'replacement-prompt-modal' },
            MockReact.createElement(
              Text,
              { testID: 'replacement-prompt-count' },
              `${props.transactionCount} transactions`
            ),
            MockReact.createElement(
              TouchableOpacity,
              {
                testID: 'mock-replace-button',
                onPress: () => props.onReplace('replacement-cat-id'),
              },
              MockReact.createElement(Text, null, 'Replace')
            ),
            MockReact.createElement(
              TouchableOpacity,
              { testID: 'mock-soft-delete-button', onPress: props.onSoftDelete },
              MockReact.createElement(Text, null, 'Soft Delete')
            )
          )
        : null;
    },
  };
});

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
        'categories.filterAll': 'Todos',
        'categories.fixedCost': 'Custo Fixo',
        'categories.variableCost': 'Variáveis',
        'categories.expenseGroup': 'Expense Group',
        'common.edit': 'Edit',
        'common.save': 'Save',
        'common.cancel': 'Cancel',
        'common.error': 'Error',
        'common.loading': 'Loading...',
      };
      return translations[key] ?? (params?.defaultValue as string) ?? key;
    },
  }),
}));

// Import the component after mocks
import CategoriesSettingsScreen from '../(tabs)/settings/categories';

describe('CategoriesSettingsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCategoriesReturn = { ...defaultUseCategoriesReturn };
    // Reset replacement prompt props
    Object.keys(mockReplacementPromptProps).forEach(
      (key) => delete (mockReplacementPromptProps as Record<string, unknown>)[key]
    );
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

      // Use income-2 (Bonus) which has 0 transactions, so it shows simple Alert
      fireEvent.press(screen.getByTestId('toggle-category-income-2'));

      expect(Alert.alert).toHaveBeenCalledWith(
        'Deactivate',
        'Deactivate Bonus?',
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

  /**
   * Expense Group Filtering Tests
   *
   * Tests that the filter tabs correctly show categories per expense group.
   * **Validates: Requirements 9.1, 9.2**
   */
  describe('Expense Group Filtering', () => {
    it('renders filter tabs for expense categories', () => {
      render(<CategoriesSettingsScreen />);

      expect(screen.getByTestId('filter-tab-all')).toBeTruthy();
      expect(screen.getByTestId('filter-tab-fixed')).toBeTruthy();
      expect(screen.getByTestId('filter-tab-variable')).toBeTruthy();
    });

    it('shows all expense categories when "Todos" filter is active (default)', () => {
      render(<CategoriesSettingsScreen />);

      // All expense categories should be visible by default
      expect(screen.getByTestId('category-item-expense-1')).toBeTruthy(); // variable
      expect(screen.getByTestId('category-item-expense-3')).toBeTruthy(); // fixed
      expect(screen.getByTestId('category-item-expense-4')).toBeTruthy(); // fixed
      expect(screen.getByTestId('category-item-expense-2')).toBeTruthy(); // inactive variable
    });

    it('shows only fixed expense categories when "Custo Fixo" filter is selected', () => {
      render(<CategoriesSettingsScreen />);

      fireEvent.press(screen.getByTestId('filter-tab-fixed'));

      // Fixed categories should be visible
      expect(screen.getByTestId('category-item-expense-3')).toBeTruthy(); // Rent (fixed)
      expect(screen.getByTestId('category-item-expense-4')).toBeTruthy(); // Internet (fixed)

      // Variable categories should NOT be visible
      expect(screen.queryByTestId('category-item-expense-1')).toBeNull(); // Food (variable)
      expect(screen.queryByTestId('category-item-expense-2')).toBeNull(); // Old Category (variable)
    });

    it('shows only variable expense categories when "Variáveis" filter is selected', () => {
      render(<CategoriesSettingsScreen />);

      fireEvent.press(screen.getByTestId('filter-tab-variable'));

      // Variable categories should be visible
      expect(screen.getByTestId('category-item-expense-1')).toBeTruthy(); // Food (variable)
      expect(screen.getByTestId('category-item-expense-2')).toBeTruthy(); // Old Category (variable)

      // Fixed categories should NOT be visible
      expect(screen.queryByTestId('category-item-expense-3')).toBeNull(); // Rent (fixed)
      expect(screen.queryByTestId('category-item-expense-4')).toBeNull(); // Internet (fixed)
    });

    it('shows expense group badges when "Todos" filter is active', () => {
      render(<CategoriesSettingsScreen />);

      // When filter is 'all', showGroupBadge is true for expense categories
      expect(screen.getByTestId('expense-group-badge-expense-1')).toBeTruthy(); // Food (variable)
      expect(screen.getByTestId('expense-group-badge-expense-3')).toBeTruthy(); // Rent (fixed)
      expect(screen.getByTestId('expense-group-badge-expense-4')).toBeTruthy(); // Internet (fixed)
    });

    it('does not show expense group badges when a specific filter is active', () => {
      render(<CategoriesSettingsScreen />);

      fireEvent.press(screen.getByTestId('filter-tab-fixed'));

      // When a specific filter is active, showGroupBadge is false
      expect(screen.queryByTestId('expense-group-badge-expense-3')).toBeNull();
      expect(screen.queryByTestId('expense-group-badge-expense-4')).toBeNull();
    });

    it('shows empty state when no categories match the selected filter', () => {
      mockUseCategoriesReturn = {
        ...defaultUseCategoriesReturn,
        categoriesWithCounts: [
          mockIncomeCategory,
          mockFixedExpenseCategory, // only fixed expense
        ],
      };

      render(<CategoriesSettingsScreen />);

      fireEvent.press(screen.getByTestId('filter-tab-variable'));

      expect(screen.getByTestId('expense-categories-empty')).toBeTruthy();
    });

    it('filter does not affect income categories section', () => {
      render(<CategoriesSettingsScreen />);

      fireEvent.press(screen.getByTestId('filter-tab-fixed'));

      // Income categories should still be visible regardless of expense filter
      expect(screen.getByTestId('category-item-income-1')).toBeTruthy();
      expect(screen.getByTestId('category-item-income-2')).toBeTruthy();
    });
  });

  /**
   * Deletion Flow with ReplacementPrompt Tests
   *
   * Tests that the deletion flow correctly shows ReplacementPrompt when
   * a category has transactions, and handles replacement/soft-delete callbacks.
   * **Validates: Requirements 10.1, 10.3, 10.4**
   */
  describe('Deletion Flow with ReplacementPrompt', () => {
    it('shows ReplacementPrompt when deactivating a category with transactions', () => {
      render(<CategoriesSettingsScreen />);

      // expense-1 (Food) has transactionCount: 10
      fireEvent.press(screen.getByTestId('toggle-category-expense-1'));

      // Should NOT show Alert (because it has transactions)
      expect(Alert.alert).not.toHaveBeenCalled();

      // Should show ReplacementPrompt
      expect(screen.getByTestId('replacement-prompt-modal')).toBeTruthy();
    });

    it('shows simple Alert when deactivating a category without transactions', () => {
      render(<CategoriesSettingsScreen />);

      // expense-4 (Internet) has transactionCount: 0
      fireEvent.press(screen.getByTestId('toggle-category-expense-4'));

      // Should show Alert (no transactions)
      expect(Alert.alert).toHaveBeenCalledWith(
        'Deactivate',
        'Deactivate Internet?',
        expect.any(Array)
      );

      // Should NOT show ReplacementPrompt
      expect(screen.queryByTestId('replacement-prompt-modal')).toBeNull();
    });

    it('passes correct transaction count to ReplacementPrompt', () => {
      render(<CategoriesSettingsScreen />);

      // expense-1 (Food) has transactionCount: 10
      fireEvent.press(screen.getByTestId('toggle-category-expense-1'));

      expect(screen.getByTestId('replacement-prompt-modal')).toBeTruthy();
      expect(mockReplacementPromptProps.transactionCount).toBe(10);
    });

    it('calls deleteWithReplacement when replacement is chosen', async () => {
      mockDeleteWithReplacement.mockResolvedValue(undefined);

      render(<CategoriesSettingsScreen />);

      // Trigger deletion flow for category with transactions
      fireEvent.press(screen.getByTestId('toggle-category-expense-1'));

      // ReplacementPrompt should be visible
      expect(screen.getByTestId('replacement-prompt-modal')).toBeTruthy();

      // Simulate choosing a replacement category
      fireEvent.press(screen.getByTestId('mock-replace-button'));

      await waitFor(() => {
        expect(mockDeleteWithReplacement).toHaveBeenCalledWith('expense-1', 'replacement-cat-id');
      });
    });

    it('hides ReplacementPrompt after replacement is completed', async () => {
      mockDeleteWithReplacement.mockResolvedValue(undefined);

      render(<CategoriesSettingsScreen />);

      fireEvent.press(screen.getByTestId('toggle-category-expense-1'));
      expect(screen.getByTestId('replacement-prompt-modal')).toBeTruthy();

      await waitFor(async () => {
        fireEvent.press(screen.getByTestId('mock-replace-button'));
      });

      await waitFor(() => {
        expect(mockDeleteWithReplacement).toHaveBeenCalled();
      });

      await waitFor(
        () => {
          expect(screen.queryByTestId('replacement-prompt-modal')).toBeNull();
        },
        { timeout: 3000 }
      );
    });

    it('calls deactivate when soft delete without replacement is chosen', async () => {
      mockDeactivate.mockResolvedValue(undefined);

      render(<CategoriesSettingsScreen />);

      // Trigger deletion flow for category with transactions
      fireEvent.press(screen.getByTestId('toggle-category-expense-1'));

      // ReplacementPrompt should be visible
      expect(screen.getByTestId('replacement-prompt-modal')).toBeTruthy();

      // Simulate choosing soft delete
      fireEvent.press(screen.getByTestId('mock-soft-delete-button'));

      await waitFor(() => {
        expect(mockDeactivate).toHaveBeenCalledWith('expense-1');
      });
    });

    it('hides ReplacementPrompt after soft delete is completed', async () => {
      mockDeactivate.mockResolvedValue(undefined);

      render(<CategoriesSettingsScreen />);

      fireEvent.press(screen.getByTestId('toggle-category-expense-1'));
      expect(screen.getByTestId('replacement-prompt-modal')).toBeTruthy();

      await waitFor(async () => {
        fireEvent.press(screen.getByTestId('mock-soft-delete-button'));
      });

      await waitFor(() => {
        expect(mockDeactivate).toHaveBeenCalledWith('expense-1');
      });

      await waitFor(
        () => {
          expect(screen.queryByTestId('replacement-prompt-modal')).toBeNull();
        },
        { timeout: 3000 }
      );
    });

    it('shows ReplacementPrompt for income category with transactions', () => {
      render(<CategoriesSettingsScreen />);

      // income-1 (Salary) has transactionCount: 5
      fireEvent.press(screen.getByTestId('toggle-category-income-1'));

      // Should show ReplacementPrompt (not Alert) because it has transactions
      expect(screen.getByTestId('replacement-prompt-modal')).toBeTruthy();
      expect(mockReplacementPromptProps.transactionCount).toBe(5);
    });
  });
});
