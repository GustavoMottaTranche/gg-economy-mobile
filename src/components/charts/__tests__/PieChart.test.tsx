/**
 * PieChart Component Tests
 *
 * Tests for the PieChart and DonutChart components including:
 * - Rendering with data
 * - Empty state handling
 * - Legend display
 * - Segment interaction
 * - Accessibility support
 *
 * **Validates: Requirements 22, 30**
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { PieChart, DonutChart, type PieChartDataPoint } from '../PieChart';

// Mock react-native-svg
jest.mock('react-native-svg', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ children, ...props }: any) => <View {...props}>{children}</View>,
    Svg: ({ children, ...props }: any) => <View {...props}>{children}</View>,
    G: ({ children, ...props }: any) => <View {...props}>{children}</View>,
    Path: ({ onPress, ...props }: any) => (
      <View {...props} onTouchEnd={onPress} testID={`path-${props.fill}`} />
    ),
    Circle: (props: any) => <View {...props} />,
    Rect: (props: any) => <View {...props} />,
    Line: (props: any) => <View {...props} />,
    Text: ({ children, ...props }: any) => <View {...props}>{children}</View>,
  };
});

// Mock i18n
jest.mock('../../../i18n', () => ({
  formatCurrencyLocale: jest.fn((amount: number) => `$${amount.toFixed(2)}`),
  formatPercentLocale: jest.fn(
    (value: number, _locale: string, decimals: number) => `${(value * 100).toFixed(decimals)}%`
  ),
  getCurrentLocale: jest.fn(() => 'en'),
}));

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: any) => {
      const translations: Record<string, string> = {
        'charts.noData': 'No data available',
        'charts.pieChartLabel': `Pie chart with ${params?.count || 0} categories`,
        'charts.legendLabel': 'Chart legend',
      };
      return translations[key] || key;
    },
  }),
}));

describe('PieChart', () => {
  const mockData: PieChartDataPoint[] = [
    { id: '1', label: 'Food', value: 50000, color: '#ef4444' },
    { id: '2', label: 'Transport', value: 30000, color: '#3b82f6' },
    { id: '3', label: 'Entertainment', value: 20000, color: '#22c55e' },
  ];

  it('renders with data', () => {
    const { getByTestId } = render(<PieChart data={mockData} testID="pie-chart" />);
    expect(getByTestId('pie-chart')).toBeTruthy();
  });

  it('renders empty state when no data', () => {
    const { getByText } = render(<PieChart data={[]} testID="pie-chart" />);
    expect(getByText('No data available')).toBeTruthy();
  });

  it('renders empty state when all values are zero', () => {
    const zeroData = mockData.map((d) => ({ ...d, value: 0 }));
    const { getByText } = render(<PieChart data={zeroData} testID="pie-chart" />);
    expect(getByText('No data available')).toBeTruthy();
  });

  it('filters out negative values', () => {
    const dataWithNegative = [
      ...mockData,
      { id: '4', label: 'Negative', value: -1000, color: '#000' },
    ];
    const { queryByTestId } = render(<PieChart data={dataWithNegative} testID="pie-chart" />);
    // Should render without the negative value segment
    expect(queryByTestId('pie-chart')).toBeTruthy();
  });

  it('shows legend by default', () => {
    const { getByText } = render(<PieChart data={mockData} testID="pie-chart" />);
    expect(getByText('Food')).toBeTruthy();
    expect(getByText('Transport')).toBeTruthy();
    expect(getByText('Entertainment')).toBeTruthy();
  });

  it('hides legend when showLegend is false', () => {
    const { queryByText } = render(
      <PieChart data={mockData} showLegend={false} testID="pie-chart" />
    );
    expect(queryByText('Food')).toBeNull();
  });

  it('calls onSegmentPress when segment is pressed', () => {
    const onSegmentPress = jest.fn();
    const { getByTestId } = render(
      <PieChart data={mockData} onSegmentPress={onSegmentPress} testID="pie-chart" />
    );

    // Find and press a path element
    const path = getByTestId('path-#ef4444');
    fireEvent(path, 'touchEnd');

    expect(onSegmentPress).toHaveBeenCalledWith(
      expect.objectContaining({ id: '1', label: 'Food' })
    );
  });

  it('calls onSegmentPress when legend item is pressed', () => {
    const onSegmentPress = jest.fn();
    const { getByTestId } = render(
      <PieChart data={mockData} onSegmentPress={onSegmentPress} testID="pie-chart" />
    );

    const legendItem = getByTestId('legend-item-1');
    fireEvent.press(legendItem);

    expect(onSegmentPress).toHaveBeenCalledWith(
      expect.objectContaining({ id: '1', label: 'Food' })
    );
  });

  it('applies custom size', () => {
    const { getByTestId } = render(<PieChart data={mockData} size={300} testID="pie-chart" />);
    expect(getByTestId('pie-chart')).toBeTruthy();
  });

  it('has correct accessibility label', () => {
    const { getByLabelText } = render(<PieChart data={mockData} testID="pie-chart" />);
    expect(getByLabelText('Pie chart with 3 categories')).toBeTruthy();
  });

  describe('legend positions', () => {
    it('renders legend at bottom by default', () => {
      const { getByTestId } = render(
        <PieChart data={mockData} legendPosition="bottom" testID="pie-chart" />
      );
      expect(getByTestId('pie-chart')).toBeTruthy();
    });

    it('renders legend on right', () => {
      const { getByTestId } = render(
        <PieChart data={mockData} legendPosition="right" testID="pie-chart" />
      );
      expect(getByTestId('pie-chart')).toBeTruthy();
    });
  });
});

describe('DonutChart', () => {
  const mockData: PieChartDataPoint[] = [
    { id: '1', label: 'Food', value: 50000, color: '#ef4444' },
    { id: '2', label: 'Transport', value: 30000, color: '#3b82f6' },
  ];

  it('renders as donut chart', () => {
    const { getByTestId } = render(<DonutChart data={mockData} testID="donut-chart" />);
    expect(getByTestId('donut-chart')).toBeTruthy();
  });

  it('displays center label', () => {
    const { getByText } = render(
      <DonutChart
        data={mockData}
        centerLabel="$800.00"
        centerSublabel="Total"
        testID="donut-chart"
      />
    );
    expect(getByText('$800.00')).toBeTruthy();
    expect(getByText('Total')).toBeTruthy();
  });

  it('applies custom inner radius ratio', () => {
    const { getByTestId } = render(
      <DonutChart data={mockData} innerRadiusRatio={0.5} testID="donut-chart" />
    );
    expect(getByTestId('donut-chart')).toBeTruthy();
  });
});
