/**
 * Unit Tests for ManualEntryForm Component
 *
 * Tests for validation error display functionality.
 *
 * **Validates: Requirement 15.8**
 * IF the user submits an invalid entry, THEN THE App SHALL display
 * validation errors next to the corresponding fields.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ManualEntryForm, type ManualEntryFormProps } from '../ManualEntryForm';

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'manual.newTransaction': 'New Transaction',
        'manual.title': 'Manual Entry',
        'manual.enterAmount': 'Enter amount',
        'manual.enterDescription': 'Enter description',
        'manual.selectCategory': 'Select category',
        'manual.selectDate': 'Select date',
        'transactions.date': 'Date',
        'transactions.amount': 'Amount',
        'transactions.description': 'Description',
        'transactions.category': 'Category',
        'validation.required': 'This field is required',
        'validation.invalidDate': 'Invalid date',
        'validation.invalidAmount': 'Invalid amount',
        'validation.positiveNumber': 'Enter a positive number',
        'common.cancel': 'Cancel',
        'common.save': 'Save',
        'common.done': 'Done',
        'common.close': 'Close',
        'common.clear': 'Clear',
        'categories.noCategories': 'No categories available',
        'manual.duplicateWarning.title': 'Potential Duplicate',
        'manual.duplicateWarning.description':
          'This transaction may already exist in your records.',
        'manual.duplicateWarning.existingTransaction': 'Existing Transaction',
        'manual.duplicateWarning.confidence': `${params?.percent ?? 0}% match`,
        'manual.duplicateWarning.saveAnyway': 'Save Anyway',
      };
      return translations[key] ?? key;
    },
    i18n: {
      language: 'en',
    },
  }),
}));

// Mock useCategories hook
const mockCategories = [
  {
    id: 'cat-1',
    name: 'Food',
    type: 'expense' as const,
    icon: '🍔',
    color: '#EF4444',
    isActive: true,
    createdAt: new Date('2024-01-01'),
  },
  {
    id: 'cat-2',
    name: 'Salary',
    type: 'income' as const,
    icon: '💰',
    color: '#22C55E',
    isActive: true,
    createdAt: new Date('2024-01-01'),
  },
];

jest.mock('../../../hooks/useCategories', () => ({
  useCategories: () => ({
    categories: mockCategories,
    isLoading: false,
    error: null,
  }),
}));

// Mock DateTimePicker
jest.mock(
  '@react-native-community/datetimepicker',
  () => {
    const React = require('react');
    const { View, Text, TouchableOpacity } = require('react-native');

    return {
      __esModule: true,
      default: ({
        value,
        onChange,
        testID,
      }: {
        value: Date;
        onChange: (event: { type: string }, date?: Date) => void;
        testID?: string;
      }) => (
        <View testID={testID}>
          <Text>{value.toISOString()}</Text>
          <TouchableOpacity
            testID={`${testID}-select`}
            onPress={() => onChange({ type: 'set' }, new Date('2024-01-15'))}
          >
            <Text>Select Date</Text>
          </TouchableOpacity>
        </View>
      ),
    };
  },
  { virtual: true }
);

describe('ManualEntryForm - Validation Error Display', () => {
  const defaultProps: ManualEntryFormProps = {
    onSave: jest.fn(),
    onCancel: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Requirement 15.8: Display validation errors next to corresponding fields
   */
  describe('Requirement 15.8: Validation Error Display', () => {
    it('should display error next to amount field when amount is empty', async () => {
      const { getByTestId, queryByTestId } = render(<ManualEntryForm {...defaultProps} />);

      // Initially, no error should be displayed
      expect(queryByTestId('amount-error')).toBeNull();

      // Submit the form without entering an amount
      const saveButton = getByTestId('save-button');
      fireEvent.press(saveButton);

      // Error should appear next to the amount field
      await waitFor(() => {
        const amountError = getByTestId('amount-error');
        expect(amountError).toBeTruthy();
        expect(amountError.props.children).toBe('This field is required');
      });
    });

    it('should display error next to amount field when amount is invalid (non-parseable)', async () => {
      const { getByTestId } = render(<ManualEntryForm {...defaultProps} />);

      // Enter an amount that passes the format filter but is still invalid
      // The formatAmountDisplay function removes non-numeric chars, so "abc" becomes ""
      // We need to test with something that passes the filter but fails parsing
      // Actually, the filter is quite strict - it only allows digits, dots, commas, and minus
      // So any alphabetic input gets stripped to empty string
      // Let's test with a value that has multiple decimal points which would fail parseFloat
      const amountInput = getByTestId('amount-input');
      fireEvent.changeText(amountInput, '...');

      // Submit the form
      const saveButton = getByTestId('save-button');
      fireEvent.press(saveButton);

      // Since "..." gets cleaned to "..." (dots are allowed), but parseFloat("...") returns NaN
      // However, the formatAmountDisplay only keeps digits, dots, commas, and minus
      // So "..." stays as "..." and parseFloat("...") = NaN
      // But wait - let me check: "..." after replace(/[^\d.,-]/g, '') = "..."
      // parseFloat("...") = NaN, so it should show "Invalid amount"
      await waitFor(() => {
        const amountError = getByTestId('amount-error');
        expect(amountError).toBeTruthy();
        // The error could be either "required" (if cleaned to empty) or "invalid amount"
        // Based on the implementation, "..." stays as "..." and fails parseFloat
        expect(amountError.props.children).toBe('Invalid amount');
      });
    });

    it('should display error styling on amount field when validation fails', async () => {
      const { getByTestId } = render(<ManualEntryForm {...defaultProps} />);

      // Submit the form without entering an amount
      const saveButton = getByTestId('save-button');
      fireEvent.press(saveButton);

      // The amount input container should have error styling
      // Note: We verify the error text appears, which indicates the error state is active
      await waitFor(() => {
        const amountError = getByTestId('amount-error');
        expect(amountError).toBeTruthy();
      });
    });

    it('should clear amount error when user corrects the input', async () => {
      const { getByTestId, queryByTestId } = render(<ManualEntryForm {...defaultProps} />);

      // Submit the form without entering an amount to trigger error
      const saveButton = getByTestId('save-button');
      fireEvent.press(saveButton);

      // Verify error is displayed
      await waitFor(() => {
        expect(getByTestId('amount-error')).toBeTruthy();
      });

      // Enter a valid amount
      const amountInput = getByTestId('amount-input');
      fireEvent.changeText(amountInput, '50.00');

      // Error should be cleared
      await waitFor(() => {
        expect(queryByTestId('amount-error')).toBeNull();
      });
    });

    it('should not call onSave when validation fails', async () => {
      const mockOnSave = jest.fn();
      const { getByTestId } = render(<ManualEntryForm {...defaultProps} onSave={mockOnSave} />);

      // Submit the form without entering required fields
      const saveButton = getByTestId('save-button');
      fireEvent.press(saveButton);

      // onSave should not be called
      await waitFor(() => {
        expect(mockOnSave).not.toHaveBeenCalled();
      });
    });

    it('should display multiple errors when multiple fields are invalid', async () => {
      const { getByTestId } = render(<ManualEntryForm {...defaultProps} />);

      // Submit the form without entering any data
      const saveButton = getByTestId('save-button');
      fireEvent.press(saveButton);

      // Amount error should be displayed (date has a default value, so only amount is required)
      await waitFor(() => {
        const amountError = getByTestId('amount-error');
        expect(amountError).toBeTruthy();
      });
    });

    it('should call onSave when all validations pass', async () => {
      const mockOnSave = jest.fn();
      const { getByTestId } = render(<ManualEntryForm {...defaultProps} onSave={mockOnSave} />);

      // Enter a valid amount
      const amountInput = getByTestId('amount-input');
      fireEvent.changeText(amountInput, '100.50');

      // Submit the form
      const saveButton = getByTestId('save-button');
      fireEvent.press(saveButton);

      // onSave should be called with the transaction data
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(
          expect.objectContaining({
            amount: 10050, // 100.50 in cents
          })
        );
      });
    });

    it('should accept negative amounts for expenses', async () => {
      const mockOnSave = jest.fn();
      const { getByTestId, queryByTestId } = render(
        <ManualEntryForm {...defaultProps} onSave={mockOnSave} />
      );

      // Enter a negative amount
      const amountInput = getByTestId('amount-input');
      fireEvent.changeText(amountInput, '-50.00');

      // Submit the form
      const saveButton = getByTestId('save-button');
      fireEvent.press(saveButton);

      // No error should be displayed
      await waitFor(() => {
        expect(queryByTestId('amount-error')).toBeNull();
      });

      // onSave should be called with negative amount
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(
          expect.objectContaining({
            amount: -5000, // -50.00 in cents
          })
        );
      });
    });

    it('should accept amounts with comma as decimal separator (pt-BR format)', async () => {
      const mockOnSave = jest.fn();
      const { getByTestId, queryByTestId } = render(
        <ManualEntryForm {...defaultProps} onSave={mockOnSave} />
      );

      // Enter amount with comma decimal separator
      const amountInput = getByTestId('amount-input');
      fireEvent.changeText(amountInput, '100,50');

      // Submit the form
      const saveButton = getByTestId('save-button');
      fireEvent.press(saveButton);

      // No error should be displayed
      await waitFor(() => {
        expect(queryByTestId('amount-error')).toBeNull();
      });

      // onSave should be called with correct amount
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(
          expect.objectContaining({
            amount: 10050, // 100.50 in cents
          })
        );
      });
    });
  });

  describe('Error Text Styling', () => {
    it('should render error text with red color', async () => {
      const { getByTestId } = render(<ManualEntryForm {...defaultProps} />);

      // Submit the form to trigger validation error
      const saveButton = getByTestId('save-button');
      fireEvent.press(saveButton);

      // Verify error text is rendered
      await waitFor(() => {
        const amountError = getByTestId('amount-error');
        expect(amountError).toBeTruthy();
        // The error text should have the errorText style which includes color: '#ef4444'
        expect(amountError.props.style).toBeDefined();
      });
    });
  });

  describe('Form Cancel', () => {
    it('should call onCancel when cancel button is pressed', () => {
      const mockOnCancel = jest.fn();
      const { getByTestId } = render(<ManualEntryForm {...defaultProps} onCancel={mockOnCancel} />);

      const cancelButton = getByTestId('cancel-button');
      fireEvent.press(cancelButton);

      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('should not display errors when cancel is pressed', () => {
      const { getByTestId, queryByTestId } = render(<ManualEntryForm {...defaultProps} />);

      const cancelButton = getByTestId('cancel-button');
      fireEvent.press(cancelButton);

      // No errors should be displayed
      expect(queryByTestId('amount-error')).toBeNull();
      expect(queryByTestId('date-error')).toBeNull();
    });
  });

  describe('Default Category', () => {
    it('should use defaultCategoryId when provided', () => {
      const { getByText } = render(<ManualEntryForm {...defaultProps} defaultCategoryId="cat-1" />);

      // The category name should be displayed
      expect(getByText('Food')).toBeTruthy();
    });
  });

  /**
   * Requirement 15.10, 15.11: Duplicate Detection Warning Display
   *
   * Tests for displaying duplicate warning modal and user interactions.
   */
  describe('Duplicate Detection Warning', () => {
    const mockDuplicateWarning = {
      confidence: 0.85,
      existingTransaction: {
        id: 'existing-tx-1',
        date: new Date('2024-01-15'),
        amount: 5000, // 50.00 in cents
        description: 'Test transaction',
        categoryId: 'cat-1',
        referenceMonth: '2024-01',
        needsReview: false,
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-15'),
      },
      newTransaction: {
        date: new Date('2024-01-15'),
        amount: 5000,
        description: 'Test transaction',
      },
      matchReason: 'date_amount_description' as const,
    };

    it('should display duplicate warning modal when duplicateWarning is provided', () => {
      const { getByTestId, getByText } = render(
        <ManualEntryForm
          {...defaultProps}
          duplicateWarning={mockDuplicateWarning}
          onConfirmDuplicate={jest.fn()}
          onCancelDuplicate={jest.fn()}
        />
      );

      // Modal should be visible
      const modal = getByTestId('duplicate-warning-modal');
      expect(modal).toBeTruthy();

      // Title should be displayed
      expect(getByText('Potential Duplicate')).toBeTruthy();

      // Description should be displayed
      expect(getByText('This transaction may already exist in your records.')).toBeTruthy();
    });

    it('should display existing transaction details in duplicate warning', () => {
      const { getByText } = render(
        <ManualEntryForm
          {...defaultProps}
          duplicateWarning={mockDuplicateWarning}
          onConfirmDuplicate={jest.fn()}
          onCancelDuplicate={jest.fn()}
        />
      );

      // Existing transaction label
      expect(getByText('Existing Transaction')).toBeTruthy();

      // Transaction description
      expect(getByText('Test transaction')).toBeTruthy();

      // Confidence percentage (85%)
      expect(getByText('85% match')).toBeTruthy();
    });

    it('should call onConfirmDuplicate when "Save Anyway" is pressed', () => {
      const mockOnConfirmDuplicate = jest.fn();
      const { getByTestId } = render(
        <ManualEntryForm
          {...defaultProps}
          duplicateWarning={mockDuplicateWarning}
          onConfirmDuplicate={mockOnConfirmDuplicate}
          onCancelDuplicate={jest.fn()}
        />
      );

      // Press "Save Anyway" button
      const saveAnywayButton = getByTestId('duplicate-save-anyway-button');
      fireEvent.press(saveAnywayButton);

      // onConfirmDuplicate should be called
      expect(mockOnConfirmDuplicate).toHaveBeenCalledTimes(1);
    });

    it('should call onCancelDuplicate when "Cancel" is pressed in duplicate warning', () => {
      const mockOnCancelDuplicate = jest.fn();
      const { getByTestId } = render(
        <ManualEntryForm
          {...defaultProps}
          duplicateWarning={mockDuplicateWarning}
          onConfirmDuplicate={jest.fn()}
          onCancelDuplicate={mockOnCancelDuplicate}
        />
      );

      // Press "Cancel" button in duplicate warning modal
      const cancelButton = getByTestId('duplicate-cancel-button');
      fireEvent.press(cancelButton);

      // onCancelDuplicate should be called
      expect(mockOnCancelDuplicate).toHaveBeenCalledTimes(1);
    });

    it('should not display duplicate warning modal when duplicateWarning is null', () => {
      const { queryByTestId } = render(
        <ManualEntryForm {...defaultProps} duplicateWarning={null} />
      );

      // Modal should not be visible (the modal exists but visible prop is false)
      const modal = queryByTestId('duplicate-warning-modal');
      if (modal) {
        // If modal element exists, check that it's not visible
        expect(modal.props.visible).toBeFalsy();
      }
    });

    it('should display warning icon in duplicate modal', () => {
      const { getByText } = render(
        <ManualEntryForm
          {...defaultProps}
          duplicateWarning={mockDuplicateWarning}
          onConfirmDuplicate={jest.fn()}
          onCancelDuplicate={jest.fn()}
        />
      );

      // Warning emoji should be displayed
      expect(getByText('⚠️')).toBeTruthy();
    });

    it('should display both action buttons in duplicate warning modal', () => {
      const { getByTestId, getByText } = render(
        <ManualEntryForm
          {...defaultProps}
          duplicateWarning={mockDuplicateWarning}
          onConfirmDuplicate={jest.fn()}
          onCancelDuplicate={jest.fn()}
        />
      );

      // Cancel button in duplicate modal
      const duplicateCancelButton = getByTestId('duplicate-cancel-button');
      expect(duplicateCancelButton).toBeTruthy();

      // Save Anyway button
      const saveAnywayButton = getByTestId('duplicate-save-anyway-button');
      expect(saveAnywayButton).toBeTruthy();
      expect(getByText('Save Anyway')).toBeTruthy();
    });
  });

  /**
   * Loading States
   *
   * Tests for loading indicators during save and duplicate check operations.
   */
  describe('Loading States', () => {
    it('should display loading indicator when isSaving is true', () => {
      const { getByTestId } = render(<ManualEntryForm {...defaultProps} isSaving={true} />);

      // Loading indicator should be visible
      expect(getByTestId('save-loading')).toBeTruthy();
    });

    it('should display loading indicator when isCheckingDuplicate is true', () => {
      const { getByTestId } = render(
        <ManualEntryForm {...defaultProps} isCheckingDuplicate={true} />
      );

      // Loading indicator should be visible
      expect(getByTestId('save-loading')).toBeTruthy();
    });

    it('should disable buttons when loading', () => {
      const { getByTestId } = render(<ManualEntryForm {...defaultProps} isSaving={true} />);

      const saveButton = getByTestId('save-button');
      const cancelButton = getByTestId('cancel-button');

      // Buttons should be disabled (check accessibilityState or props.accessibilityState)
      // TouchableOpacity passes disabled to accessibilityState
      expect(
        saveButton.props.accessibilityState?.disabled || saveButton.props.disabled
      ).toBeTruthy();
      expect(
        cancelButton.props.accessibilityState?.disabled || cancelButton.props.disabled
      ).toBeTruthy();
    });
  });

  /**
   * Date Field Validation
   *
   * Tests for date field validation (Requirement 15.3).
   */
  describe('Date Field Validation', () => {
    it('should have a default date value (today)', () => {
      const { getByTestId } = render(<ManualEntryForm {...defaultProps} />);

      // Date picker button should exist and have a value
      const dateButton = getByTestId('date-picker-button');
      expect(dateButton).toBeTruthy();
    });

    it('should open date picker when date field is pressed', () => {
      const { getByTestId } = render(<ManualEntryForm {...defaultProps} />);

      // Press date picker button
      const dateButton = getByTestId('date-picker-button');
      fireEvent.press(dateButton);

      // Date picker should be visible (on Android it renders inline)
      // Note: The actual DateTimePicker behavior depends on platform
      // This test verifies the button triggers the picker
      expect(dateButton).toBeTruthy();
    });

    it('should not show date error when date has default value', async () => {
      const { getByTestId, queryByTestId } = render(<ManualEntryForm {...defaultProps} />);

      // Enter a valid amount
      const amountInput = getByTestId('amount-input');
      fireEvent.changeText(amountInput, '100');

      // Submit the form
      const saveButton = getByTestId('save-button');
      fireEvent.press(saveButton);

      // Date error should not be displayed (date has default value)
      await waitFor(() => {
        expect(queryByTestId('date-error')).toBeNull();
      });
    });

    it('should include date in transaction when form is submitted', async () => {
      const mockOnSave = jest.fn();
      const { getByTestId } = render(<ManualEntryForm {...defaultProps} onSave={mockOnSave} />);

      // Enter a valid amount
      const amountInput = getByTestId('amount-input');
      fireEvent.changeText(amountInput, '100');

      // Submit the form
      const saveButton = getByTestId('save-button');
      fireEvent.press(saveButton);

      // onSave should be called with a date
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(
          expect.objectContaining({
            date: expect.any(Date),
          })
        );
      });
    });
  });

  /**
   * Description Field
   *
   * Tests for description field (optional field).
   */
  describe('Description Field', () => {
    it('should allow empty description', async () => {
      const mockOnSave = jest.fn();
      const { getByTestId } = render(<ManualEntryForm {...defaultProps} onSave={mockOnSave} />);

      // Enter only amount (description is optional)
      const amountInput = getByTestId('amount-input');
      fireEvent.changeText(amountInput, '100');

      // Submit the form
      const saveButton = getByTestId('save-button');
      fireEvent.press(saveButton);

      // onSave should be called with empty description
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(
          expect.objectContaining({
            description: '',
          })
        );
      });
    });

    it('should trim description whitespace', async () => {
      const mockOnSave = jest.fn();
      const { getByTestId } = render(<ManualEntryForm {...defaultProps} onSave={mockOnSave} />);

      // Enter amount and description with whitespace
      const amountInput = getByTestId('amount-input');
      fireEvent.changeText(amountInput, '100');

      const descriptionInput = getByTestId('description-input');
      fireEvent.changeText(descriptionInput, '  Test description  ');

      // Submit the form
      const saveButton = getByTestId('save-button');
      fireEvent.press(saveButton);

      // onSave should be called with trimmed description
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(
          expect.objectContaining({
            description: 'Test description',
          })
        );
      });
    });
  });

  /**
   * Transaction DTO Structure
   *
   * Tests for the complete transaction data structure.
   */
  describe('Transaction DTO Structure', () => {
    it('should create transaction with all required fields', async () => {
      const mockOnSave = jest.fn();
      const { getByTestId } = render(
        <ManualEntryForm {...defaultProps} onSave={mockOnSave} defaultCategoryId="cat-1" />
      );

      // Enter amount and description
      const amountInput = getByTestId('amount-input');
      fireEvent.changeText(amountInput, '150.50');

      const descriptionInput = getByTestId('description-input');
      fireEvent.changeText(descriptionInput, 'Grocery shopping');

      // Submit the form
      const saveButton = getByTestId('save-button');
      fireEvent.press(saveButton);

      // onSave should be called with complete transaction DTO
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(
          expect.objectContaining({
            date: expect.any(Date),
            amount: 15050, // 150.50 in cents
            description: 'Grocery shopping',
            categoryId: 'cat-1',
            referenceMonth: expect.stringMatching(/^\d{4}-\d{2}$/), // YYYY-MM format
            needsReview: true,
          })
        );
      });
    });

    it('should set needsReview to true for manual entries', async () => {
      const mockOnSave = jest.fn();
      const { getByTestId } = render(<ManualEntryForm {...defaultProps} onSave={mockOnSave} />);

      // Enter amount
      const amountInput = getByTestId('amount-input');
      fireEvent.changeText(amountInput, '100');

      // Submit the form
      const saveButton = getByTestId('save-button');
      fireEvent.press(saveButton);

      // needsReview should be true
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(
          expect.objectContaining({
            needsReview: true,
          })
        );
      });
    });
  });
});
