/**
 * Transaction Detail Screen - Category Editing Tests
 *
 * Tests for the category editing functionality on the Detail Screen:
 * - Bottom sheet opens with pre-selected category
 * - Installment group prompt appears for group transactions
 * - Error handling retains previous category
 * - Successful update closes the bottom sheet
 *
 * **Validates: Requirements 3.1, 3.4, 3.6**
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';

// Mock expo-router
let mockSearchParamsId = 'tx-1';
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
    navigate: jest.fn(),
  },
  useLocalSearchParams: () => ({ id: mockSearchParamsId }),
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
    navigate: jest.fn(),
  }),
}));

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'common.close': 'Close',
        'common.edit': 'Edit',
        'common.delete': 'Delete',
        'common.cancel': 'Cancel',
        'common.error': 'Error',
        'common.loading': 'Loading...',
        'common.save': 'Save',
        'common.success': 'Success',
        'common.ok': 'OK',
        'transactions.editTransaction': 'Edit Transaction',
        'transactions.deleteTransaction': 'Delete Transaction',
        'transactions.deleteConfirmation': 'Are you sure?',
        'transactions.amount': 'Amount',
        'transactions.date': 'Date',
        'transactions.description': 'Description',
        'transactions.category': 'Category',
        'transactions.referenceMonth': 'Reference Month',
        'transactions.excludeFromTotals': 'Exclude from totals',
        'transactions.excluded': 'Excluded',
        'transactions.included': 'Included',
        'dashboard.income': 'Income',
        'dashboard.expenses': 'Expenses',
        'errors.notFound': 'Not found',
        'errors.generic': 'An error occurred',
        'categoryEdit.changeCategory': 'Change Category',
        'categoryEdit.selectNewCategory': 'Select a new category',
        'categoryEdit.installmentPrompt': 'Apply to this parcel or all parcels?',
        'categoryEdit.applyToThisParcel': 'This parcel only',
        'categoryEdit.applyToAllParcels': 'All parcels',
        'categoryEdit.updateError': 'Failed to update category',
      };
      return translations[key] ?? key;
    },
  }),
}));

// Mock i18n formatters
jest.mock('../../src/i18n', () => ({
  formatCurrencyLocale: (amount: number, _locale: string) => `R$${amount.toFixed(2)}`,
  formatDateLocale: (_date: Date, _locale: string, _options?: unknown) => '15/01/2024',
  getCurrentLocale: () => 'pt-BR',
  getMonthName: (monthIndex: number, _locale: string, _style: string) => {
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
    ];
    return months[monthIndex] ?? 'Unknown';
  },
}));

// Mock useThemeColors
jest.mock('../../src/hooks/useThemeColors', () => ({
  useThemeColors: () => ({
    background: { primary: '#FFFFFF', secondary: '#F5F5F7', tertiary: '#EBEBF0' },
    text: { primary: '#1C1C1E', secondary: '#6B7280', tertiary: '#9CA3AF', inverse: '#FFFFFF' },
    border: { default: '#E5E7EB', subtle: '#F3F4F6', strong: '#D1D5DB' },
    semantic: {
      primary: { light: '#EFF6FF', base: '#3B82F6', dark: '#1D4ED8' },
      success: { light: '#F0FDF4', base: '#22C55E', dark: '#15803D' },
      danger: { light: '#FEF2F2', base: '#EF4444', dark: '#B91C1C' },
      warning: { light: '#FFFBEB', base: '#F59E0B', dark: '#B45309' },
    },
    surface: { card: '#FFFFFF', elevated: '#FFFFFF', overlay: 'rgba(0,0,0,0.5)' },
    interactive: { primary: '#3B82F6', primaryPressed: '#2563EB', disabled: '#9CA3AF' },
  }),
}));

// Mock useThemeStore
jest.mock('../../src/stores/themeStore', () => ({
  useThemeStore: (selector: (state: unknown) => unknown) => {
    const state = { resolvedScheme: 'light', preference: 'light' };
    if (typeof selector === 'function') return selector(state);
    return state;
  },
}));

// Mock theme constants
jest.mock('../../src/constants/theme', () => ({
  spacing: { xs: 4, sm: 8, md: 12, base: 16, lg: 20, xl: 24, '2xl': 32 },
  borderRadius: { sm: 4, md: 8, lg: 12, xl: 16 },
  typography: {
    title: { fontSize: 22 },
    body: { fontSize: 16 },
    caption: { fontSize: 13 },
    overline: { fontSize: 11 },
  },
  shadows: {
    light: { sm: {}, md: {}, lg: {} },
    dark: { sm: {}, md: {}, lg: {} },
  },
}));

// Mock transaction data
const mockTransaction = {
  id: 'tx-1',
  title: 'Grocery Shopping',
  date: new Date('2024-01-15'),
  amount: -5000,
  description: 'Grocery Shopping',
  categoryId: 'cat-food',
  originId: null,
  batchId: null,
  referenceMonth: '2024-01',
  needsReview: false,
  isExcludedFromTotals: false,
  duplicateOf: null,
  installmentGroupId: null,
  recurringId: null,
  createdAt: new Date('2024-01-15'),
  updatedAt: new Date('2024-01-15'),
  category: {
    id: 'cat-food',
    name: 'Food',
    type: 'expense' as const,
    icon: '🍔',
    color: '#EF4444',
    isActive: true,
    expenseGroup: 'variable' as const,
    createdAt: new Date('2024-01-01'),
  },
};

const mockInstallmentTransaction = {
  ...mockTransaction,
  id: 'tx-installment-1',
  installmentGroupId: 'group-1',
  description: 'Installment Payment 1/3',
};

// Mock useTransactions
const mockUpdate = jest.fn().mockResolvedValue(null);
const mockRemove = jest.fn().mockResolvedValue(undefined);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mockCurrentTransaction: any = mockTransaction;

jest.mock('../../src/hooks/useTransactions', () => ({
  useTransactions: () => ({
    transactions: [mockCurrentTransaction],
    isLoading: false,
    error: null,
    remove: mockRemove,
    update: mockUpdate,
  }),
}));

// Mock setTransactionCategory
const mockSetTransactionCategory = jest.fn().mockResolvedValue(undefined);
jest.mock('../../src/db/queries/transactions', () => ({
  setTransactionCategory: (...args: unknown[]) => mockSetTransactionCategory(...args),
}));

// Mock InstallmentGroupManager
const mockUpdateGroupField = jest.fn().mockResolvedValue(undefined);
jest.mock('../../src/services/installment/InstallmentGroupManager', () => ({
  deleteAllInGroup: jest.fn().mockResolvedValue(undefined),
  deleteSingleParcel: jest.fn().mockResolvedValue(undefined),
  recalculateGroup: jest.fn().mockResolvedValue(undefined),
  updateGroupField: (...args: unknown[]) => mockUpdateGroupField(...args),
}));

// Mock RecurringTransactionService
jest.mock('../../src/services/recurring/RecurringTransactionService', () => ({
  updateRecurringAmount: jest.fn().mockResolvedValue(undefined),
}));

// Track CategorySelector props
let lastCategorySelectorProps: Record<string, unknown> = {};

// Mock CategorySelector - captures props for assertions
jest.mock('../../src/components/CategorySelector', () => ({
  CategorySelector: (props: {
    selectedCategoryId?: string | null;
    onSelect: (category: unknown) => void;
    includeIncome?: boolean;
    testID?: string;
  }) => {
    const { View, Text, TouchableOpacity } = require('react-native');
    lastCategorySelectorProps = props;
    return (
      <View testID={props.testID}>
        <Text testID={`${props.testID}-selected`}>
          {props.selectedCategoryId ?? 'none'}
        </Text>
        <TouchableOpacity
          testID={`${props.testID}-select-transport`}
          onPress={() =>
            props.onSelect({
              id: 'cat-transport',
              name: 'Transport',
              type: 'expense',
              icon: '🚗',
              color: '#F59E0B',
              isActive: true,
              expenseGroup: 'variable',
              createdAt: new Date(),
            })
          }
        >
          <Text>Transport</Text>
        </TouchableOpacity>
      </View>
    );
  },
}));

// Mock LoadingIndicator
jest.mock('../../src/components/ui/LoadingIndicator', () => ({
  LoadingIndicator: ({ message, testID }: { message?: string; testID?: string }) => {
    const { View, Text } = require('react-native');
    return (
      <View testID={testID}>
        <Text>{message ?? 'Loading...'}</Text>
      </View>
    );
  },
}));

// Mock EmptyState
jest.mock('../../src/components/ui/EmptyState', () => ({
  EmptyState: ({ title, testID }: { title: string; testID?: string }) => {
    const { View, Text } = require('react-native');
    return (
      <View testID={testID}>
        <Text>{title}</Text>
      </View>
    );
  },
}));

// Mock InputPromptDialog
jest.mock('../../src/components/ui/InputPromptDialog', () => ({
  InputPromptDialog: ({ visible, testID }: { visible: boolean; testID?: string }) => {
    const { View } = require('react-native');
    if (!visible) return null;
    return <View testID={testID} />;
  },
}));

// Spy on Alert
jest.spyOn(Alert, 'alert');

// Import the component after all mocks
import TransactionDetailScreen from '../transaction/[id]';

describe('TransactionDetailScreen - Category Editing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCurrentTransaction = mockTransaction;
    mockSearchParamsId = 'tx-1';
    lastCategorySelectorProps = {};
  });

  /**
   * **Validates: Requirement 3.1**
   * Tapping the category row opens the bottom sheet modal
   */
  describe('Opening category bottom sheet', () => {
    it('opens the bottom sheet when category row is tapped', () => {
      render(<TransactionDetailScreen />);

      // The category row should be tappable
      const categoryTouchable = screen.getByTestId('detail-category-touchable');
      fireEvent.press(categoryTouchable);

      // The modal should now be visible (CategorySelector is rendered)
      expect(screen.getByTestId('category-edit-selector')).toBeTruthy();
    });

    it('displays the CategorySelector with current category pre-selected', () => {
      render(<TransactionDetailScreen />);

      // Open the bottom sheet
      const categoryTouchable = screen.getByTestId('detail-category-touchable');
      fireEvent.press(categoryTouchable);

      // The CategorySelector should receive the current categoryId as selectedCategoryId
      expect(lastCategorySelectorProps.selectedCategoryId).toBe('cat-food');
    });

    it('displays the change category title in the bottom sheet', () => {
      render(<TransactionDetailScreen />);

      const categoryTouchable = screen.getByTestId('detail-category-touchable');
      fireEvent.press(categoryTouchable);

      expect(screen.getByText('Change Category')).toBeTruthy();
    });
  });

  /**
   * **Validates: Requirement 3.6**
   * For installment group transactions, selecting a new category shows scope options
   */
  describe('Installment group category change', () => {
    beforeEach(() => {
      mockCurrentTransaction = mockInstallmentTransaction;
      mockSearchParamsId = 'tx-installment-1';
    });

    afterEach(() => {
      mockSearchParamsId = 'tx-1';
    });

    it('shows scope Alert when selecting a category for installment group transaction', async () => {
      render(<TransactionDetailScreen />);

      // Open the bottom sheet
      const categoryTouchable = screen.getByTestId('detail-category-touchable');
      fireEvent.press(categoryTouchable);

      // Select a new category
      const selectButton = screen.getByTestId('category-edit-selector-select-transport');
      fireEvent.press(selectButton);

      // Should show Alert with scope options
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Change Category',
          'Apply to this parcel or all parcels?',
          expect.arrayContaining([
            expect.objectContaining({ text: 'Cancel', style: 'cancel' }),
            expect.objectContaining({ text: 'This parcel only' }),
            expect.objectContaining({ text: 'All parcels' }),
          ])
        );
      });
    });

    it('calls setTransactionCategory for "this parcel only" option', async () => {
      render(<TransactionDetailScreen />);

      // Open the bottom sheet
      const categoryTouchable = screen.getByTestId('detail-category-touchable');
      fireEvent.press(categoryTouchable);

      // Select a new category
      const selectButton = screen.getByTestId('category-edit-selector-select-transport');
      fireEvent.press(selectButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalled();
      });

      // Get the "This parcel only" button callback
      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const thisParcelButton = alertCall[2].find(
        (btn: { text: string }) => btn.text === 'This parcel only'
      );

      await act(async () => {
        await thisParcelButton.onPress();
      });

      expect(mockSetTransactionCategory).toHaveBeenCalledWith('tx-installment-1', 'cat-transport');
    });

    it('calls updateGroupField for "all parcels" option', async () => {
      render(<TransactionDetailScreen />);

      // Open the bottom sheet
      const categoryTouchable = screen.getByTestId('detail-category-touchable');
      fireEvent.press(categoryTouchable);

      // Select a new category
      const selectButton = screen.getByTestId('category-edit-selector-select-transport');
      fireEvent.press(selectButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalled();
      });

      // Get the "All parcels" button callback
      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const allParcelsButton = alertCall[2].find(
        (btn: { text: string }) => btn.text === 'All parcels'
      );

      await act(async () => {
        await allParcelsButton.onPress();
      });

      expect(mockUpdateGroupField).toHaveBeenCalledWith('group-1', 'categoryId', 'cat-transport');
    });
  });

  /**
   * **Validates: Requirement 3.4**
   * When category update fails, error Alert is shown and previous category is retained
   */
  describe('Error handling', () => {
    it('shows error Alert when category update fails for non-installment transaction', async () => {
      mockSetTransactionCategory.mockRejectedValueOnce(new Error('DB error'));

      render(<TransactionDetailScreen />);

      // Open the bottom sheet
      const categoryTouchable = screen.getByTestId('detail-category-touchable');
      fireEvent.press(categoryTouchable);

      // Select a new category (non-installment transaction)
      const selectButton = screen.getByTestId('category-edit-selector-select-transport');
      fireEvent.press(selectButton);

      // Wait for the error Alert to appear
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to update category');
      });
    });

    it('retains previous category value after failed update', async () => {
      mockSetTransactionCategory.mockRejectedValueOnce(new Error('DB error'));

      render(<TransactionDetailScreen />);

      // Open the bottom sheet
      const categoryTouchable = screen.getByTestId('detail-category-touchable');
      fireEvent.press(categoryTouchable);

      // Select a new category
      const selectButton = screen.getByTestId('category-edit-selector-select-transport');
      fireEvent.press(selectButton);

      // Wait for error to be handled
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to update category');
      });

      // The category display should still show the original category name
      // (the transaction data hasn't changed since the update failed)
      expect(screen.getByText('Food')).toBeTruthy();
    });

    it('shows error Alert when installment group category update fails', async () => {
      mockCurrentTransaction = mockInstallmentTransaction;
      mockSearchParamsId = 'tx-installment-1';
      mockSetTransactionCategory.mockRejectedValueOnce(new Error('DB error'));

      render(<TransactionDetailScreen />);

      // Open the bottom sheet
      const categoryTouchable = screen.getByTestId('detail-category-touchable');
      fireEvent.press(categoryTouchable);

      // Select a new category
      const selectButton = screen.getByTestId('category-edit-selector-select-transport');
      fireEvent.press(selectButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalled();
      });

      // Get the "This parcel only" button callback and trigger it
      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const thisParcelButton = alertCall[2].find(
        (btn: { text: string }) => btn.text === 'This parcel only'
      );

      await act(async () => {
        await thisParcelButton.onPress();
      });

      // Should show error alert
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to update category');
    });
  });

  /**
   * **Validates: Requirement 3.1 (success path)**
   * When category update succeeds, the bottom sheet closes
   */
  describe('Successful category update', () => {
    it('closes the bottom sheet after successful category update', async () => {
      mockSetTransactionCategory.mockResolvedValueOnce(undefined);

      render(<TransactionDetailScreen />);

      // Open the bottom sheet
      const categoryTouchable = screen.getByTestId('detail-category-touchable');
      fireEvent.press(categoryTouchable);

      // Verify modal is open (CategorySelector is visible)
      expect(screen.getByTestId('category-edit-selector')).toBeTruthy();

      // Select a new category (non-installment)
      const selectButton = screen.getByTestId('category-edit-selector-select-transport');
      fireEvent.press(selectButton);

      // After successful update, the modal should close (CategorySelector no longer visible)
      await waitFor(() => {
        expect(screen.queryByTestId('category-edit-selector')).toBeNull();
      });
    });

    it('does not show error Alert on successful update', async () => {
      mockSetTransactionCategory.mockResolvedValueOnce(undefined);

      render(<TransactionDetailScreen />);

      // Open the bottom sheet
      const categoryTouchable = screen.getByTestId('detail-category-touchable');
      fireEvent.press(categoryTouchable);

      // Select a new category
      const selectButton = screen.getByTestId('category-edit-selector-select-transport');
      fireEvent.press(selectButton);

      // Wait for the async operation to complete
      await waitFor(() => {
        expect(mockSetTransactionCategory).toHaveBeenCalled();
      });

      // No error alert should have been shown
      expect(Alert.alert).not.toHaveBeenCalled();
    });

    it('does nothing when selecting the same category', () => {
      render(<TransactionDetailScreen />);

      // Open the bottom sheet
      const categoryTouchable = screen.getByTestId('detail-category-touchable');
      fireEvent.press(categoryTouchable);

      // Simulate selecting the same category that's already set
      const onSelect = lastCategorySelectorProps.onSelect as (category: unknown) => void;
      act(() => {
        onSelect({
          id: 'cat-food', // Same as current
          name: 'Food',
          type: 'expense',
          icon: '🍔',
          color: '#EF4444',
          isActive: true,
          expenseGroup: 'variable',
          createdAt: new Date(),
        });
      });

      // Should not call setTransactionCategory
      expect(mockSetTransactionCategory).not.toHaveBeenCalled();

      // Modal should close (CategorySelector no longer visible)
      expect(screen.queryByTestId('category-edit-selector')).toBeNull();
    });
  });
});
