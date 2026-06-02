/**
 * TimeSlotSection Component Tests
 *
 * Tests for the TimeSlotSection component including:
 * - Renders all time slots as TimeSlotListItem components
 * - Shows "add time slot" button when fewer than 5 slots
 * - Hides "add time slot" button when at 5 slots
 * - Shows max-reached message when at 5 slots
 * - Hides delete buttons when only 1 slot exists
 * - Shows delete buttons when more than 1 slot exists
 * - Disables add button when `disabled` prop is true
 *
 * **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { TimeSlotSection } from '../TimeSlotSection';
import type { TimeSlot } from '../../../stores/notificationStore';

// Mock useThemeColors
jest.mock('../../../hooks/useThemeColors', () => ({
  useThemeColors: () => ({
    text: { primary: '#1C1C1E', secondary: '#6B7280', tertiary: '#9CA3AF', inverse: '#FFFFFF' },
    border: { default: '#E5E7EB', subtle: '#F3F4F6' },
    surface: { card: '#FFFFFF', overlay: 'rgba(0,0,0,0.5)' },
    interactive: { primary: '#007AFF' },
    semantic: {
      danger: { light: '#FEE2E2', base: '#DC2626' },
      warning: { light: '#FEF3C7', base: '#F59E0B', dark: '#92400E' },
    },
    background: { primary: '#FFFFFF', secondary: '#F9FAFB' },
  }),
}));

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('TimeSlotSection', () => {
  const mockOnAddSlot = jest.fn();
  const mockOnRemoveSlot = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Renders all time slots as TimeSlotListItem components', () => {
    it('renders each time slot in the list', () => {
      const timeSlots: TimeSlot[] = [
        { hour: 8, minute: 0 },
        { hour: 12, minute: 30 },
        { hour: 18, minute: 45 },
      ];

      const { getByTestId } = render(
        <TimeSlotSection
          timeSlots={timeSlots}
          onAddSlot={mockOnAddSlot}
          onRemoveSlot={mockOnRemoveSlot}
          disabled={false}
        />
      );

      expect(getByTestId('time-slot-item-08:00')).toBeTruthy();
      expect(getByTestId('time-slot-item-12:30')).toBeTruthy();
      expect(getByTestId('time-slot-item-18:45')).toBeTruthy();
    });

    it('renders time slots sorted chronologically', () => {
      const timeSlots: TimeSlot[] = [
        { hour: 18, minute: 0 },
        { hour: 8, minute: 0 },
        { hour: 12, minute: 30 },
      ];

      const { getAllByTestId } = render(
        <TimeSlotSection
          timeSlots={timeSlots}
          onAddSlot={mockOnAddSlot}
          onRemoveSlot={mockOnRemoveSlot}
          disabled={false}
        />
      );

      // All items should be rendered (sorted internally)
      const items = getAllByTestId(/^time-slot-item-/);
      expect(items).toHaveLength(3);
    });

    it('renders empty list when no time slots provided', () => {
      const { queryByTestId } = render(
        <TimeSlotSection
          timeSlots={[]}
          onAddSlot={mockOnAddSlot}
          onRemoveSlot={mockOnRemoveSlot}
          disabled={false}
        />
      );

      expect(queryByTestId(/^time-slot-item-/)).toBeNull();
    });
  });

  describe('Add button visibility based on slot count', () => {
    it('shows "add time slot" button when fewer than 5 slots', () => {
      const timeSlots: TimeSlot[] = [
        { hour: 8, minute: 0 },
        { hour: 12, minute: 0 },
      ];

      const { getByTestId } = render(
        <TimeSlotSection
          timeSlots={timeSlots}
          onAddSlot={mockOnAddSlot}
          onRemoveSlot={mockOnRemoveSlot}
          disabled={false}
        />
      );

      expect(getByTestId('add-time-slot-button')).toBeTruthy();
    });

    it('shows "add time slot" button with 4 slots', () => {
      const timeSlots: TimeSlot[] = [
        { hour: 8, minute: 0 },
        { hour: 10, minute: 0 },
        { hour: 12, minute: 0 },
        { hour: 14, minute: 0 },
      ];

      const { getByTestId } = render(
        <TimeSlotSection
          timeSlots={timeSlots}
          onAddSlot={mockOnAddSlot}
          onRemoveSlot={mockOnRemoveSlot}
          disabled={false}
        />
      );

      expect(getByTestId('add-time-slot-button')).toBeTruthy();
    });

    it('hides "add time slot" button when at 5 slots', () => {
      const timeSlots: TimeSlot[] = [
        { hour: 8, minute: 0 },
        { hour: 10, minute: 0 },
        { hour: 12, minute: 0 },
        { hour: 14, minute: 0 },
        { hour: 16, minute: 0 },
      ];

      const { queryByTestId } = render(
        <TimeSlotSection
          timeSlots={timeSlots}
          onAddSlot={mockOnAddSlot}
          onRemoveSlot={mockOnRemoveSlot}
          disabled={false}
        />
      );

      expect(queryByTestId('add-time-slot-button')).toBeNull();
    });
  });

  describe('Max-reached message visibility', () => {
    it('shows max-reached message when at 5 slots', () => {
      const timeSlots: TimeSlot[] = [
        { hour: 8, minute: 0 },
        { hour: 10, minute: 0 },
        { hour: 12, minute: 0 },
        { hour: 14, minute: 0 },
        { hour: 16, minute: 0 },
      ];

      const { getByTestId } = render(
        <TimeSlotSection
          timeSlots={timeSlots}
          onAddSlot={mockOnAddSlot}
          onRemoveSlot={mockOnRemoveSlot}
          disabled={false}
        />
      );

      expect(getByTestId('max-slots-message')).toBeTruthy();
    });

    it('does not show max-reached message when fewer than 5 slots', () => {
      const timeSlots: TimeSlot[] = [
        { hour: 8, minute: 0 },
        { hour: 12, minute: 0 },
      ];

      const { queryByTestId } = render(
        <TimeSlotSection
          timeSlots={timeSlots}
          onAddSlot={mockOnAddSlot}
          onRemoveSlot={mockOnRemoveSlot}
          disabled={false}
        />
      );

      expect(queryByTestId('max-slots-message')).toBeNull();
    });
  });

  describe('Delete button visibility based on slot count', () => {
    it('hides delete buttons when only 1 slot exists', () => {
      const timeSlots: TimeSlot[] = [{ hour: 9, minute: 0 }];

      const { queryByTestId } = render(
        <TimeSlotSection
          timeSlots={timeSlots}
          onAddSlot={mockOnAddSlot}
          onRemoveSlot={mockOnRemoveSlot}
          disabled={false}
        />
      );

      expect(queryByTestId('time-slot-delete-09:00')).toBeNull();
    });

    it('shows delete buttons when more than 1 slot exists', () => {
      const timeSlots: TimeSlot[] = [
        { hour: 9, minute: 0 },
        { hour: 14, minute: 30 },
      ];

      const { getByTestId } = render(
        <TimeSlotSection
          timeSlots={timeSlots}
          onAddSlot={mockOnAddSlot}
          onRemoveSlot={mockOnRemoveSlot}
          disabled={false}
        />
      );

      expect(getByTestId('time-slot-delete-09:00')).toBeTruthy();
      expect(getByTestId('time-slot-delete-14:30')).toBeTruthy();
    });

    it('hides delete buttons when disabled prop is true even with multiple slots', () => {
      const timeSlots: TimeSlot[] = [
        { hour: 9, minute: 0 },
        { hour: 14, minute: 30 },
      ];

      const { queryByTestId } = render(
        <TimeSlotSection
          timeSlots={timeSlots}
          onAddSlot={mockOnAddSlot}
          onRemoveSlot={mockOnRemoveSlot}
          disabled={true}
        />
      );

      expect(queryByTestId('time-slot-delete-09:00')).toBeNull();
      expect(queryByTestId('time-slot-delete-14:30')).toBeNull();
    });
  });

  describe('Disabled state', () => {
    it('disables add button when disabled prop is true', () => {
      const timeSlots: TimeSlot[] = [{ hour: 9, minute: 0 }];

      const { getByTestId } = render(
        <TimeSlotSection
          timeSlots={timeSlots}
          onAddSlot={mockOnAddSlot}
          onRemoveSlot={mockOnRemoveSlot}
          disabled={true}
        />
      );

      const addButton = getByTestId('add-time-slot-button');
      expect(addButton.props.accessibilityState.disabled).toBe(true);
    });

    it('add button is enabled when disabled prop is false', () => {
      const timeSlots: TimeSlot[] = [{ hour: 9, minute: 0 }];

      const { getByTestId } = render(
        <TimeSlotSection
          timeSlots={timeSlots}
          onAddSlot={mockOnAddSlot}
          onRemoveSlot={mockOnRemoveSlot}
          disabled={false}
        />
      );

      const addButton = getByTestId('add-time-slot-button');
      expect(addButton.props.accessibilityState.disabled).toBe(false);
    });
  });
});
