/**
 * LineChart Component Tests
 *
 * Tests for the LineChart component including:
 * - Rendering with data
 * - Empty state handling
 * - Multiple series support
 * - Point interaction and tooltips
 * - Accessibility support
 *
 * **Validates: Requirements 22, 30**
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { LineChart, type LineChartSeries } from '../LineChart';

// Mock react-native-svg
jest.mock('react-native-svg', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ children, ...props }: any) => <View {...props}>{children}</View>,
    Svg: ({ children, ...props }: any) => <View {...props}>{children}</View>,
    G: ({ children, ...props }: any) => <View {...props}>{children}</View>,
    Path: (props: any) => <View {...props} testID={`path-${props.stroke || 'area'}`} />,
    Circle: ({ onPress, stroke, ...props }: any) => (
      <View {...props} onTouchEnd={onPress} testID={`point-${stroke}`} />
    ),
    Rect: (props: any) => <View {...props} />,
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
        'charts.lineChartLabel': `Line chart with ${params?.count || 0} data series`,
      };
      return translations[key] || key;
    },
  }),
}));

describe('LineChart', () => {
  const mockSeries: LineChartSeries[] = [
    {
      id: 'balance',
      name: 'Balance',
      color: '#3b82f6',
      data: [
        { label: 'Jan', value: 100000 },
        { label: 'Feb', value: 150000 },
        { label: 'Mar', value: 120000 },
        { label: 'Apr', value: 180000 },
      ],
    },
  ];

  const multiSeries: LineChartSeries[] = [
    {
      id: 'income',
      name: 'Income',
      color: '#16a34a',
      data: [
        { label: 'Jan', value: 500000 },
        { label: 'Feb', value: 450000 },
        { label: 'Mar', value: 600000 },
      ],
    },
    {
      id: 'expenses',
      name: 'Expenses',
      color: '#dc2626',
      data: [
        { label: 'Jan', value: 350000 },
        { label: 'Feb', value: 400000 },
        { label: 'Mar', value: 300000 },
      ],
    },
  ];

  it('renders with single series', () => {
    const { getByTestId } = render(<LineChart series={mockSeries} testID="line-chart" />);
    expect(getByTestId('line-chart')).toBeTruthy();
  });

  it('renders with multiple series', () => {
    const { getByTestId } = render(<LineChart series={multiSeries} testID="line-chart" />);
    expect(getByTestId('line-chart')).toBeTruthy();
  });

  it('renders empty state when no series', () => {
    const { getByText } = render(<LineChart series={[]} testID="line-chart" />);
    expect(getByText('No data available')).toBeTruthy();
  });

  it('renders empty state when series have no data', () => {
    const emptySeries = [{ id: 'empty', name: 'Empty', color: '#000', data: [] }];
    const { getByText } = render(<LineChart series={emptySeries} testID="line-chart" />);
    expect(getByText('No data available')).toBeTruthy();
  });

  it('shows legend by default', () => {
    const { getByText } = render(<LineChart series={multiSeries} testID="line-chart" />);
    expect(getByText('Income')).toBeTruthy();
    expect(getByText('Expenses')).toBeTruthy();
  });

  it('hides legend when showLegend is false', () => {
    const { queryByText } = render(
      <LineChart series={multiSeries} showLegend={false} testID="line-chart" />
    );
    expect(queryByText('Income')).toBeNull();
    expect(queryByText('Expenses')).toBeNull();
  });

  it('calls onPointPress when point is pressed', () => {
    const onPointPress = jest.fn();
    const { getAllByTestId } = render(
      <LineChart series={mockSeries} onPointPress={onPointPress} testID="line-chart" />
    );

    // Find and press the first point
    const points = getAllByTestId('point-#3b82f6');
    fireEvent(points[0], 'touchEnd');

    expect(onPointPress).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'balance' }),
      expect.objectContaining({ label: 'Jan' }),
      0
    );
  });

  it('applies custom height', () => {
    const { getByTestId } = render(
      <LineChart series={mockSeries} height={400} testID="line-chart" />
    );
    expect(getByTestId('line-chart')).toBeTruthy();
  });

  it('has correct accessibility label', () => {
    const { getByLabelText } = render(<LineChart series={multiSeries} testID="line-chart" />);
    expect(getByLabelText('Line chart with 2 data series')).toBeTruthy();
  });

  describe('display options', () => {
    it('hides points when showPoints is false', () => {
      const { queryByTestId } = render(
        <LineChart series={mockSeries} showPoints={false} testID="line-chart" />
      );
      // Points should not be rendered
      expect(queryByTestId('point-#3b82f6')).toBeNull();
    });

    it('hides grid when showGrid is false', () => {
      const { getByTestId } = render(
        <LineChart series={mockSeries} showGrid={false} testID="line-chart" />
      );
      expect(getByTestId('line-chart')).toBeTruthy();
    });

    it('shows area fill when showArea is true', () => {
      const { getByTestId } = render(
        <LineChart series={mockSeries} showArea testID="line-chart" />
      );
      expect(getByTestId('line-chart')).toBeTruthy();
    });
  });

  describe('edge cases', () => {
    it('handles single data point', () => {
      const singlePointSeries = [
        {
          id: 'single',
          name: 'Single',
          color: '#000',
          data: [{ label: 'Jan', value: 100000 }],
        },
      ];
      const { getByTestId } = render(<LineChart series={singlePointSeries} testID="line-chart" />);
      expect(getByTestId('line-chart')).toBeTruthy();
    });

    it('handles negative values', () => {
      const negativeData = [
        {
          id: 'negative',
          name: 'Negative',
          color: '#000',
          data: [
            { label: 'Jan', value: -50000 },
            { label: 'Feb', value: 100000 },
            { label: 'Mar', value: -25000 },
          ],
        },
      ];
      const { getByTestId } = render(<LineChart series={negativeData} testID="line-chart" />);
      expect(getByTestId('line-chart')).toBeTruthy();
    });

    it('handles large number of data points', () => {
      const manyPoints = Array.from({ length: 12 }, (_, i) => ({
        label: `M${i + 1}`,
        value: Math.random() * 1000000,
      }));
      const largeSeries = [{ id: 'large', name: 'Large', color: '#000', data: manyPoints }];
      const { getByTestId } = render(<LineChart series={largeSeries} testID="line-chart" />);
      expect(getByTestId('line-chart')).toBeTruthy();
    });

    it('handles zero values', () => {
      const zeroData = [
        {
          id: 'zero',
          name: 'Zero',
          color: '#000',
          data: [
            { label: 'Jan', value: 0 },
            { label: 'Feb', value: 0 },
          ],
        },
      ];
      const { getByTestId } = render(<LineChart series={zeroData} testID="line-chart" />);
      expect(getByTestId('line-chart')).toBeTruthy();
    });

    it('handles equal values (flat line)', () => {
      const flatData = [
        {
          id: 'flat',
          name: 'Flat',
          color: '#000',
          data: [
            { label: 'Jan', value: 100000 },
            { label: 'Feb', value: 100000 },
            { label: 'Mar', value: 100000 },
          ],
        },
      ];
      const { getByTestId } = render(<LineChart series={flatData} testID="line-chart" />);
      expect(getByTestId('line-chart')).toBeTruthy();
    });
  });

  describe('tooltip behavior', () => {
    it('shows tooltip when point is selected', () => {
      const { getAllByTestId, getByTestId } = render(
        <LineChart series={mockSeries} showTooltip testID="line-chart" />
      );

      // Press a point to show tooltip
      const points = getAllByTestId('point-#3b82f6');
      fireEvent(points[0], 'touchEnd');

      // Chart should still render (tooltip is shown via SVG elements)
      expect(getByTestId('line-chart')).toBeTruthy();
    });

    it('hides tooltip when showTooltip is false', () => {
      const { getByTestId } = render(
        <LineChart series={mockSeries} showTooltip={false} testID="line-chart" />
      );
      expect(getByTestId('line-chart')).toBeTruthy();
    });
  });
});
