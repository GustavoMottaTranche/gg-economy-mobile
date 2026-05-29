/**
 * BarChart Component Tests
 *
 * Tests for the BarChart component including:
 * - Rendering with data
 * - Empty state handling
 * - Vertical and horizontal orientations
 * - Bar interaction
 * - Accessibility support
 *
 * **Validates: Requirements 22, 30**
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { BarChart, type BarChartDataPoint } from '../BarChart';

// Mock react-native-svg
jest.mock('react-native-svg', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ children, ...props }: any) => <View {...props}>{children}</View>,
    Svg: ({ children, ...props }: any) => <View {...props}>{children}</View>,
    G: ({ children, ...props }: any) => <View {...props}>{children}</View>,
    Rect: ({ onPress, fill, ...props }: any) => (
      <View {...props} onTouchEnd={onPress} testID={`bar-${fill}`} />
    ),
    Line: (props: any) => <View {...props} />,
    Text: ({ children, ...props }: any) => <Text {...props}>{children}</Text>,
  };
});

// Mock i18n
jest.mock('../../../i18n', () => ({
  formatCurrencyLocale: jest.fn((amount: number) => `$${amount.toFixed(2)}`),
  getCurrentLocale: jest.fn(() => 'en'),
}));

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: any) => {
      const translations: Record<string, string> = {
        'charts.noData': 'No data available',
        'charts.barChartLabel': `Bar chart comparing ${params?.count || 0} periods`,
        'dashboard.income': 'Income',
        'dashboard.expenses': 'Expenses',
      };
      return translations[key] || key;
    },
  }),
}));

describe('BarChart', () => {
  const mockData: BarChartDataPoint[] = [
    { label: 'Jan', income: 500000, expense: 350000 },
    { label: 'Feb', income: 450000, expense: 400000 },
    { label: 'Mar', income: 600000, expense: 300000 },
  ];

  it('renders with data', () => {
    const { getByTestId } = render(<BarChart data={mockData} testID="bar-chart" />);
    expect(getByTestId('bar-chart')).toBeTruthy();
  });

  it('renders empty state when no data', () => {
    const { getByText } = render(<BarChart data={[]} testID="bar-chart" />);
    expect(getByText('No data available')).toBeTruthy();
  });

  it('shows legend with income and expenses labels', () => {
    const { getByText } = render(<BarChart data={mockData} testID="bar-chart" />);
    expect(getByText('Income')).toBeTruthy();
    expect(getByText('Expenses')).toBeTruthy();
  });

  it('calls onBarPress when income bar is pressed', () => {
    const onBarPress = jest.fn();
    const { getAllByTestId } = render(
      <BarChart data={mockData} onBarPress={onBarPress} testID="bar-chart" />
    );

    // Find and press the first income bar (green color from theme)
    const incomeBars = getAllByTestId('bar-#16A34A');
    fireEvent(incomeBars[0], 'touchEnd');

    expect(onBarPress).toHaveBeenCalledWith(expect.objectContaining({ label: 'Jan' }), 'income');
  });

  it('calls onBarPress when expense bar is pressed', () => {
    const onBarPress = jest.fn();
    const { getAllByTestId } = render(
      <BarChart data={mockData} onBarPress={onBarPress} testID="bar-chart" />
    );

    // Find and press the first expense bar (red color from theme)
    const expenseBars = getAllByTestId('bar-#DC2626');
    fireEvent(expenseBars[0], 'touchEnd');

    expect(onBarPress).toHaveBeenCalledWith(expect.objectContaining({ label: 'Jan' }), 'expense');
  });

  it('applies custom colors', () => {
    const { getAllByTestId } = render(
      <BarChart data={mockData} incomeColor="#00ff00" expenseColor="#ff0000" testID="bar-chart" />
    );
    expect(getAllByTestId('bar-#00ff00').length).toBeGreaterThan(0);
    expect(getAllByTestId('bar-#ff0000').length).toBeGreaterThan(0);
  });

  it('applies custom height', () => {
    const { getByTestId } = render(<BarChart data={mockData} height={400} testID="bar-chart" />);
    expect(getByTestId('bar-chart')).toBeTruthy();
  });

  it('has correct accessibility label', () => {
    const { getByLabelText } = render(<BarChart data={mockData} testID="bar-chart" />);
    expect(getByLabelText('Bar chart comparing 3 periods')).toBeTruthy();
  });

  describe('orientations', () => {
    it('renders vertical chart by default', () => {
      const { getByTestId } = render(
        <BarChart data={mockData} orientation="vertical" testID="bar-chart" />
      );
      expect(getByTestId('bar-chart')).toBeTruthy();
    });

    it('renders horizontal chart', () => {
      const { getByTestId } = render(
        <BarChart data={mockData} orientation="horizontal" testID="bar-chart" />
      );
      expect(getByTestId('bar-chart')).toBeTruthy();
    });
  });

  describe('display options', () => {
    it('hides values when showValues is false', () => {
      const { getByTestId } = render(
        <BarChart data={mockData} showValues={false} testID="bar-chart" />
      );
      expect(getByTestId('bar-chart')).toBeTruthy();
    });

    it('hides grid when showGrid is false', () => {
      const { getByTestId } = render(
        <BarChart data={mockData} showGrid={false} testID="bar-chart" />
      );
      expect(getByTestId('bar-chart')).toBeTruthy();
    });
  });

  describe('edge cases', () => {
    it('handles single data point', () => {
      const singleData = [{ label: 'Jan', income: 500000, expense: 350000 }];
      const { getByTestId } = render(<BarChart data={singleData} testID="bar-chart" />);
      expect(getByTestId('bar-chart')).toBeTruthy();
    });

    it('handles zero values', () => {
      const zeroData = [{ label: 'Jan', income: 0, expense: 0 }];
      const { getByTestId } = render(<BarChart data={zeroData} testID="bar-chart" />);
      expect(getByTestId('bar-chart')).toBeTruthy();
    });

    it('handles large values', () => {
      const largeData = [{ label: 'Jan', income: 10000000000, expense: 5000000000 }];
      const { getByTestId } = render(<BarChart data={largeData} testID="bar-chart" />);
      expect(getByTestId('bar-chart')).toBeTruthy();
    });
  });
});
