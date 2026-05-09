/**
 * BarChart Component
 *
 * Displays a bar chart for income vs expenses comparison.
 * Supports horizontal and vertical orientations, multiple months,
 * accessibility, and locale-aware formatting.
 *
 * **Validates: Requirements 22, 30**
 */

import React, { memo, useMemo, useCallback, useState } from 'react';
import { View, Text, StyleSheet, ViewStyle, LayoutChangeEvent } from 'react-native';
import Svg, { G, Rect, Text as SvgText, Line } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { getCurrentLocale } from '../../i18n';

/**
 * Data point for the bar chart
 */
export interface BarChartDataPoint {
  /** Label for the bar (e.g., month name) */
  label: string;
  /** Income value (in cents) */
  income: number;
  /** Expense value (in cents, should be positive) */
  expense: number;
}

/**
 * Props for the BarChart component
 */
export interface BarChartProps {
  /** Data points to display */
  data: BarChartDataPoint[];
  /** Chart orientation (default: 'vertical') */
  orientation?: 'vertical' | 'horizontal';
  /** Whether to show values on bars (default: true) */
  showValues?: boolean;
  /** Whether to show grid lines (default: true) */
  showGrid?: boolean;
  /** Income bar color (default: '#16a34a') */
  incomeColor?: string;
  /** Expense bar color (default: '#dc2626') */
  expenseColor?: string;
  /** Callback when a bar is pressed */
  onBarPress?: (data: BarChartDataPoint, type: 'income' | 'expense') => void;
  /** Container style */
  style?: ViewStyle;
  /** Chart height (default: 250) */
  height?: number;
  /** Test ID for testing */
  testID?: string;
}

/**
 * Default colors
 */
const DEFAULT_INCOME_COLOR = '#16a34a';
const DEFAULT_EXPENSE_COLOR = '#dc2626';

/**
 * Chart margins
 */
const MARGIN = {
  top: 20,
  right: 20,
  bottom: 40,
  left: 60,
};

/**
 * Formats a large number for display on axis
 */
