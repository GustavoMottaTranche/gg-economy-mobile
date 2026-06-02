/**
 * DateTimePicker Component Tests
 *
 * Tests for the DateTimePicker component including:
 * - Rendering formatted date+time correctly for both locales
 * - Opening native picker on press
 * - Disabled state behavior
 * - Error display
 * - Accessibility support
 * - formatDateTimeForLocale utility function
 *
 * **Validates: Requirements 3.1, 3.2, 3.4**
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import {
  DateTimePicker,
  type DateTimePickerProps,
  formatDateTimeForLocale,
} from '../DateTimePicker';

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock @react-native-community/datetimepicker
jest.mock('@react-native-community/datetimepicker', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: (props: { testID?: string }) => {
      return React.createElement('View', { testID: props.testID || 'native-picker' });
    },
  };
});

describe('DateTimePicker', () => {
  const mockDate = new Date(2024, 5, 15, 14, 30); // June 15, 2024 14:30
  const mockOnChange = jest.fn();

  const defaultProps: DateTimePickerProps = {
    value: mockDate,
    onChange: mockOnChange,
    locale: 'pt-BR',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('formatDateTimeForLocale', () => {
    it('formats date in pt-BR locale as dd/MM/yyyy HH:mm', () => {
      const date = new Date(2024, 5, 15, 14, 30); // June 15, 2024 14:30
      expect(formatDateTimeForLocale(date, 'pt-BR')).toBe('15/06/2024 14:30');
    });

    it('formats date in en locale as MM/dd/yyyy hh:mm a', () => {
      const date = new Date(2024, 5, 15, 14, 30); // June 15, 2024 2:30 PM
      expect(formatDateTimeForLocale(date, 'en')).toBe('06/15/2024 02:30 PM');
    });

    it('formats midnight correctly for pt-BR', () => {
      const date = new Date(2024, 0, 1, 0, 0); // Jan 1, 2024 00:00
      expect(formatDateTimeForLocale(date, 'pt-BR')).toBe('01/01/2024 00:00');
    });

    it('formats midnight correctly for en (12:00 AM)', () => {
      const date = new Date(2024, 0, 1, 0, 0); // Jan 1, 2024 12:00 AM
      expect(formatDateTimeForLocale(date, 'en')).toBe('01/01/2024 12:00 AM');
    });

    it('formats noon correctly for pt-BR', () => {
      const date = new Date(2024, 0, 1, 12, 0); // Jan 1, 2024 12:00
      expect(formatDateTimeForLocale(date, 'pt-BR')).toBe('01/01/2024 12:00');
    });

    it('formats noon correctly for en (12:00 PM)', () => {
      const date = new Date(2024, 0, 1, 12, 0); // Jan 1, 2024 12:00 PM
      expect(formatDateTimeForLocale(date, 'en')).toBe('01/01/2024 12:00 PM');
    });

    it('pads single-digit day and month', () => {
      const date = new Date(2024, 0, 5, 9, 5); // Jan 5, 2024 09:05
      expect(formatDateTimeForLocale(date, 'pt-BR')).toBe('05/01/2024 09:05');
    });

    it('returns empty string for invalid date', () => {
      expect(formatDateTimeForLocale(new Date('invalid'), 'pt-BR')).toBe('');
    });
  });

  describe('rendering', () => {
    it('renders formatted date+time for pt-BR locale', () => {
      const { getByText } = render(<DateTimePicker {...defaultProps} />);
      expect(getByText('15/06/2024 14:30')).toBeTruthy();
    });

    it('renders formatted date+time for en locale', () => {
      const { getByText } = render(<DateTimePicker {...defaultProps} locale="en" />);
      expect(getByText('06/15/2024 02:30 PM')).toBeTruthy();
    });

    it('renders label when provided', () => {
      const { getByText } = render(<DateTimePicker {...defaultProps} label="Data da Compra" />);
      expect(getByText('Data da Compra')).toBeTruthy();
    });

    it('renders error message when error is provided', () => {
      const { getByText, getByRole } = render(
        <DateTimePicker {...defaultProps} error="Data é obrigatória" />
      );
      expect(getByText('Data é obrigatória')).toBeTruthy();
      expect(getByRole('alert')).toBeTruthy();
    });

    it('defaults to current device date/time when value is current date', () => {
      const now = new Date();
      const { getByText } = render(
        <DateTimePicker value={now} onChange={mockOnChange} locale="pt-BR" />
      );
      const formatted = formatDateTimeForLocale(now, 'pt-BR');
      expect(getByText(formatted)).toBeTruthy();
    });
  });

  describe('interaction', () => {
    it('opens date picker when pressed', () => {
      const { getByTestId, queryByTestId } = render(
        <DateTimePicker {...defaultProps} testID="dtp" />
      );

      // Initially no picker visible
      expect(queryByTestId('dtp-date-picker')).toBeNull();

      // Press the button
      fireEvent.press(getByTestId('dtp-button'));

      // Picker should now be visible
      expect(queryByTestId('dtp-date-picker')).toBeTruthy();
    });

    it('does not open picker when disabled', () => {
      const { getByTestId, queryByTestId } = render(
        <DateTimePicker {...defaultProps} disabled testID="dtp" />
      );

      fireEvent.press(getByTestId('dtp-button'));

      expect(queryByTestId('dtp-date-picker')).toBeNull();
    });
  });

  describe('styling', () => {
    it('applies error styling when error is provided', () => {
      const { getByTestId } = render(
        <DateTimePicker {...defaultProps} error="Error" testID="dtp" />
      );

      const button = getByTestId('dtp-button');
      // Flattened style should include error border color
      const flatStyle = Array.isArray(button.props.style)
        ? Object.assign({}, ...button.props.style.filter(Boolean))
        : button.props.style;
      expect(flatStyle.borderColor).toBe('#DC2626');
    });

    it('applies disabled styling when disabled', () => {
      const { getByTestId } = render(<DateTimePicker {...defaultProps} disabled testID="dtp" />);

      const button = getByTestId('dtp-button');
      const flatStyle = Array.isArray(button.props.style)
        ? Object.assign({}, ...button.props.style.filter(Boolean))
        : button.props.style;
      expect(flatStyle.backgroundColor).toBe('#EBEBF0');
    });

    it('applies custom container style', () => {
      const customStyle = { marginTop: 20 };
      const { getByTestId } = render(
        <DateTimePicker {...defaultProps} style={customStyle} testID="dtp" />
      );

      const container = getByTestId('dtp');
      expect(container.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining(customStyle)])
      );
    });
  });

  describe('accessibility', () => {
    it('has correct accessibility role on button', () => {
      const { getByTestId } = render(<DateTimePicker {...defaultProps} testID="dtp" />);

      const button = getByTestId('dtp-button');
      expect(button.props.accessibilityRole).toBe('button');
    });

    it('has correct accessibility state when disabled', () => {
      const { getByTestId } = render(<DateTimePicker {...defaultProps} disabled testID="dtp" />);

      const button = getByTestId('dtp-button');
      expect(button.props.accessibilityState.disabled).toBe(true);
    });

    it('includes label and value in accessibility label', () => {
      const { getByTestId } = render(
        <DateTimePicker {...defaultProps} label="Data da Compra" testID="dtp" />
      );

      const button = getByTestId('dtp-button');
      expect(button.props.accessibilityLabel).toContain('Data da Compra');
      expect(button.props.accessibilityLabel).toContain('15/06/2024 14:30');
    });
  });
});
