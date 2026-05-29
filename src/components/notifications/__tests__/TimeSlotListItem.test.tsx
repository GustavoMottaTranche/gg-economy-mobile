/**
 * TimeSlotListItem Component Tests
 *
 * Tests for the TimeSlotListItem component including:
 * - Renders formatted time in HH:MM 24-hour format
 * - Shows delete button when canDelete is true
 * - Hides delete button when canDelete is false
 * - Calls onDelete with correct key when delete is pressed
 *
 * **Validates: Requirements 5.1, 5.2, 5.3**
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { TimeSlotListItem } from '../TimeSlotListItem';
import type { TimeSlot } from '../../../stores/notificationStore';

// Mock useThemeColors
jest.mock('../../../hooks/useThemeColors', () => ({
  useThemeColors: () => ({
    text: { primary: '#1C1C1E', secondary: '#6B7280', tertiary: '#9CA3AF' },
    border: { default: '#E5E7EB', subtle: '#F3F4F6' },
    semantic: {
      danger: { light: '#FEE2E2', base: '#DC2626' },
    },
  }),
}));

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string>) =>
      params ? `${key}:${JSON.stringify(params)}` : key,
  }),
}));

describe('TimeSlotListItem', () => {
  const mockOnDelete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Renders formatted time in HH:MM 24-hour format', () => {
    it('renders time with zero-padded hour and minute', () => {
      const slot: TimeSlot = { hour: 8, minute: 0 };
      const { getByTestId } = render(
        <TimeSlotListItem slot={slot} canDelete={false} onDelete={mockOnDelete} />
      );

      const timeText = getByTestId('time-slot-time-08:00');
      expect(timeText.props.children).toBe('08:00');
    });

    it('renders afternoon time correctly', () => {
      const slot: TimeSlot = { hour: 14, minute: 30 };
      const { getByTestId } = render(
        <TimeSlotListItem slot={slot} canDelete={false} onDelete={mockOnDelete} />
      );

      const timeText = getByTestId('time-slot-time-14:30');
      expect(timeText.props.children).toBe('14:30');
    });

    it('renders midnight correctly', () => {
      const slot: TimeSlot = { hour: 0, minute: 0 };
      const { getByTestId } = render(
        <TimeSlotListItem slot={slot} canDelete={false} onDelete={mockOnDelete} />
      );

      const timeText = getByTestId('time-slot-time-00:00');
      expect(timeText.props.children).toBe('00:00');
    });

    it('renders end-of-day time correctly', () => {
      const slot: TimeSlot = { hour: 23, minute: 45 };
      const { getByTestId } = render(
        <TimeSlotListItem slot={slot} canDelete={false} onDelete={mockOnDelete} />
      );

      const timeText = getByTestId('time-slot-time-23:45');
      expect(timeText.props.children).toBe('23:45');
    });
  });

  describe('Delete button visibility', () => {
    it('shows delete button when canDelete is true', () => {
      const slot: TimeSlot = { hour: 9, minute: 15 };
      const { getByTestId } = render(
        <TimeSlotListItem slot={slot} canDelete={true} onDelete={mockOnDelete} />
      );

      expect(getByTestId('time-slot-delete-09:15')).toBeTruthy();
    });

    it('hides delete button when canDelete is false', () => {
      const slot: TimeSlot = { hour: 9, minute: 15 };
      const { queryByTestId } = render(
        <TimeSlotListItem slot={slot} canDelete={false} onDelete={mockOnDelete} />
      );

      expect(queryByTestId('time-slot-delete-09:15')).toBeNull();
    });
  });

  describe('Delete button interaction', () => {
    it('calls onDelete with the correct time slot key when pressed', () => {
      const slot: TimeSlot = { hour: 17, minute: 30 };
      const { getByTestId } = render(
        <TimeSlotListItem slot={slot} canDelete={true} onDelete={mockOnDelete} />
      );

      fireEvent.press(getByTestId('time-slot-delete-17:30'));

      expect(mockOnDelete).toHaveBeenCalledTimes(1);
      expect(mockOnDelete).toHaveBeenCalledWith('17:30');
    });

    it('does not call onDelete when delete button is not rendered', () => {
      const slot: TimeSlot = { hour: 6, minute: 0 };
      render(
        <TimeSlotListItem slot={slot} canDelete={false} onDelete={mockOnDelete} />
      );

      expect(mockOnDelete).not.toHaveBeenCalled();
    });
  });
});
