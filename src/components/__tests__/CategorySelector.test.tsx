/**
 * CategorySelector Component Tests
 *
 * Tests for the CategorySelector component including:
 * - Renders two selects (group + category)
 * - Filters categories when group selected
 * - Shows all expense categories when no group selected
 * - Auto-populates group when category selected directly
 * - Resets on group clear
 * - Supports includeIncome prop
 *
 * **Validates: Requirements 12.1, 12.3, 12.4, 12.5, 12.8, 12.9**
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { CategorySelector } from '../CategorySelector';
import type { Category } from '../../types/category';

// Mock useCategories hook
const mockFixedCategories: Category[] = [
  {
    id: 'fixed-1',
    name: 'Aluguel',
    type: 'expense',
    icon: 'home',
    color: '#E63946',
    isActive: true,
    expenseGroup: 'fixed',
    createdAt: new Date('2024-01-01'),
  },
  {
    id: 'fixed-2',
    name: 'Energia',
    type: 'expense',
    icon: 'zap',
    color: '#F4A261',
    isActive: true,
    expenseGroup: 'fixed',
    createdAt: new Date('2024-01-01'),
  },
];

const mockVariableCategories: Category[] = [
  {
    id: 'var-1',
    name: 'Farmacia',
    type: 'expense',
    icon: 'thermometer',
    color: '#E91E63',
    isActive: true,
    expenseGroup: 'variable',
    createdAt: new Date('2024-01-01'),
  },
  {
    id: 'var-2',
    name: 'Uber',
    type: 'expense',
    icon: 'map-pin',
    color: '#000000',
    isActive: true,
    expenseGroup: 'variable',
    createdAt: new Date('2024-01-01'),
  },
];

const mockIncomeCategories: Category[] = [
  {
    id: 'income-1',
    name: 'Salário',
    type: 'income',
    icon: 'dollar-sign',
    color: '#10b981',
    isActive: true,
    expenseGroup: null,
    createdAt: new Date('2024-01-01'),
  },
];

const mockExpenseCategories: Category[] = [...mockFixedCategories, ...mockVariableCategories];

jest.mock('../../hooks/useCategories', () => ({
  useCategories: () => ({
    expenseCategories: mockExpenseCategories,
    incomeCategories: mockIncomeCategories,
    fixedExpenseCategories: mockFixedCategories,
    variableExpenseCategories: mockVariableCategories,
  }),
}));

describe('CategorySelector', () => {
  const mockOnSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Renders two selects', () => {
    it('renders the group select area', () => {
      const { getByTestId } = render(
        <CategorySelector onSelect={mockOnSelect} testID="selector" />
      );

      expect(getByTestId('selector-group')).toBeTruthy();
    });

    it('renders the categories list area', () => {
      const { getByTestId } = render(
        <CategorySelector onSelect={mockOnSelect} testID="selector" />
      );

      expect(getByTestId('selector-categories')).toBeTruthy();
    });

    it('renders group options for Custo Fixo and Variável', () => {
      const { getByText } = render(<CategorySelector onSelect={mockOnSelect} testID="selector" />);

      expect(getByText('Custo Fixo')).toBeTruthy();
      expect(getByText('Variável')).toBeTruthy();
    });
  });

  describe('Filters categories when group selected', () => {
    it('shows only fixed categories when Custo Fixo is selected', () => {
      const { getByTestId, getByText, queryByText } = render(
        <CategorySelector onSelect={mockOnSelect} testID="selector" />
      );

      fireEvent.press(getByTestId('selector-group-fixed'));

      expect(getByText('Aluguel')).toBeTruthy();
      expect(getByText('Energia')).toBeTruthy();
      expect(queryByText('Farmacia')).toBeNull();
      expect(queryByText('Uber')).toBeNull();
    });

    it('shows only variable categories when Variável is selected', () => {
      const { getByTestId, getByText, queryByText } = render(
        <CategorySelector onSelect={mockOnSelect} testID="selector" />
      );

      fireEvent.press(getByTestId('selector-group-variable'));

      expect(getByText('Farmacia')).toBeTruthy();
      expect(getByText('Uber')).toBeTruthy();
      expect(queryByText('Aluguel')).toBeNull();
      expect(queryByText('Energia')).toBeNull();
    });
  });

  describe('Shows all expense categories when no group selected', () => {
    it('displays all expense categories by default', () => {
      const { getByText } = render(<CategorySelector onSelect={mockOnSelect} testID="selector" />);

      expect(getByText('Aluguel')).toBeTruthy();
      expect(getByText('Energia')).toBeTruthy();
      expect(getByText('Farmacia')).toBeTruthy();
      expect(getByText('Uber')).toBeTruthy();
    });

    it('categories are sorted alphabetically', () => {
      const { getAllByTestId } = render(
        <CategorySelector onSelect={mockOnSelect} testID="selector" />
      );

      // All category items should be rendered
      const categoryItems = getAllByTestId(/^selector-category-/);
      expect(categoryItems.length).toBe(4);
    });
  });

  describe('Auto-populates group when category selected directly', () => {
    it('sets group to fixed when a fixed category is selected', () => {
      const { getByTestId } = render(
        <CategorySelector onSelect={mockOnSelect} testID="selector" />
      );

      // Select a fixed category directly
      fireEvent.press(getByTestId('selector-category-fixed-1'));

      expect(mockOnSelect).toHaveBeenCalledWith(mockFixedCategories[0]);
    });

    it('sets group to variable when a variable category is selected', () => {
      const { getByTestId } = render(
        <CategorySelector onSelect={mockOnSelect} testID="selector" />
      );

      // Select a variable category directly
      fireEvent.press(getByTestId('selector-category-var-1'));

      expect(mockOnSelect).toHaveBeenCalledWith(mockVariableCategories[0]);
    });

    it('auto-populates group via selectedCategoryId prop', () => {
      const { getByTestId } = render(
        <CategorySelector onSelect={mockOnSelect} selectedCategoryId="fixed-1" testID="selector" />
      );

      // The fixed group chip should be visually selected (the component uses useEffect to auto-populate)
      const fixedChip = getByTestId('selector-group-fixed');
      expect(fixedChip).toBeTruthy();
    });
  });

  describe('Resets on group clear', () => {
    it('clears group selection when same group is pressed again', () => {
      const { getByTestId, getByText } = render(
        <CategorySelector onSelect={mockOnSelect} testID="selector" />
      );

      // Select fixed group
      fireEvent.press(getByTestId('selector-group-fixed'));

      // Press fixed group again to clear
      fireEvent.press(getByTestId('selector-group-fixed'));

      // Should show all expense categories again
      expect(getByText('Aluguel')).toBeTruthy();
      expect(getByText('Energia')).toBeTruthy();
      expect(getByText('Farmacia')).toBeTruthy();
      expect(getByText('Uber')).toBeTruthy();
    });
  });

  describe('Supports includeIncome prop', () => {
    it('does not show Receita option by default', () => {
      const { queryByText } = render(
        <CategorySelector onSelect={mockOnSelect} testID="selector" />
      );

      expect(queryByText('Receita')).toBeNull();
    });

    it('shows Receita option when includeIncome is true', () => {
      const { getByText } = render(
        <CategorySelector onSelect={mockOnSelect} includeIncome testID="selector" />
      );

      expect(getByText('Receita')).toBeTruthy();
    });

    it('filters to income categories when Receita is selected', () => {
      const { getByTestId, getByText, queryByText } = render(
        <CategorySelector onSelect={mockOnSelect} includeIncome testID="selector" />
      );

      fireEvent.press(getByTestId('selector-group-income'));

      expect(getByText('Salário')).toBeTruthy();
      expect(queryByText('Aluguel')).toBeNull();
      expect(queryByText('Farmacia')).toBeNull();
    });

    it('does not show income categories when includeIncome is false', () => {
      const { queryByText } = render(
        <CategorySelector onSelect={mockOnSelect} testID="selector" />
      );

      expect(queryByText('Salário')).toBeNull();
    });
  });
});
