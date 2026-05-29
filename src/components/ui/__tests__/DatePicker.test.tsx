/**
 * DatePicker Component Tests
 *
 * Tests for the DatePicker component including:
 * - Rendering date correctly
 * - Opening/closing picker modal
 * - Date selection
 * - Accessibility support
 *
 * **Validates: Requirements 30**
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { DatePicker, type DatePickerProps } from '../DatePicker';

// Mock i18n
jest.mock('../../../i18n', () => ({
  formatDateLocale: jest.fn((date: Date, _locale: string, options?: { dateStyle?: string }) => {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();

    // For long style, return month name format
    if (options?.dateStyle === 'long') {
      const months = [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December',
      ];
      return `${months[date.getMonth()]} ${day}, ${year}`;
    }

    return `${month}/${day}/${year}`;
  }),
  getCurrentLocale: jest.fn(() => 'en'),
}));

describe('DatePicker', () => {
  // Use a date that won't have timezone issues
  const mockDate = new Date(2024, 0, 14); // January 14, 2024
  const mockOnChange = jest.fn();

  const defaultProps: DatePickerProps = {
    value: mockDate,
    onChange: mockOnChange,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders formatted date', () => {
    const { getByText } = render(<DatePicker {...defaultProps} />);
    // The mock returns 01/14/2024 for Jan 14 (0-indexed month)
    expect(getByText('01/14/2024')).toBeTruthy();
  });

  it('renders label when provided', () => {
    const { getByText } = render(<DatePicker {...defaultProps} label="Transaction Date" />);
    expect(getByText('Transaction Date')).toBeTruthy();
  });

  it('renders placeholder when no value is provided', () => {
    const { getByText } = render(
      <DatePicker
        value={undefined as unknown as Date}
        onChange={mockOnChange}
        placeholder="Select a date"
      />
    );
    expect(getByText('Select a date')).toBeTruthy();
  });

  it('opens modal when pressed', async () => {
    const { getByTestId, getByText } = render(
      <DatePicker {...defaultProps} testID="date-picker" />
    );

    fireEvent.press(getByTestId('date-picker-button'));

    await waitFor(() => {
      expect(getByText('manual.selectDate')).toBeTruthy();
    });
  });

  it('does not open modal when disabled', () => {
    const { getByTestId, queryByTestId } = render(
      <DatePicker {...defaultProps} disabled testID="date-picker" />
    );

    fireEvent.press(getByTestId('date-picker-button'));

    expect(queryByTestId('date-picker-modal')).toBeNull();
  });

  it('closes modal when close button is pressed', async () => {
    const { getByTestId, getByLabelText, queryByText } = render(
      <DatePicker {...defaultProps} testID="date-picker" />
    );

    // Open modal
    fireEvent.press(getByTestId('date-picker-button'));

    await waitFor(() => {
      expect(getByLabelText('common.close')).toBeTruthy();
    });

    // Close modal
    fireEvent.press(getByLabelText('common.close'));

    await waitFor(() => {
      expect(queryByText('manual.selectDate')).toBeNull();
    });
  });

  it('calls onChange when a date is selected', async () => {
    const { getByTestId, getByLabelText } = render(
      <DatePicker {...defaultProps} testID="date-picker" />
    );

    // Open modal
    fireEvent.press(getByTestId('date-picker-button'));

    await waitFor(() => {
      // Select day 20
      const day20 = getByLabelText('20');
      fireEvent.press(day20);
    });

    expect(mockOnChange).toHaveBeenCalled();
    const calledDate = mockOnChange.mock.calls[0][0];
    expect(calledDate.getDate()).toBe(20);
  });

  it('selects today when Today button is pressed', async () => {
    const { getByTestId, getByLabelText } = render(
      <DatePicker {...defaultProps} testID="date-picker" />
    );

    // Open modal
    fireEvent.press(getByTestId('date-picker-button'));

    await waitFor(() => {
      const todayButton = getByLabelText('common.today');
      fireEvent.press(todayButton);
    });

    expect(mockOnChange).toHaveBeenCalled();
    const calledDate = mockOnChange.mock.calls[0][0];
    const today = new Date();
    expect(calledDate.getDate()).toBe(today.getDate());
    expect(calledDate.getMonth()).toBe(today.getMonth());
    expect(calledDate.getFullYear()).toBe(today.getFullYear());
  });

  it('renders error message when error is provided', () => {
    const { getByText, getByRole } = render(
      <DatePicker {...defaultProps} error="Date is required" />
    );

    expect(getByText('Date is required')).toBeTruthy();
    expect(getByRole('alert')).toBeTruthy();
  });

  it('applies error styling when error is provided', () => {
    const { getByTestId } = render(
      <DatePicker {...defaultProps} error="Date is required" testID="date-picker" />
    );

    const button = getByTestId('date-picker-button');
    // Style is flattened, check for the property directly
    expect(button.props.style.borderColor).toBe('#DC2626');
  });

  it('applies disabled styling when disabled', () => {
    const { getByTestId } = render(<DatePicker {...defaultProps} disabled testID="date-picker" />);

    const button = getByTestId('date-picker-button');
    // Style is flattened, check for the property directly
    expect(button.props.style.backgroundColor).toBe('#EBEBF0');
  });

  it('has correct accessibility state when disabled', () => {
    const { getByTestId } = render(<DatePicker {...defaultProps} disabled testID="date-picker" />);

    const button = getByTestId('date-picker-button');
    expect(button.props.accessibilityState.disabled).toBe(true);
  });

  it('navigates to previous month', async () => {
    const { getByTestId, getByLabelText, getByText } = render(
      <DatePicker {...defaultProps} testID="date-picker" />
    );

    // Open modal
    fireEvent.press(getByTestId('date-picker-button'));

    await waitFor(() => {
      // Check that January is displayed in the header
      expect(getByText(/January/)).toBeTruthy();
    });

    // Navigate to previous month
    fireEvent.press(getByLabelText('common.previous'));

    await waitFor(() => {
      // After navigating back, December should be shown
      expect(getByText(/December/)).toBeTruthy();
    });
  });

  it('navigates to next month', async () => {
    const { getByTestId, getByLabelText, getByText } = render(
      <DatePicker {...defaultProps} testID="date-picker" />
    );

    // Open modal
    fireEvent.press(getByTestId('date-picker-button'));

    await waitFor(() => {
      // Check that January is displayed
      expect(getByText(/January/)).toBeTruthy();
    });

    // Navigate to next month
    fireEvent.press(getByLabelText('common.next'));

    await waitFor(() => {
      // After navigating forward, February should be shown
      expect(getByText(/February/)).toBeTruthy();
    });
  });

  it('disables dates before minimumDate', async () => {
    const minimumDate = new Date('2024-01-10');
    const { getByTestId, getByLabelText } = render(
      <DatePicker {...defaultProps} minimumDate={minimumDate} testID="date-picker" />
    );

    // Open modal
    fireEvent.press(getByTestId('date-picker-button'));

    await waitFor(() => {
      const day5 = getByLabelText('5');
      expect(day5.props.accessibilityState.disabled).toBe(true);
    });
  });

  it('disables dates after maximumDate', async () => {
    const maximumDate = new Date('2024-01-20');
    const { getByTestId, getByLabelText } = render(
      <DatePicker {...defaultProps} maximumDate={maximumDate} testID="date-picker" />
    );

    // Open modal
    fireEvent.press(getByTestId('date-picker-button'));

    await waitFor(() => {
      const day25 = getByLabelText('25');
      expect(day25.props.accessibilityState.disabled).toBe(true);
    });
  });

  it('applies custom styles', () => {
    const customStyle = { marginTop: 20 };
    const { getByTestId } = render(
      <DatePicker {...defaultProps} style={customStyle} testID="date-picker" />
    );

    const container = getByTestId('date-picker');
    expect(container.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining(customStyle)])
    );
  });
});
