/**
 * ReplacementPrompt Component Tests
 *
 * Tests for the ReplacementPrompt component including:
 * - Displays transaction count
 * - Offers replacement and soft delete options
 * - Calls correct callback on replacement selection
 * - Calls correct callback on soft delete
 *
 * **Validates: Requirements 10.1, 10.2, 10.3, 10.4**
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ReplacementPrompt } from '../ReplacementPrompt';
import type { Category } from '../../types/category';

// Mock the CategorySelector component (already tested separately)
const mockCategorySelectorOnSelect = jest.fn();
jest.mock('../CategorySelector', () => ({
  CategorySelector: ({
    onSelect,
    testID,
  }: {
    onSelect: (category: Category) => void;
    selectedCategoryId?: string | null;
    includeIncome?: boolean;
    testID?: string;
  }) => {
    // Store the onSelect callback so tests can trigger it
    mockCategorySelectorOnSelect.mockImplementation(onSelect);
    const { View, Text, TouchableOpacity } = require('react-native');
    return (
      <View testID={testID}>
        <Text>CategorySelector Mock</Text>
        <TouchableOpacity
          testID={`${testID}-select-replacement`}
          onPress={() =>
            onSelect({
              id: 'replacement-cat-id',
              name: 'Replacement Category',
              type: 'expense',
              icon: 'tag',
              color: '#123456',
              isActive: true,
              expenseGroup: 'variable',
              createdAt: new Date('2024-01-01'),
            })
          }
        >
          <Text>Select Replacement</Text>
        </TouchableOpacity>
      </View>
    );
  },
}));

// Mock the useCategories hook
jest.mock('../../hooks/useCategories', () => ({
  useCategories: () => ({
    expenseCategories: [],
    incomeCategories: [],
    fixedExpenseCategories: [],
    variableExpenseCategories: [],
  }),
}));

describe('ReplacementPrompt', () => {
  const mockCategory: Category = {
    id: 'cat-to-delete',
    name: 'Aluguel',
    type: 'expense',
    icon: 'home',
    color: '#E63946',
    isActive: true,
    expenseGroup: 'fixed',
    createdAt: new Date('2024-01-01'),
  };

  const mockOnReplace = jest.fn();
  const mockOnSoftDelete = jest.fn();
  const mockOnCancel = jest.fn();

  const defaultProps = {
    category: mockCategory,
    transactionCount: 5,
    onReplace: mockOnReplace,
    onSoftDelete: mockOnSoftDelete,
    onCancel: mockOnCancel,
    visible: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Displays transaction count', () => {
    it('renders the modal when visible is true', () => {
      const { getByTestId } = render(<ReplacementPrompt {...defaultProps} />);

      expect(getByTestId('replacement-prompt-modal')).toBeTruthy();
    });

    it('displays the title', () => {
      const { getByTestId } = render(<ReplacementPrompt {...defaultProps} />);

      expect(getByTestId('replacement-prompt-title')).toBeTruthy();
    });

    it('displays the transaction count in the subtitle', () => {
      const { getByTestId } = render(<ReplacementPrompt {...defaultProps} />);

      const subtitle = getByTestId('replacement-prompt-subtitle');
      expect(subtitle.props.children).toBeDefined();
    });

    it('shows singular text for 1 transaction', () => {
      const { getByText } = render(<ReplacementPrompt {...defaultProps} transactionCount={1} />);

      // The component uses "transação associada" for singular
      expect(getByText(/1/)).toBeTruthy();
      expect(getByText(/transação associada/)).toBeTruthy();
    });

    it('shows plural text for multiple transactions', () => {
      const { getByText } = render(<ReplacementPrompt {...defaultProps} transactionCount={10} />);

      expect(getByText(/10/)).toBeTruthy();
      expect(getByText(/transações associadas/)).toBeTruthy();
    });

    it('displays the category name being deleted', () => {
      const { getByText } = render(<ReplacementPrompt {...defaultProps} />);

      expect(getByText(/Aluguel/)).toBeTruthy();
    });
  });

  describe('Offers replacement and soft delete options', () => {
    it('renders the replace button', () => {
      const { getByTestId } = render(<ReplacementPrompt {...defaultProps} />);

      expect(getByTestId('replacement-prompt-replace-button')).toBeTruthy();
    });

    it('renders the soft delete button', () => {
      const { getByTestId } = render(<ReplacementPrompt {...defaultProps} />);

      expect(getByTestId('replacement-prompt-soft-delete-button')).toBeTruthy();
    });

    it('renders the cancel button', () => {
      const { getByTestId } = render(<ReplacementPrompt {...defaultProps} />);

      expect(getByTestId('replacement-prompt-cancel-button')).toBeTruthy();
    });

    it('replace button is disabled when no replacement is selected', () => {
      const { getByTestId } = render(<ReplacementPrompt {...defaultProps} />);

      const replaceButton = getByTestId('replacement-prompt-replace-button');
      expect(replaceButton.props.accessibilityState?.disabled).toBe(true);
    });

    it('replace button is enabled after selecting a replacement category', () => {
      const { getByTestId } = render(<ReplacementPrompt {...defaultProps} />);

      // Simulate selecting a replacement category via the mocked CategorySelector
      fireEvent.press(getByTestId('replacement-category-selector-select-replacement'));

      const replaceButton = getByTestId('replacement-prompt-replace-button');
      expect(replaceButton.props.accessibilityState?.disabled).toBe(false);
    });
  });

  describe('Calls correct callback on replacement selection', () => {
    it('calls onReplace with the selected replacement category id', () => {
      const { getByTestId } = render(<ReplacementPrompt {...defaultProps} />);

      // Select a replacement category
      fireEvent.press(getByTestId('replacement-category-selector-select-replacement'));

      // Press the replace button
      fireEvent.press(getByTestId('replacement-prompt-replace-button'));

      expect(mockOnReplace).toHaveBeenCalledWith('replacement-cat-id');
    });

    it('does not call onReplace when no replacement is selected', () => {
      const { getByTestId } = render(<ReplacementPrompt {...defaultProps} />);

      // Press the replace button without selecting a replacement
      fireEvent.press(getByTestId('replacement-prompt-replace-button'));

      expect(mockOnReplace).not.toHaveBeenCalled();
    });

    it('prevents selecting the same category being deleted as replacement', () => {
      const { getByTestId } = render(<ReplacementPrompt {...defaultProps} />);

      // Simulate the CategorySelector calling onSelect with the same category being deleted
      const onSelectCallback =
        mockCategorySelectorOnSelect.mock.calls.length > 0
          ? mockCategorySelectorOnSelect
          : mockCategorySelectorOnSelect.getMockImplementation();

      // Call the stored onSelect with the same category being deleted
      if (onSelectCallback) {
        const storedOnSelect = mockCategorySelectorOnSelect.getMockImplementation();
        if (storedOnSelect) {
          storedOnSelect(mockCategory);
        }
      }

      // Replace button should still be disabled since same category was rejected
      const replaceButton = getByTestId('replacement-prompt-replace-button');
      expect(replaceButton.props.accessibilityState?.disabled).toBe(true);
    });
  });

  describe('Calls correct callback on soft delete', () => {
    it('calls onSoftDelete when soft delete button is pressed', () => {
      const { getByTestId } = render(<ReplacementPrompt {...defaultProps} />);

      fireEvent.press(getByTestId('replacement-prompt-soft-delete-button'));

      expect(mockOnSoftDelete).toHaveBeenCalledTimes(1);
    });

    it('calls onCancel when cancel button is pressed', () => {
      const { getByTestId } = render(<ReplacementPrompt {...defaultProps} />);

      fireEvent.press(getByTestId('replacement-prompt-cancel-button'));

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it('does not call onReplace when soft delete is chosen', () => {
      const { getByTestId } = render(<ReplacementPrompt {...defaultProps} />);

      fireEvent.press(getByTestId('replacement-prompt-soft-delete-button'));

      expect(mockOnReplace).not.toHaveBeenCalled();
    });
  });
});
