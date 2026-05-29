/**
 * CategoryPicker Component Tests
 *
 * Tests for the CategoryPicker component including:
 * - Rendering categories correctly
 * - Search/filter functionality
 * - Selection handling
 * - Accessibility support
 *
 * **Validates: Requirements 30**
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { CategoryPicker, type CategoryPickerProps } from '../CategoryPicker';
import type { Category } from '../../../types/category';

describe('CategoryPicker', () => {
  const mockCategories: Category[] = [
    {
      id: 'cat-1',
      name: 'Food',
      type: 'expense',
      icon: '🍔',
      color: '#ef4444',
      isActive: true,
      expenseGroup: null,
      createdAt: new Date('2024-01-01'),
    },
    {
      id: 'cat-2',
      name: 'Transport',
      type: 'expense',
      icon: '🚗',
      color: '#3b82f6',
      isActive: true,
      expenseGroup: null,
      createdAt: new Date('2024-01-01'),
    },
    {
      id: 'cat-3',
      name: 'Salary',
      type: 'income',
      icon: '💰',
      color: '#10b981',
      isActive: true,
      expenseGroup: null,
      createdAt: new Date('2024-01-01'),
    },
    {
      id: 'cat-4',
      name: 'Inactive Category',
      type: 'expense',
      icon: '❌',
      color: '#6b7280',
      isActive: false,
      expenseGroup: null,
      createdAt: new Date('2024-01-01'),
    },
  ];

  const mockOnSelect = jest.fn();

  const defaultProps: CategoryPickerProps = {
    categories: mockCategories,
    onSelect: mockOnSelect,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all active categories', () => {
    const { getByText, queryByText } = render(<CategoryPicker {...defaultProps} />);

    expect(getByText('Food')).toBeTruthy();
    expect(getByText('Transport')).toBeTruthy();
    expect(getByText('Salary')).toBeTruthy();
    // Inactive category should not be shown by default
    expect(queryByText('Inactive Category')).toBeNull();
  });

  it('renders inactive categories when showInactive is true', () => {
    const { getByText } = render(<CategoryPicker {...defaultProps} showInactive />);

    expect(getByText('Inactive Category')).toBeTruthy();
  });

  it('renders section headers for income and expense categories', () => {
    const { getByText } = render(<CategoryPicker {...defaultProps} />);

    expect(getByText('categories.incomeCategories')).toBeTruthy();
    expect(getByText('categories.expenseCategories')).toBeTruthy();
  });

  it('filters categories by type when filterType is provided', () => {
    const { getByText, queryByText } = render(
      <CategoryPicker {...defaultProps} filterType="expense" />
    );

    expect(getByText('Food')).toBeTruthy();
    expect(getByText('Transport')).toBeTruthy();
    expect(queryByText('Salary')).toBeNull();
  });

  it('filters categories by search query', async () => {
    const { getByPlaceholderText, getByText, queryByText } = render(
      <CategoryPicker {...defaultProps} testID="picker" />
    );

    const searchInput = getByPlaceholderText('common.search');
    fireEvent.changeText(searchInput, 'Food');

    await waitFor(() => {
      expect(getByText('Food')).toBeTruthy();
      expect(queryByText('Transport')).toBeNull();
      expect(queryByText('Salary')).toBeNull();
    });
  });

  it('shows empty state when no categories match search', async () => {
    const { getByPlaceholderText, getByText } = render(<CategoryPicker {...defaultProps} />);

    const searchInput = getByPlaceholderText('common.search');
    fireEvent.changeText(searchInput, 'NonExistent');

    await waitFor(() => {
      expect(getByText('categories.noCategories')).toBeTruthy();
    });
  });

  it('clears search when clear button is pressed', async () => {
    const { getByPlaceholderText, getByText, getByLabelText } = render(
      <CategoryPicker {...defaultProps} />
    );

    const searchInput = getByPlaceholderText('common.search');
    fireEvent.changeText(searchInput, 'Food');

    await waitFor(() => {
      expect(getByText('Food')).toBeTruthy();
    });

    const clearButton = getByLabelText('common.clear');
    fireEvent.press(clearButton);

    await waitFor(() => {
      expect(getByText('Transport')).toBeTruthy();
      expect(getByText('Salary')).toBeTruthy();
    });
  });

  it('calls onSelect when a category is pressed', () => {
    const { getByText } = render(<CategoryPicker {...defaultProps} />);

    fireEvent.press(getByText('Food'));

    expect(mockOnSelect).toHaveBeenCalledWith(mockCategories[0]);
  });

  it('shows checkmark for selected category', () => {
    const { getByText } = render(<CategoryPicker {...defaultProps} selectedCategoryId="cat-1" />);

    // The selected category should have a checkmark
    expect(getByText('✓')).toBeTruthy();
  });

  it('renders as modal when asModal is true', () => {
    const { getByText, getByTestId } = render(
      <CategoryPicker {...defaultProps} asModal visible onClose={() => {}} testID="picker" />
    );

    expect(getByTestId('picker-modal')).toBeTruthy();
    expect(getByText('manual.selectCategory')).toBeTruthy();
  });

  it('calls onClose when close button is pressed in modal', () => {
    const onClose = jest.fn();
    const { getByLabelText } = render(
      <CategoryPicker {...defaultProps} asModal visible onClose={onClose} />
    );

    fireEvent.press(getByLabelText('common.close'));

    expect(onClose).toHaveBeenCalled();
  });

  it('returns null when not visible and not in modal mode', () => {
    const { toJSON } = render(<CategoryPicker {...defaultProps} visible={false} />);

    expect(toJSON()).toBeNull();
  });

  it('has correct accessibility state for selected category', () => {
    const { getByLabelText } = render(
      <CategoryPicker {...defaultProps} selectedCategoryId="cat-1" />
    );

    const selectedCategory = getByLabelText(/Food.*manual\.expense/);
    expect(selectedCategory.props.accessibilityState.selected).toBe(true);
  });

  it('renders category icons', () => {
    const { getByText } = render(<CategoryPicker {...defaultProps} />);

    expect(getByText('🍔')).toBeTruthy();
    expect(getByText('🚗')).toBeTruthy();
    expect(getByText('💰')).toBeTruthy();
  });

  it('uses custom search placeholder', () => {
    const { getByPlaceholderText } = render(
      <CategoryPicker {...defaultProps} searchPlaceholder="Find category..." />
    );

    expect(getByPlaceholderText('Find category...')).toBeTruthy();
  });
});
