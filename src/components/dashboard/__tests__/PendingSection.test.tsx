/**
 * PendingSection Component Tests
 *
 * Tests for the PendingSection component including:
 * - Hiding when items list is empty (returns null)
 * - Showing items when populated
 * - Toggle callback fires with correct id and type
 * - Item press callback fires with correct groupId and type
 *
 * **Validates: Requirements 4.3, 4.4**
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { PendingSection } from '../PendingSection';
import { useThemeStore } from '../../../stores/themeStore';
import type { PendingItem } from '../../../types/paymentStatus';

// Mock i18n module
jest.mock('../../../i18n', () => ({
  formatCurrencyLocale: (amount: number, _locale: string) => `R$ ${amount.toFixed(2)}`,
  formatDateLocale: (date: Date, _locale: string, _opts: unknown) => {
    const d = date.getDate().toString().padStart(2, '0');
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${d}/${m}`;
  },
  getCurrentLocale: () => 'pt-BR',
}));

describe('PendingSection', () => {
  beforeEach(() => {
    useThemeStore.setState({ resolvedScheme: 'light', preference: 'light' });
  });

  const mockItems: PendingItem[] = [
    {
      id: 'occ-1',
      type: 'weekly',
      groupId: 'group-1',
      groupName: 'Internet',
      amount: 9990,
      date: '2024-03-05',
      referenceMonth: '2024-03',
    },
    {
      id: 'occ-2',
      type: 'monthly',
      groupId: 'group-2',
      groupName: 'Aluguel',
      amount: 150000,
      date: '2024-03-10',
      referenceMonth: '2024-03',
    },
  ];

  describe('visibility', () => {
    it('returns null when items list is empty', () => {
      const { toJSON } = render(
        <PendingSection
          items={[]}
          onToggleStatus={jest.fn()}
          onItemPress={jest.fn()}
          testID="pending-section"
        />
      );

      expect(toJSON()).toBeNull();
    });

    it('renders the section when items are populated', () => {
      const { getByTestId } = render(
        <PendingSection
          items={mockItems}
          onToggleStatus={jest.fn()}
          onItemPress={jest.fn()}
          testID="pending-section"
        />
      );

      expect(getByTestId('pending-section')).toBeTruthy();
    });
  });

  describe('content rendering', () => {
    it('renders the section title', () => {
      const { getByTestId } = render(
        <PendingSection
          items={mockItems}
          onToggleStatus={jest.fn()}
          onItemPress={jest.fn()}
          testID="pending-section"
        />
      );

      expect(getByTestId('pending-section-title')).toBeTruthy();
    });

    it('renders all pending items', () => {
      const { getByTestId } = render(
        <PendingSection
          items={mockItems}
          onToggleStatus={jest.fn()}
          onItemPress={jest.fn()}
          testID="pending-section"
        />
      );

      expect(getByTestId('pending-section-item-occ-1')).toBeTruthy();
      expect(getByTestId('pending-section-item-occ-2')).toBeTruthy();
    });

    it('displays group names', () => {
      const { getByText } = render(
        <PendingSection
          items={mockItems}
          onToggleStatus={jest.fn()}
          onItemPress={jest.fn()}
          testID="pending-section"
        />
      );

      expect(getByText('Internet')).toBeTruthy();
      expect(getByText('Aluguel')).toBeTruthy();
    });
  });

  describe('toggle callback', () => {
    it('calls onToggleStatus with correct id and type when toggle is pressed', () => {
      const onToggleStatus = jest.fn();
      const { getByTestId } = render(
        <PendingSection
          items={mockItems}
          onToggleStatus={onToggleStatus}
          onItemPress={jest.fn()}
          testID="pending-section"
        />
      );

      fireEvent.press(getByTestId('pending-section-item-occ-1-toggle'));
      expect(onToggleStatus).toHaveBeenCalledWith('occ-1', 'weekly');
    });

    it('calls onToggleStatus with monthly type for monthly items', () => {
      const onToggleStatus = jest.fn();
      const { getByTestId } = render(
        <PendingSection
          items={mockItems}
          onToggleStatus={onToggleStatus}
          onItemPress={jest.fn()}
          testID="pending-section"
        />
      );

      fireEvent.press(getByTestId('pending-section-item-occ-2-toggle'));
      expect(onToggleStatus).toHaveBeenCalledWith('occ-2', 'monthly');
    });
  });

  describe('item press callback', () => {
    it('calls onItemPress with correct groupId and type when item content is pressed', () => {
      const onItemPress = jest.fn();
      const { getByTestId } = render(
        <PendingSection
          items={mockItems}
          onToggleStatus={jest.fn()}
          onItemPress={onItemPress}
          testID="pending-section"
        />
      );

      fireEvent.press(getByTestId('pending-section-item-occ-1-pressable'));
      expect(onItemPress).toHaveBeenCalledWith('group-1', 'weekly');
    });

    it('calls onItemPress with monthly group info when monthly item is pressed', () => {
      const onItemPress = jest.fn();
      const { getByTestId } = render(
        <PendingSection
          items={mockItems}
          onToggleStatus={jest.fn()}
          onItemPress={onItemPress}
          testID="pending-section"
        />
      );

      fireEvent.press(getByTestId('pending-section-item-occ-2-pressable'));
      expect(onItemPress).toHaveBeenCalledWith('group-2', 'monthly');
    });
  });
});