function formatAxisValue(value: number, _locale: string): string {
  const absValue = Math.abs(value);
  if (absValue >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (absValue >= 1000) {
    return `${(value / 1000).toFixed(0)}K`;
  }
  return value.toFixed(0);
}

/**
 * BarChart component
 */
function BarChartComponent({
  data,
  orientation = 'vertical',
  showValues = true,
  showGrid = true,
  incomeColor = DEFAULT_INCOME_COLOR,
  expenseColor = DEFAULT_EXPENSE_COLOR,
  onBarPress,
  style,
  height = 250,
  testID,
}: BarChartProps): React.ReactElement {
  const { t } = useTranslation();
  const locale = getCurrentLocale();
  const [containerWidth, setContainerWidth] = useState(300);
  const [selectedBar, setSelectedBar] = useState<string | null>(null);

  // Calculate chart dimensions
  const chartWidth = containerWidth - MARGIN.left - MARGIN.right;
  const chartHeight = height - MARGIN.top - MARGIN.bottom;

  // Calculate max value for scaling
  const maxValue = useMemo(() => {
    if (data.length === 0) return 100;
    const max = Math.max(...data.map((d) => Math.max(d.income, d.expense)));
    // Add 10% padding
    return max * 1.1 || 100;
  }, [data]);

  // Calculate bar dimensions
  const barGroupWidth = useMemo(() => {
    if (data.length === 0) return 0;
    return chartWidth / data.length;
  }, [chartWidth, data.length]);

  const barWidth = useMemo(() => {
    // Each group has 2 bars with some padding
    const groupPadding = barGroupWidth * 0.2;
    return (barGroupWidth - groupPadding) / 2;
  }, [barGroupWidth]);

  // Generate Y-axis ticks
  const yAxisTicks = useMemo(() => {
    const tickCount = 5;
    const ticks: number[] = [];
    for (let i = 0; i <= tickCount; i++) {
      ticks.push((maxValue / tickCount) * i);
    }
    return ticks;
  }, [maxValue]);

  const handleBarPress = useCallback(
    (dataPoint: BarChartDataPoint, type: 'income' | 'expense') => {
      const key = `${dataPoint.label}-${type}`;
      setSelectedBar((prev) => (prev === key ? null : key));
      onBarPress?.(dataPoint, type);
    },
    [onBarPress]
  );

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    setContainerWidth(event.nativeEvent.layout.width);
  }, []);

  // Empty state
  if (data.length === 0) {
    return (
      <View
        style={[styles.container, { height }, style]}
        testID={testID}
        accessibilityRole="none"
        accessibilityLabel={t('charts.noData')}
      >
        <View style={styles.emptyChart}>
          <Text style={styles.emptyText}>{t('charts.noData')}</Text>
        </View>
      </View>
    );
  }

  const renderVerticalChart = () => (
    <Svg width={containerWidth} height={height} testID={`${testID}-svg`}>
      <G>
        {/* Grid lines */}
        {showGrid &&
          yAxisTicks.map((tick, index) => {
            const y = MARGIN.top + chartHeight - (tick / maxValue) * chartHeight;
            return (
              <Line
                key={`grid-${index}`}
                x1={MARGIN.left}
                y1={y}
                x2={MARGIN.left + chartWidth}
                y2={y}
                stroke="#e5e7eb"
                strokeWidth={1}
              />
            );
          })}

        {/* Y-axis labels */}
        {yAxisTicks.map((tick, index) => {
          const y = MARGIN.top + chartHeight - (tick / maxValue) * chartHeight;
          return (
            <SvgText
              key={`y-label-${index}`}
              x={MARGIN.left - 8}
              y={y + 4}
              fontSize={10}
              fill="#6b7280"
              textAnchor="end"
            >
              {formatAxisValue(tick / 100, locale)}
            </SvgText>
          );
        })}

        {/* Bars */}
        {data.map((item, index) => {
          const groupX = MARGIN.left + index * barGroupWidth + barGroupWidth * 0.1;
          const incomeHeight = (item.income / maxValue) * chartHeight;
          const expenseHeight = (item.expense / maxValue) * chartHeight;
          const incomeY = MARGIN.top + chartHeight - incomeHeight;
          const expenseY = MARGIN.top + chartHeight - expenseHeight;
          const isIncomeSelected = selectedBar === `${item.label}-income`;
          const isExpenseSelected = selectedBar === `${item.label}-expense`;

          return (
            <G key={item.label}>
              {/* Income bar */}
              <Rect
                x={groupX}
                y={incomeY}
                width={barWidth}
                height={incomeHeight}
                fill={incomeColor}
                opacity={selectedBar && !isIncomeSelected ? 0.5 : 1}
                rx={4}
                onPress={() => handleBarPress(item, 'income')}
              />
              {/* Income value */}
              {showValues && item.income > 0 && (
                <SvgText
                  x={groupX + barWidth / 2}
                  y={incomeY - 4}
                  fontSize={9}
                  fill={incomeColor}
                  textAnchor="middle"
                >
                  {formatAxisValue(item.income / 100, locale)}
                </SvgText>
              )}

              {/* Expense bar */}
              <Rect
                x={groupX + barWidth + 4}
                y={expenseY}
                width={barWidth}
                height={expenseHeight}
                fill={expenseColor}
                opacity={selectedBar && !isExpenseSelected ? 0.5 : 1}
                rx={4}
                onPress={() => handleBarPress(item, 'expense')}
              />
              {/* Expense value */}
              {showValues && item.expense > 0 && (
                <SvgText
                  x={groupX + barWidth + 4 + barWidth / 2}
                  y={expenseY - 4}
                  fontSize={9}
                  fill={expenseColor}
                  textAnchor="middle"
                >
                  {formatAxisValue(item.expense / 100, locale)}
                </SvgText>
              )}

              {/* X-axis label */}
              <SvgText
                x={groupX + barWidth + 2}
                y={MARGIN.top + chartHeight + 16}
                fontSize={10}
                fill="#374151"
                textAnchor="middle"
              >
                {item.label}
              </SvgText>
            </G>
          );
        })}

        {/* Axes */}
        <Line
          x1={MARGIN.left}
          y1={MARGIN.top}
          x2={MARGIN.left}
          y2={MARGIN.top + chartHeight}
          stroke="#9ca3af"
          strokeWidth={1}
        />
        <Line
          x1={MARGIN.left}
          y1={MARGIN.top + chartHeight}
          x2={MARGIN.left + chartWidth}
          y2={MARGIN.top + chartHeight}
          stroke="#9ca3af"
          strokeWidth={1}
        />
      </G>
    </Svg>
  );

  const renderHorizontalChart = () => {
    const barGroupHeight = chartHeight / data.length;
    const horizontalBarHeight = (barGroupHeight - barGroupHeight * 0.2) / 2;

    return (
      <Svg width={containerWidth} height={height} testID={`${testID}-svg`}>
        <G>
          {/* Grid lines */}
          {showGrid &&
            yAxisTicks.map((tick, index) => {
              const x = MARGIN.left + (tick / maxValue) * chartWidth;
              return (
                <Line
                  key={`grid-${index}`}
                  x1={x}
                  y1={MARGIN.top}
                  x2={x}
                  y2={MARGIN.top + chartHeight}
                  stroke="#e5e7eb"
                  strokeWidth={1}
                />
              );
            })}

          {/* X-axis labels */}
          {yAxisTicks.map((tick, index) => {
            const x = MARGIN.left + (tick / maxValue) * chartWidth;
            return (
              <SvgText
                key={`x-label-${index}`}
                x={x}
                y={MARGIN.top + chartHeight + 16}
                fontSize={10}
                fill="#6b7280"
                textAnchor="middle"
              >
                {formatAxisValue(tick / 100, locale)}
              </SvgText>
            );
          })}

          {/* Bars */}
          {data.map((item, index) => {
            const groupY = MARGIN.top + index * barGroupHeight + barGroupHeight * 0.1;
            const incomeWidth = (item.income / maxValue) * chartWidth;
            const expenseWidth = (item.expense / maxValue) * chartWidth;
            const isIncomeSelected = selectedBar === `${item.label}-income`;
            const isExpenseSelected = selectedBar === `${item.label}-expense`;

            return (
              <G key={item.label}>
                {/* Y-axis label */}
                <SvgText
                  x={MARGIN.left - 8}
                  y={groupY + barGroupHeight / 2}
                  fontSize={10}
                  fill="#374151"
                  textAnchor="end"
                >
                  {item.label}
                </SvgText>

                {/* Income bar */}
                <Rect
                  x={MARGIN.left}
                  y={groupY}
                  width={incomeWidth}
                  height={horizontalBarHeight}
                  fill={incomeColor}
                  opacity={selectedBar && !isIncomeSelected ? 0.5 : 1}
                  rx={4}
                  onPress={() => handleBarPress(item, 'income')}
                />
                {/* Income value */}
                {showValues && item.income > 0 && (
                  <SvgText
                    x={MARGIN.left + incomeWidth + 4}
                    y={groupY + horizontalBarHeight / 2 + 3}
                    fontSize={9}
                    fill={incomeColor}
                    textAnchor="start"
                  >
                    {formatAxisValue(item.income / 100, locale)}
                  </SvgText>
                )}

                {/* Expense bar */}
                <Rect
                  x={MARGIN.left}
                  y={groupY + horizontalBarHeight + 4}
                  width={expenseWidth}
                  height={horizontalBarHeight}
                  fill={expenseColor}
                  opacity={selectedBar && !isExpenseSelected ? 0.5 : 1}
                  rx={4}
                  onPress={() => handleBarPress(item, 'expense')}
                />
                {/* Expense value */}
                {showValues && item.expense > 0 && (
                  <SvgText
                    x={MARGIN.left + expenseWidth + 4}
                    y={groupY + horizontalBarHeight + 4 + horizontalBarHeight / 2 + 3}
                    fontSize={9}
                    fill={expenseColor}
                    textAnchor="start"
                  >
                    {formatAxisValue(item.expense / 100, locale)}
                  </SvgText>
                )}
              </G>
            );
          })}

          {/* Axes */}
          <Line
            x1={MARGIN.left}
            y1={MARGIN.top}
            x2={MARGIN.left}
            y2={MARGIN.top + chartHeight}
            stroke="#9ca3af"
            strokeWidth={1}
          />
          <Line
            x1={MARGIN.left}
            y1={MARGIN.top + chartHeight}
            x2={MARGIN.left + chartWidth}
            y2={MARGIN.top + chartHeight}
            stroke="#9ca3af"
            strokeWidth={1}
          />
        </G>
      </Svg>
    );
  };

  return (
    <View
      style={[styles.container, { height }, style]}
      onLayout={handleLayout}
      testID={testID}
      accessibilityRole="image"
      accessibilityLabel={t('charts.barChartLabel', { count: data.length })}
    >
      {orientation === 'vertical' ? renderVerticalChart() : renderHorizontalChart()}

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: incomeColor }]} />
          <Text style={styles.legendText}>{t('dashboard.income')}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: expenseColor }]} />
          <Text style={styles.legendText}>{t('dashboard.expenses')}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  emptyChart: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 2,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#374151',
  },
});

/**
 * Memoized BarChart for performance optimization
 */
export const BarChart = memo(BarChartComponent);

export default BarChart;
