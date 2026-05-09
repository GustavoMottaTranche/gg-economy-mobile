/**
 * TrendChart Component Tests
 *
 * Tests for the TrendChart component that displays
 * income vs expenses trends over time.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { TrendChart } from '../TrendChart';
import type { TrendDataPoint, TrendPeriod } from '../../../hooks/useDashboardData';

// Mock i18n
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'dashboard.trend': 'Trend',
        'dashboard.noData': 'No data for this month',
        'dashboard.last3Months': 'Last 3 months',
        'dashboard.last6Months': 'Last 6 months',
        'dashboard.last12Months': 'Last 12 months',
      };
      return translations[key] ?? key;
    },
  }),
}));

// Mock i18n formatters
jest.mock('../../../i18n', () => ({
  getMonthName: (monthIndex: number, _locale: string, _style: string) => {
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    return months[monthIndex] ?? 'Unknown';
  },
  getCurrentLocale: () => 'en',
}));

// Mock BarChart
jest.mock('../../charts/BarChart', () => ({
  BarChart: ({ testID }: { testID?: string }) => {
    const { View, Text } = require('react-native');
    return (
      <View testID={testID}>
        <Text>Mocked BarChart</Text>
      </View>
    );
  },
}));

describe('TrendChart', () => {
  const mockOnPeriodChange = jest.fn();

  const sampleData: TrendDataPoint[] = [
    { month: '2024-01', income: 500000, expenses: 350000, balance: 150000 },
    { month: '2024-02', income: 550000, expenses: 400000, balance: 150000 },
    { month: '2024-03', income: 480000, expenses: 320000, balance: 160000 },
  ];

  const defaultProps = {
    data: sampleData,
    selectedPeriod: 3 as TrendPeriod,
    onPeriodChange: mockOnPeriodChange,
    testID: 'trend-chart',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with data', () => {
    render(<TrendChart {...defaultProps} />);

    expect(screen.getByText('Trend')).toBeTruthy();
    expect(screen.getByTestId('trend-chart-chart')).toBeTruthy();
  });

  it('renders empty state when no data', () => {
    render(
      <TrendChart
        data={[]}
        selectedPeriod={3}
        onPeriodChange={mockOnPeriodChange}
        testID="trend-chart"
      />
    );

    expect(screen.getByText('No data for this month')).toBeTruthy();
  });

  it('renders period selector buttons', () => {
    render(<TrendChart {...defaultProps} />);

    expect(screen.getByTestId('trend-chart-period-3')).toBeTruthy();
    expect(screen.getByTestId('trend-chart-period-6')).toBeTruthy();
    expect(screen.getByTestId('trend-chart-period-12')).toBeTruthy();
  });

  it('calls onPeriodChange when period button is pressed', () => {
    render(<TrendChart {...defaultProps} />);

    const period6Button = screen.getByTestId('trend-chart-period-6');
    fireEvent.press(period6Button);

    expect(mockOnPeriodChange).toHaveBeenCalledWith(6);
  });

  it('highlights the selected period', () => {
    render(<TrendChart {...defaultProps} />);

    const period3Button = screen.getByTestId('trend-chart-period-3');
    expect(period3Button.props.accessibilityState?.selected).toBe(true);

    const period6Button = screen.getByTestId('trend-chart-period-6');
    expect(period6Button.props.accessibilityState?.selected).toBe(false);
  });

  it('updates when selectedPeriod changes', () => {
    const { rerender } = render(<TrendChart {...defaultProps} />);

    let period3Button = screen.getByTestId('trend-chart-period-3');
    expect(period3Button.props.accessibilityState?.selected).toBe(true);

    rerender(<TrendChart {...defaultProps} selectedPeriod={6} />);

    const period6Button = screen.getByTestId('trend-chart-period-6');
    expect(period6Button.props.accessibilityState?.selected).toBe(true);

    period3Button = screen.getByTestId('trend-chart-period-3');
    expect(period3Button.props.accessibilityState?.selected).toBe(false);
  });

  it('renders the bar chart', () => {
    render(<TrendChart {...defaultProps} />);

    expect(screen.getByTestId('trend-chart-chart')).toBeTruthy();
  });

  it('applies custom style', () => {
    const customStyle = { marginTop: 20 };
    render(<TrendChart {...defaultProps} style={customStyle} />);

    expect(screen.getByTestId('trend-chart')).toBeTruthy();
  });

  it('has correct accessibility labels for period buttons', () => {
    render(<TrendChart {...defaultProps} />);

    const period3Button = screen.getByTestId('trend-chart-period-3');
    expect(period3Button.props.accessibilityLabel).toBe('Last 3 months');

    const period6Button = screen.getByTestId('trend-chart-period-6');
    expect(period6Button.props.accessibilityLabel).toBe('Last 6 months');

    const period12Button = screen.getByTestId('trend-chart-period-12');
    expect(period12Button.props.accessibilityLabel).toBe('Last 12 months');
  });
});
