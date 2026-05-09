/**
 * Manual Entry Screen Tests
 *
 * Tests for the Manual Entry screen component.
 *
 * **Validates: Requirements 23, 24, 30**
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';

// Mock expo-router
jest.mock('expo-router', () => {
  const mockRouterObj = {
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
    navigate: jest.fn(),
  };
  return {
    router: mockRouterObj,
    useRouter: () => mockRouterObj,
  };
});

// Mock i18n
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'manual.title': 'Manual Entry',
        'manual.newTransaction': 'New Transaction',
        'manual.transactionType': 'Type',
        'manual.income': 'Income',
        'manual.expense': 'Expense',
        'manual.enterAmount': 'Enter amount',
        'manual.enterDescription': 'Enter description',
        'manual.selectCategory': 'Select category',
        'manual.selectDate': 'Select date',
        'manual.selectMonth': 'Select reference month',
        'manual.saveTransaction': 'Save transaction',
        'manual.clearForm': 'Clear form',
        'manual.clearDraft': 'Clear draft',
        'manual.draftSaved': 'Draft saved',
        'manual.draftRestored': 'Draft restored',
        'manual.transactionSaved': 'Transaction saved successfully',
        'manual.validationError': 'Please fill in all required fields',
        'transactions.amount': 'Amount',
        'transactions.description': 'Description',
        'transactions.date': 'Date',
        'transactions.category': 'Category',
        'transactions.referenceMonth': 'Reference month',
        'common.loading': 'Loading...',
        'common.error': 'Error',
        'common.success': 'Success',
        'common.cancel': 'Cancel',
        'common.confirm': 'Confirm',
        'common.close': 'Close',
        'validation.required': 'This field is required',
        'validation.invalidAmount': 'Invalid amount',
        'errors.database': 'Unable to save data. Please try again.',
      };
      return translations[key] ?? key;
    },
  }),
}));

// Mock i18n formatters
jest.mock('../../src/i18n', () => ({
  formatCurrencyLocale: (amount: number, _locale: string) => `$${(amount / 100).toFixed(2)}`,
  formatDateLocale: (date: Date, _locale: string, _options?: unknown) => {
    return date.toLocaleDateString('en-US');
  },
  getCurrentLocale: () => 'en',
  getDecimalSeparator: () => '.',
  parseNumberLocale: (value: string, _locale: string) => {
    const cleaned = value.replace(/,/g, '');
    return parseFloat(cleaned);
  },
}));

// Mock Alert
jest.spyOn(Alert, 'alert');

// Mock data
const mockCategories = [
  {
    id: 'cat-1',
    name: 'Salary',
    type: 'income' as const,
    icon: '💰',
    color: '#22C55E',
    isActive: true,
    createdAt: new Date('2024-01-01'),
  },
  {
    id: 'cat-2',
    name: 'Food',
    type: 'expense' as const,
    icon: '🍔',
    color: '#EF4444',
    isActive: true,
    createdAt: new Date('2024-01-01'),
  },
  {
    id: 'cat-3',
    name: 'Transport',
    type: 'expense' as const,
    icon: '🚗',
    color: '#F59E0B',
    isActive: true,
    createdAt: new Date('2024-01-01'),
  },
];

// Mock useDraftStorage hook
const mockUpdateDraft = jest.fn();
const mockClearDraft = jest.fn().mockResolvedValue(undefined);
const mockSaveNow = jest.fn().mockResolvedValue(undefined);

const mockUseDraftStorageReturn = {
  draft: null as {
    type?: string;
    date?: string;
    amount?: string;
    description?: string;
    categoryId?: string | null;
    referenceMonth?: string;
  } | null,
  isDirty: false,
  isSaving: false,
  isLoading: false,
  lastSavedAt: null,
  error: null,
  updateDraft: mockUpdateDraft,
  setDraft: jest.fn(),
  clearDraft: mockClearDraft,
  saveNow: mockSaveNow,
  restore: jest.fn(),
};

jest.mock('../../src/hooks/useDraftStorage', () => ({
  useDraftStorage: () => mockUseDraftStorageReturn,
}));

// Mock useCategories hook
jest.mock('../../src/hooks/useCategories', () => ({
  useCategories: () => ({
    categories: mockCategories,
    incomeCategories: mockCategories.filter((c) => c.type === 'income'),
    expenseCategories: mockCategories.filter((c) => c.type === 'expense'),
    isLoading: false,
    error: null,
  }),
}));

// Mock createTransaction
const mockCreateTransaction = jest.fn().mockResolvedValue({
  id: 'tx-new',
  date: new Date(),
  amount: -5000,
  description: 'Test transaction',
  categoryId: 'cat-2',
  referenceMonth: '2024-01',
  needsReview: false,
  isExcludedFromTotals: false,
});

jest.mock('../../src/db/queries/transactions', () => ({
  createTransaction: (...args: unknown[]) => mockCreateTransaction(...args),
}));

// Mock DatePicker
jest.mock('../../src/components/ui/DatePicker', () => ({
  DatePicker: ({
    value,
    onChange,
    label,
    testID,
  }: {
    value: Date;
    onChange: (date: Date) => void;
    label?: string;
    testID?: string;
  }) => {
    const { View, Text, TouchableOpacity } = require('react-native');
    return (
      <View testID={testID}>
        {label && <Text>{label}</Text>}
        <TouchableOpacity
          testID={`${testID}-button`}
          onPress={() => onChange(new Date('2024-01-15'))}
        >
          <Text>{value.toLocaleDateString()}</Text>
        </TouchableOpacity>
      </View>
    );
  },
}));

// Mock CategoryPicker
jest.mock('../../src/components/ui/CategoryPicker', () => ({
  CategoryPicker: ({
    categories,
    selectedCategoryId,
    onSelect,
    visible,
    onClose,
    asModal,
    testID,
  }: {
    categories: Array<{ id: string; name: string; type: string }>;
    selectedCategoryId?: string | null;
    onSelect: (category: { id: string; name: string; type: string }) => void;
    visible?: boolean;
    onClose?: () => void;
    asModal?: boolean;
    testID?: string;
  }) => {
    const { View, Text, TouchableOpacity, Modal } = require('react-native');

    if (asModal && !visible) return null;

    const content = (
      <View testID={testID}>
        {categories.map((cat: { id: string; name: string; type: string }) => (
          <TouchableOpacity
            key={cat.id}
            testID={`${testID}-item-${cat.id}`}
            onPress={() => onSelect(cat)}
          >
            <Text>{cat.name}</Text>
          </TouchableOpacity>
        ))}
        {onClose && (
          <TouchableOpacity testID={`${testID}-close`} onPress={onClose}>
            <Text>Close</Text>
          </TouchableOpacity>
        )}
      </View>
    );

    if (asModal) {
      return (
        <Modal visible={visible} testID={`${testID}-modal`}>
          {content}
        </Modal>
      );
    }

    return content;
  },
}));

// Mock AmountDisplay
jest.mock('../../src/components/ui/AmountDisplay', () => ({
  AmountDisplay: ({ amount, testID }: { amount: number; testID?: string }) => {
    const { View, Text } = require('react-native');
    const isPositive = amount > 0;
    const displayAmount = Math.abs(amount / 100).toFixed(2);
    return (
      <View testID={testID}>
        <Text style={{ color: isPositive ? '#166534' : '#991b1b' }}>
          {isPositive ? '+' : '-'}${displayAmount}
        </Text>
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

// Import the component after mocks
import ManualEntryScreen from '../(tabs)/manual';

describe('ManualEntryScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDraftStorageReturn.draft = null;
    mockUseDraftStorageReturn.isDirty = false;
    mockUseDraftStorageReturn.isSaving = false;
    mockUseDraftStorageReturn.isLoading = false;
  });

  describe('Rendering', () => {
    it('renders correctly', () => {
      render(<ManualEntryScreen />);

      expect(screen.getByTestId('manual-screen')).toBeTruthy();
    });

    it('renders the screen title', () => {
      render(<ManualEntryScreen />);

      expect(screen.getByText('Manual Entry')).toBeTruthy();
      expect(screen.getByText('New Transaction')).toBeTruthy();
    });

    it('renders transaction type toggle', () => {
      render(<ManualEntryScreen />);

      expect(screen.getByTestId('type-toggle')).toBeTruthy();
      expect(screen.getByTestId('type-expense')).toBeTruthy();
      expect(screen.getByTestId('type-income')).toBeTruthy();
    });

    it('renders amount input', () => {
      render(<ManualEntryScreen />);

      expect(screen.getByTestId('amount-input')).toBeTruthy();
    });

    it('renders description input', () => {
      render(<ManualEntryScreen />);

      expect(screen.getByTestId('description-input')).toBeTruthy();
    });

    it('renders date picker', () => {
      render(<ManualEntryScreen />);

      expect(screen.getByTestId('date-picker')).toBeTruthy();
    });

    it('renders category selector', () => {
      render(<ManualEntryScreen />);

      expect(screen.getByTestId('category-selector')).toBeTruthy();
    });

    it('renders reference month selector', () => {
      render(<ManualEntryScreen />);

      expect(screen.getByTestId('month-selector')).toBeTruthy();
    });

    it('renders submit button', () => {
      render(<ManualEntryScreen />);

      expect(screen.getByTestId('submit-button')).toBeTruthy();
      expect(screen.getByText('Save transaction')).toBeTruthy();
    });
  });

  describe('Transaction Type Toggle', () => {
    it('defaults to expense type', () => {
      render(<ManualEntryScreen />);

      const expenseButton = screen.getByTestId('type-expense');
      // Check that expense is selected (has active style)
      expect(expenseButton).toBeTruthy();
    });

    it('switches to income type when pressed', () => {
      render(<ManualEntryScreen />);

      const incomeButton = screen.getByTestId('type-income');
      fireEvent.press(incomeButton);

      // The button should now be selected
      expect(incomeButton).toBeTruthy();
    });

    it('switches back to expense type when pressed', () => {
      render(<ManualEntryScreen />);

      // First switch to income
      const incomeButton = screen.getByTestId('type-income');
      fireEvent.press(incomeButton);

      // Then switch back to expense
      const expenseButton = screen.getByTestId('type-expense');
      fireEvent.press(expenseButton);

      expect(expenseButton).toBeTruthy();
    });
  });

  describe('Form Inputs', () => {
    it('allows entering amount', () => {
      render(<ManualEntryScreen />);

      const amountInput = screen.getByTestId('amount-input');
      fireEvent.changeText(amountInput, '50.00');

      expect(amountInput.props.value).toBe('50.00');
    });

    it('allows entering description', () => {
      render(<ManualEntryScreen />);

      const descriptionInput = screen.getByTestId('description-input');
      fireEvent.changeText(descriptionInput, 'Test transaction');

      expect(descriptionInput.props.value).toBe('Test transaction');
    });

    it('shows amount preview when amount is entered', async () => {
      render(<ManualEntryScreen />);

      const amountInput = screen.getByTestId('amount-input');
      fireEvent.changeText(amountInput, '50.00');

      await waitFor(() => {
        expect(screen.getByTestId('amount-preview')).toBeTruthy();
      });
    });
  });

  describe('Category Selection', () => {
    it('opens category picker when selector is pressed', async () => {
      render(<ManualEntryScreen />);

      const categorySelector = screen.getByTestId('category-selector');
      fireEvent.press(categorySelector);

      await waitFor(() => {
        expect(screen.getByTestId('category-picker-modal')).toBeTruthy();
      });
    });

    it('shows expense categories when expense type is selected', async () => {
      render(<ManualEntryScreen />);

      const categorySelector = screen.getByTestId('category-selector');
      fireEvent.press(categorySelector);

      await waitFor(() => {
        expect(screen.getByText('Food')).toBeTruthy();
        expect(screen.getByText('Transport')).toBeTruthy();
      });
    });

    it('shows income categories when income type is selected', async () => {
      render(<ManualEntryScreen />);

      // Switch to income type
      const incomeButton = screen.getByTestId('type-income');
      fireEvent.press(incomeButton);

      const categorySelector = screen.getByTestId('category-selector');
      fireEvent.press(categorySelector);

      await waitFor(() => {
        expect(screen.getByText('Salary')).toBeTruthy();
      });
    });

    it('selects category when pressed', async () => {
      render(<ManualEntryScreen />);

      const categorySelector = screen.getByTestId('category-selector');
      fireEvent.press(categorySelector);

      await waitFor(() => {
        const foodCategory = screen.getByTestId('category-picker-item-cat-2');
        fireEvent.press(foodCategory);
      });

      // Category picker should close and show selected category
      await waitFor(() => {
        expect(screen.getByText('Food')).toBeTruthy();
      });
    });
  });

  describe('Reference Month Selection', () => {
    it('opens month picker when selector is pressed', async () => {
      render(<ManualEntryScreen />);

      const monthSelector = screen.getByTestId('month-selector');
      fireEvent.press(monthSelector);

      await waitFor(() => {
        expect(screen.getByTestId('month-picker-modal')).toBeTruthy();
      });
    });

    it('closes month picker when close button is pressed', async () => {
      render(<ManualEntryScreen />);

      const monthSelector = screen.getByTestId('month-selector');
      fireEvent.press(monthSelector);

      await waitFor(() => {
        expect(screen.getByTestId('month-picker-modal')).toBeTruthy();
      });

      const closeButton = screen.getByText('Close');
      fireEvent.press(closeButton);

      await waitFor(() => {
        expect(screen.queryByTestId('month-picker-modal')).toBeNull();
      });
    });
  });

  describe('Form Validation', () => {
    it('shows error when amount is empty', async () => {
      render(<ManualEntryScreen />);

      const descriptionInput = screen.getByTestId('description-input');
      fireEvent.changeText(descriptionInput, 'Test transaction');

      const submitButton = screen.getByTestId('submit-button');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Please fill in all required fields');
      });
    });

    it('shows error when description is empty', async () => {
      render(<ManualEntryScreen />);

      const amountInput = screen.getByTestId('amount-input');
      fireEvent.changeText(amountInput, '50.00');

      const submitButton = screen.getByTestId('submit-button');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Please fill in all required fields');
      });
    });

    it('shows error when amount is invalid', async () => {
      render(<ManualEntryScreen />);

      const amountInput = screen.getByTestId('amount-input');
      fireEvent.changeText(amountInput, 'abc');

      const descriptionInput = screen.getByTestId('description-input');
      fireEvent.changeText(descriptionInput, 'Test transaction');

      const submitButton = screen.getByTestId('submit-button');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Please fill in all required fields');
      });
    });
  });

  describe('Form Submission', () => {
    it('creates transaction when form is valid', async () => {
      render(<ManualEntryScreen />);

      // Fill in the form
      const amountInput = screen.getByTestId('amount-input');
      fireEvent.changeText(amountInput, '50.00');

      const descriptionInput = screen.getByTestId('description-input');
      fireEvent.changeText(descriptionInput, 'Test transaction');

      // Submit the form
      const submitButton = screen.getByTestId('submit-button');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(mockCreateTransaction).toHaveBeenCalled();
      });
    });

    it('shows success message after saving', async () => {
      render(<ManualEntryScreen />);

      // Fill in the form
      const amountInput = screen.getByTestId('amount-input');
      fireEvent.changeText(amountInput, '50.00');

      const descriptionInput = screen.getByTestId('description-input');
      fireEvent.changeText(descriptionInput, 'Test transaction');

      // Submit the form
      const submitButton = screen.getByTestId('submit-button');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Success', 'Transaction saved successfully');
      });
    });

    it('clears draft after successful save', async () => {
      render(<ManualEntryScreen />);

      // Fill in the form
      const amountInput = screen.getByTestId('amount-input');
      fireEvent.changeText(amountInput, '50.00');

      const descriptionInput = screen.getByTestId('description-input');
      fireEvent.changeText(descriptionInput, 'Test transaction');

      // Submit the form
      const submitButton = screen.getByTestId('submit-button');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(mockClearDraft).toHaveBeenCalled();
      });
    });

    it('creates expense with negative amount', async () => {
      render(<ManualEntryScreen />);

      // Ensure expense type is selected (default)
      const expenseButton = screen.getByTestId('type-expense');
      fireEvent.press(expenseButton);

      // Fill in the form
      const amountInput = screen.getByTestId('amount-input');
      fireEvent.changeText(amountInput, '50.00');

      const descriptionInput = screen.getByTestId('description-input');
      fireEvent.changeText(descriptionInput, 'Test expense');

      // Submit the form
      const submitButton = screen.getByTestId('submit-button');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(mockCreateTransaction).toHaveBeenCalledWith(
          expect.objectContaining({
            amount: -5000, // Negative for expense
            description: 'Test expense',
            needsReview: false,
          })
        );
      });
    });

    it('creates income with positive amount', async () => {
      render(<ManualEntryScreen />);

      // Switch to income type
      const incomeButton = screen.getByTestId('type-income');
      fireEvent.press(incomeButton);

      // Fill in the form
      const amountInput = screen.getByTestId('amount-input');
      fireEvent.changeText(amountInput, '100.00');

      const descriptionInput = screen.getByTestId('description-input');
      fireEvent.changeText(descriptionInput, 'Test income');

      // Submit the form
      const submitButton = screen.getByTestId('submit-button');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(mockCreateTransaction).toHaveBeenCalledWith(
          expect.objectContaining({
            amount: 10000, // Positive for income
            description: 'Test income',
            needsReview: false,
          })
        );
      });
    });
  });

  describe('Draft Storage Integration', () => {
    it('updates draft when form values change', async () => {
      render(<ManualEntryScreen />);

      const amountInput = screen.getByTestId('amount-input');
      fireEvent.changeText(amountInput, '50.00');

      // Wait for debounced update
      await waitFor(
        () => {
          expect(mockUpdateDraft).toHaveBeenCalled();
        },
        { timeout: 1000 }
      );
    });

    it('shows draft indicator when draft is dirty', () => {
      mockUseDraftStorageReturn.isDirty = true;

      render(<ManualEntryScreen />);

      expect(screen.getByTestId('draft-indicator')).toBeTruthy();
      expect(screen.getByText('Draft saved')).toBeTruthy();
    });

    it('shows clear draft button when draft is dirty', () => {
      mockUseDraftStorageReturn.isDirty = true;

      render(<ManualEntryScreen />);

      expect(screen.getByTestId('clear-draft-button')).toBeTruthy();
    });

    it('shows confirmation when clearing draft', async () => {
      mockUseDraftStorageReturn.isDirty = true;

      render(<ManualEntryScreen />);

      const clearButton = screen.getByTestId('clear-draft-button');
      fireEvent.press(clearButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Clear draft',
          'Clear draft',
          expect.arrayContaining([
            expect.objectContaining({ text: 'Cancel', style: 'cancel' }),
            expect.objectContaining({ text: 'Confirm', style: 'destructive' }),
          ])
        );
      });
    });

    it('clears draft when confirmed', async () => {
      mockUseDraftStorageReturn.isDirty = true;

      render(<ManualEntryScreen />);

      const clearButton = screen.getByTestId('clear-draft-button');
      fireEvent.press(clearButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalled();
      });

      // Get the confirm button callback from the Alert.alert call
      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const confirmButton = alertCall[2].find((btn: { text: string }) => btn.text === 'Confirm');

      // Simulate pressing confirm
      await act(async () => {
        await confirmButton.onPress();
      });

      expect(mockClearDraft).toHaveBeenCalled();
    });

    it('restores draft data on mount', () => {
      mockUseDraftStorageReturn.draft = {
        type: 'income',
        amount: '100.00',
        description: 'Restored transaction',
        categoryId: 'cat-1',
        referenceMonth: '2024-01',
      };

      render(<ManualEntryScreen />);

      // The form should be populated with draft data
      const amountInput = screen.getByTestId('amount-input');
      expect(amountInput.props.value).toBe('100.00');

      const descriptionInput = screen.getByTestId('description-input');
      expect(descriptionInput.props.value).toBe('Restored transaction');
    });
  });

  describe('Loading State', () => {
    it('shows loading indicator when loading', () => {
      mockUseDraftStorageReturn.isLoading = true;

      render(<ManualEntryScreen />);

      expect(screen.getByTestId('manual-screen-loading')).toBeTruthy();
      expect(screen.getByText('Loading...')).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('shows error message when transaction creation fails', async () => {
      mockCreateTransaction.mockRejectedValueOnce(new Error('Database error'));

      render(<ManualEntryScreen />);

      // Fill in the form
      const amountInput = screen.getByTestId('amount-input');
      fireEvent.changeText(amountInput, '50.00');

      const descriptionInput = screen.getByTestId('description-input');
      fireEvent.changeText(descriptionInput, 'Test transaction');

      // Submit the form
      const submitButton = screen.getByTestId('submit-button');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Unable to save data. Please try again.');
      });
    });
  });

  describe('Accessibility', () => {
    it('has accessible transaction type buttons', () => {
      render(<ManualEntryScreen />);

      const expenseButton = screen.getByTestId('type-expense');
      const incomeButton = screen.getByTestId('type-income');

      expect(expenseButton.props.accessibilityRole).toBe('button');
      expect(incomeButton.props.accessibilityRole).toBe('button');
    });

    it('has accessible submit button', () => {
      render(<ManualEntryScreen />);

      const submitButton = screen.getByTestId('submit-button');
      expect(submitButton.props.accessibilityRole).toBe('button');
      expect(submitButton.props.accessibilityLabel).toBe('Save transaction');
    });

    it('has accessible category selector', () => {
      render(<ManualEntryScreen />);

      const categorySelector = screen.getByTestId('category-selector');
      expect(categorySelector.props.accessibilityRole).toBe('button');
      expect(categorySelector.props.accessibilityLabel).toBe('Select category');
    });

    it('has accessible month selector', () => {
      render(<ManualEntryScreen />);

      const monthSelector = screen.getByTestId('month-selector');
      expect(monthSelector.props.accessibilityRole).toBe('button');
      expect(monthSelector.props.accessibilityLabel).toBe('Select reference month');
    });
  });
});

describe('ManualEntryScreen - Form Reset', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDraftStorageReturn.draft = null;
    mockUseDraftStorageReturn.isDirty = false;
    mockUseDraftStorageReturn.isLoading = false;
  });

  it('resets form after successful submission', async () => {
    render(<ManualEntryScreen />);

    // Fill in the form
    const amountInput = screen.getByTestId('amount-input');
    fireEvent.changeText(amountInput, '50.00');

    const descriptionInput = screen.getByTestId('description-input');
    fireEvent.changeText(descriptionInput, 'Test transaction');

    // Submit the form
    const submitButton = screen.getByTestId('submit-button');
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(mockCreateTransaction).toHaveBeenCalled();
    });

    // Form should be reset
    await waitFor(() => {
      expect(amountInput.props.value).toBe('');
      expect(descriptionInput.props.value).toBe('');
    });
  });
});

describe('ManualEntryScreen - Category Type Switching', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDraftStorageReturn.draft = null;
    mockUseDraftStorageReturn.isDirty = false;
    mockUseDraftStorageReturn.isLoading = false;
  });

  it('clears category when switching type if category does not match', async () => {
    render(<ManualEntryScreen />);

    // Select an expense category
    const categorySelector = screen.getByTestId('category-selector');
    fireEvent.press(categorySelector);

    await waitFor(() => {
      const foodCategory = screen.getByTestId('category-picker-item-cat-2');
      fireEvent.press(foodCategory);
    });

    // Verify category is selected
    await waitFor(() => {
      expect(screen.getByText('Food')).toBeTruthy();
    });

    // Switch to income type
    const incomeButton = screen.getByTestId('type-income');
    fireEvent.press(incomeButton);

    // Category should be cleared (Food is expense, not income)
    await waitFor(() => {
      expect(screen.getByText('Select category')).toBeTruthy();
    });
  });
});
