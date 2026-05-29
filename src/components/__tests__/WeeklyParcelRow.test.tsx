/**
 * WeeklyParcelRow Component Tests
 *
 * Tests for the WeeklyParcelRow component including:
 * - Rendering date and amount correctly
 * - PaymentStatusToggle integration (paid/pending states)
 * - onPress callback when row is tapped
 * - onTogglePaymentStatus callback when toggle is tapped
 * - Visual styling for paid vs pending states
 *
 * **Validates: Requirements 1.5, 2.1, 3.1**
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { WeeklyParcelRow } from '../WeeklyParcelRow';
import { useThemeStore } from '../../stores/themeStore';
import type { WeeklyOccurrence } from '../../types/weeklyRecurring';

const mockOccurrence: WeeklyOccurrence = {
  id: 'occ-1',
  weeklyGroupId: 'group-1',
  date: '2024-06-03',
  referenceMonth: '2024-06',
  amount: 150.5,
  description: 'Test occurrence',
  isValueEdited: false,
  isPaid: false,
  createdAt: '2024-06-01T00:00:00Z',
  updatedAt: '2024-06-01T00:00:00Z',
};

const mockPaidOccurrence: WeeklyOccurrence = {
  ...mockOccurrence,
  id: 'occ-2',
  isPaid: true,
};

describe('WeeklyParcelRow', () => {
  beforeEach(() => {
    useThemeStore.setState({ resolvedScheme: 'light', preference: 'light' });
  });

  describe('rendering', () => {
    it('renders the formatted date', () => {
      const { getByTestId } = render(
        <WeeklyParcelRow
          occurrence={mockOccurrence}
          onPress={jest.fn()}
          onTogglePaymentStatus={jest.fn()}
          testID="parcel-row"
        />
      );
      const dateText = getByTestId('parcel-row-date');
      expect(dateText.props.children).toBe('03/06');
    });

    it('renders the formatted amount', () => {
      const { getByTestId } = render(
        <WeeklyParcelRow
          occurrence={mockOccurrence}
          onPress={jest.fn()}
          onTogglePaymentStatus={jest.fn()}
          testID="parcel-row"
        />
      );
      const amountText = getByTestId('parcel-row-amount');
      expect(amountText.props.children).toBeTruthy();
    });

    it('renders the PaymentStatusToggle', () => {
      const { getByTestId } = render(
        <WeeklyParcelRow
          occurrence={mockOccurrence}
          onPress={jest.fn()}
          onTogglePaymentStatus={jest.fn()}
          testID="parcel-row"
        />
      );
      expect(getByTestId('parcel-row-toggle')).toBeTruthy();
    });
  });

  describe('payment status display', () => {
    it('shows empty circle icon when isPaid is false', () => {
      const { getByTestId } = render(
        <WeeklyParcelRow
          occurrence={mockOccurrence}
          onPress={jest.fn()}
          onTogglePaymentStatus={jest.fn()}
          testID="parcel-row"
        />
      );
      expect(getByTestId('parcel-row-toggle-empty-icon')).toBeTruthy();
    });

    it('shows check icon when isPaid is true', () => {
      const { getByTestId } = render(
        <WeeklyParcelRow
          occurrence={mockPaidOccurrence}
          onPress={jest.fn()}
          onTogglePaymentStatus={jest.fn()}
          testID="parcel-row"
        />
      );
      expect(getByTestId('parcel-row-toggle-check-icon')).toBeTruthy();
    });
  });

  describe('onPress callback', () => {
    it('calls onPress with the occurrence when row is tapped', () => {
      const onPress = jest.fn();
      const { getByTestId } = render(
        <WeeklyParcelRow
          occurrence={mockOccurrence}
          onPress={onPress}
          onTogglePaymentStatus={jest.fn()}
          testID="parcel-row"
        />
      );
      fireEvent.press(getByTestId('parcel-row'));
      expect(onPress).toHaveBeenCalledTimes(1);
      expect(onPress).toHaveBeenCalledWith(mockOccurrence);
    });
  });

  describe('onTogglePaymentStatus callback', () => {
    it('calls onTogglePaymentStatus with occurrence id when toggle is tapped', () => {
      const onTogglePaymentStatus = jest.fn();
      const { getByTestId } = render(
        <WeeklyParcelRow
          occurrence={mockOccurrence}
          onPress={jest.fn()}
          onTogglePaymentStatus={onTogglePaymentStatus}
          testID="parcel-row"
        />
      );
      fireEvent.press(getByTestId('parcel-row-toggle'));
      expect(onTogglePaymentStatus).toHaveBeenCalledTimes(1);
      expect(onTogglePaymentStatus).toHaveBeenCalledWith('occ-1');
    });
  });

  describe('paid styling', () => {
    it('applies line-through to date text when paid', () => {
      const { getByTestId } = render(
        <WeeklyParcelRow
          occurrence={mockPaidOccurrence}
          onPress={jest.fn()}
          onTogglePaymentStatus={jest.fn()}
          testID="parcel-row"
        />
      );
      const dateText = getByTestId('parcel-row-date');
      const flatStyle = Array.isArray(dateText.props.style)
        ? Object.assign({}, ...dateText.props.style.filter(Boolean))
        : dateText.props.style;
      expect(flatStyle.textDecorationLine).toBe('line-through');
    });

    it('does not apply line-through to date text when pending', () => {
      const { getByTestId } = render(
        <WeeklyParcelRow
          occurrence={mockOccurrence}
          onPress={jest.fn()}
          onTogglePaymentStatus={jest.fn()}
          testID="parcel-row"
        />
      );
      const dateText = getByTestId('parcel-row-date');
      const flatStyle = Array.isArray(dateText.props.style)
        ? Object.assign({}, ...dateText.props.style.filter(Boolean))
        : dateText.props.style;
      expect(flatStyle.textDecorationLine).toBeUndefined();
    });
  });

  describe('accessibility', () => {
    it('has button role on the row', () => {
      const { getByTestId } = render(
        <WeeklyParcelRow
          occurrence={mockOccurrence}
          onPress={jest.fn()}
          onTogglePaymentStatus={jest.fn()}
          testID="parcel-row"
        />
      );
      const row = getByTestId('parcel-row');
      expect(row.props.accessibilityRole).toBe('button');
    });

    it('has an accessibility label with date and amount', () => {
      const { getByTestId } = render(
        <WeeklyParcelRow
          occurrence={mockOccurrence}
          onPress={jest.fn()}
          onTogglePaymentStatus={jest.fn()}
          testID="parcel-row"
        />
      );
      const row = getByTestId('parcel-row');
      expect(row.props.accessibilityLabel).toContain('03/06');
    });
  });
});
