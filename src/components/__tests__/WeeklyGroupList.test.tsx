/**
 * WeeklyGroupList Component Tests
 *
 * Tests for the WeeklyGroupList component including:
 * - Renders list of groups with title, amount, day of week, and category
 * - Shows empty state when no groups provided
 * - Calls onEdit callback when edit button is pressed
 * - Calls onDelete callback when delete button is pressed
 * - Calls onPress callback when item is pressed
 *
 * **Validates: Requirements 4.1, 5.1**
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { WeeklyGroupList } from '../weekly-recurring/WeeklyGroupList';
import type { WeeklyRecurringGroup } from '../../types/weeklyRecurring';

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'common.edit': 'Editar',
        'common.delete': 'Excluir',
        'weeklyRecurring.noGroups': 'Nenhum gasto semanal recorrente cadastrado',
      };
      return translations[key] || (params?.defaultValue as string) || key;
    },
  }),
}));

// Mock useThemeColors
jest.mock('../../hooks/useThemeColors', () => ({
  useThemeColors: () => ({
    text: { primary: '#1C1C1E', secondary: '#6B7280', tertiary: '#9CA3AF', inverse: '#FFFFFF' },
    border: { default: '#E5E7EB', subtle: '#F3F4F6', strong: '#D1D5DB' },
    semantic: {
      primary: { light: '#EFF6FF', base: '#3B82F6', dark: '#1D4ED8' },
      danger: { light: '#FEE2E2', base: '#DC2626', dark: '#991B1B' },
    },
  }),
}));

// Mock i18n formatters
jest.mock('../../i18n', () => ({
  formatCurrencyLocale: (amount: number, _locale: string) => `R$ ${amount.toFixed(2)}`,
  getCurrentLocale: () => 'pt-BR',
}));

const mockGroup: WeeklyRecurringGroup = {
  id: 'group-1',
  title: 'Almoço',
  amount: 25.5,
  dayOfWeek: 4, // Qui
  categoryId: 'cat-food',
  categoryType: 'expense',
  description: '',
  originId: null,
  startDate: '2024-01-01',
  isActive: true,
  createdAt: '2024-01-01T00:00:00',
  updatedAt: '2024-01-01T00:00:00',
};

const mockGroup2: WeeklyRecurringGroup = {
  id: 'group-2',
  title: 'Transporte',
  amount: 15.0,
  dayOfWeek: 1, // Seg
  categoryId: 'cat-transport',
  categoryType: 'expense',
  description: '',
  originId: null,
  startDate: '2024-02-01',
  isActive: true,
  createdAt: '2024-02-01T00:00:00',
  updatedAt: '2024-02-01T00:00:00',
};

describe('WeeklyGroupList', () => {
  const mockOnEdit = jest.fn();
  const mockOnDelete = jest.fn();
  const mockOnPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders empty state when no groups are provided', () => {
    const { getByText } = render(
      <WeeklyGroupList
        groups={[]}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        testID="weekly-list"
      />
    );

    expect(getByText('Nenhum gasto semanal recorrente cadastrado')).toBeTruthy();
  });

  it('renders group items with title, amount, day of week', () => {
    const { getByText } = render(
      <WeeklyGroupList
        groups={[mockGroup, mockGroup2]}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        testID="weekly-list"
      />
    );

    expect(getByText('Almoço')).toBeTruthy();
    expect(getByText('R$ 25.50')).toBeTruthy();
    expect(getByText('Qui')).toBeTruthy();

    expect(getByText('Transporte')).toBeTruthy();
    expect(getByText('R$ 15.00')).toBeTruthy();
    expect(getByText('Seg')).toBeTruthy();
  });

  it('calls onEdit when edit button is pressed', () => {
    const { getByTestId } = render(
      <WeeklyGroupList
        groups={[mockGroup]}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        testID="weekly-list"
      />
    );

    fireEvent.press(getByTestId('weekly-list-edit-group-1'));
    expect(mockOnEdit).toHaveBeenCalledTimes(1);
    expect(mockOnEdit).toHaveBeenCalledWith(mockGroup);
  });

  it('calls onDelete when delete button is pressed', () => {
    const { getByTestId } = render(
      <WeeklyGroupList
        groups={[mockGroup]}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        testID="weekly-list"
      />
    );

    fireEvent.press(getByTestId('weekly-list-delete-group-1'));
    expect(mockOnDelete).toHaveBeenCalledTimes(1);
    expect(mockOnDelete).toHaveBeenCalledWith(mockGroup);
  });

  it('calls onPress when item is pressed', () => {
    const { getByTestId } = render(
      <WeeklyGroupList
        groups={[mockGroup]}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onPress={mockOnPress}
        testID="weekly-list"
      />
    );

    fireEvent.press(getByTestId('weekly-list-item-group-1'));
    expect(mockOnPress).toHaveBeenCalledTimes(1);
    expect(mockOnPress).toHaveBeenCalledWith(mockGroup);
  });

  it('displays correct day of week labels for all days', () => {
    const groups: WeeklyRecurringGroup[] = [
      { ...mockGroup, id: 'g-0', dayOfWeek: 0 },
      { ...mockGroup, id: 'g-6', dayOfWeek: 6 },
    ];

    const { getByText } = render(
      <WeeklyGroupList
        groups={groups}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        testID="weekly-list"
      />
    );

    expect(getByText('Dom')).toBeTruthy();
    expect(getByText('Sáb')).toBeTruthy();
  });
});
