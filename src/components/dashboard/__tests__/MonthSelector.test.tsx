/**
 * MonthSelector Component Tests
 *
 * Tests for the MonthSelector component that provides
 * navigation between months.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { MonthSelector } from '../MonthSelector';

// Mock i18n
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'common.previous': 'Previous',
        'common.next': 'Next',
        'transactions.referenceMonth': 'Reference month',
      };
      return translations[key] ?? key;
    },
  }),
}));

// Mock i18n formatters
jest.mock('../../../i18n', () => ({
  getMonthName: (monthIndex: number, _locale: string, _style: string) => {
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
    return months[monthIndex] ?? 'Unknown';
  },
  getCurrentLocale: () => 'en',
}));

describe('MonthSelector', () => {
  const mockOnPreviousMonth = jest.fn();
  const mockOnNextMonth = jest.fn();

  const defaultProps = {
    selectedMonth: '2024-01',
    onPreviousMonth: mockOnPreviousMonth,
    onNextMonth: mockOnNextMonth,
    testID: 'month-selector',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with selected month', () => {
    render(<MonthSelector {...defaultProps} />);

    // Check month display
    expect(screen.getByText('January 2024')).toBeTruthy();
  });

  it('calls onPreviousMonth when previous button is pressed', () => {
    render(<MonthSelector {...defaultProps} />);

    const prevButton = screen.getByTestId('month-selector-prev');
    fireEvent.press(prevButton);

    expect(mockOnPreviousMonth).toHaveBeenCalledTimes(1);
  });

  it('calls onNextMonth when next button is pressed', () => {
    render(<MonthSelector {...defaultProps} />);

    const nextButton = screen.getByTestId('month-selector-next');
    fireEvent.press(nextButton);

    expect(mockOnNextMonth).toHaveBeenCalledTimes(1);
  });

  it('disables next button when disableNext is true', () => {
    render(<MonthSelector {...defaultProps} disableNext />);

    const nextButton = screen.getByTestId('month-selector-next');
    expect(nextButton.props.accessibilityState?.disabled).toBe(true);
  });

  it('disables previous button when disablePrevious is true', () => {
    render(<MonthSelector {...defaultProps} disablePrevious />);

    const prevButton = screen.getByTestId('month-selector-prev');
    expect(prevButton.props.accessibilityState?.disabled).toBe(true);
  });

  it('does not call onNextMonth when disabled', () => {
    render(<MonthSelector {...defaultProps} disableNext />);

    const nextButton = screen.getByTestId('month-selector-next');
    fireEvent.press(nextButton);

    expect(mockOnNextMonth).not.toHaveBeenCalled();
  });

  it('renders different months correctly', () => {
    const { rerender } = render(<MonthSelector {...defaultProps} />);
    expect(screen.getByText('January 2024')).toBeTruthy();

    rerender(<MonthSelector {...defaultProps} selectedMonth="2024-06" />);
    expect(screen.getByText('June 2024')).toBeTruthy();

    rerender(<MonthSelector {...defaultProps} selectedMonth="2024-12" />);
    expect(screen.getByText('December 2024')).toBeTruthy();
  });

  it('has correct accessibility role', () => {
    render(<MonthSelector {...defaultProps} />);

    const container = screen.getByTestId('month-selector');
    expect(container.props.accessibilityRole).toBe('adjustable');
  });

  it('applies custom style', () => {
    const customStyle = { marginTop: 20 };
    render(<MonthSelector {...defaultProps} style={customStyle} />);

    expect(screen.getByTestId('month-selector')).toBeTruthy();
  });
});
