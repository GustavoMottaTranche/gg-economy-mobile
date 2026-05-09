/**
 * LineChart Component
 *
 * Displays a line chart for monthly balance trends over time.
 * Supports multiple data series, touch interaction for value display,
 * accessibility, and locale-aware formatting.
 *
 * **Validates: Requirements 22, 30**
 */

import React, { memo, useMemo, useCallback, useState } from 'react';
import { View, Text, StyleSheet, ViewStyle, LayoutChangeEvent } from 'react-native';
import Svg, { G, Path, Circle, Line, Text as SvgText, Rect } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { formatCurrencyLocale, getCurrentLocale } from '../../i18n';

/**
 * Data point for a single point on the line
 */
export interface LineChartPoint {
  /** Label for the point (e.g., month name) */
  label: string;
  /** Value for the point (in cents) */
  value: number;
}

/**
 * Data series for the line chart
 */
export interface LineChartSeries {
  /** Unique identifier for the series */
  id: string;
  /** Display name for the series */
  name: string;
  /** Data points for the series */
  data: LineChartPoint[];
  /** Line color */
  color: string;
}

/**
 * Props for the LineChart component
 */
export interface LineChartProps {
  /** Data series to display */
  series: LineChartSeries[];
  /** Whether to show data points (default: true) */
  showPoints?: boolean;
  /** Whether to show grid lines (default: true) */
  showGrid?: boolean;
  /** Whether to show area fill under the line (default: false) */
  showArea?: boolean;
  /** Whether to show values on hover/touch (default: true) */
  showTooltip?: boolean;
  /** Whether to show the legend (default: true) */
  showLegend?: boolean;
  /** Callback when a point is pressed */
  onPointPress?: (series: LineChartSeries, point: LineChartPoint, index: number) => void;
  /** Container style */
  style?: ViewStyle;
  /** Chart height (default: 250) */
  height?: number;
  /** Test ID for testing */
  testID?: string;
}

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
 * Point radius
 */
const POINT_RADIUS = 5;
const POINT_RADIUS_SELECTED = 7;

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
 * Creates a smooth curve path through points
 */
function createLinePath(points: { x: number; y: number }[], smooth: boolean = true): string {
  if (points.length === 0) return '';
  const firstPoint = points[0];
  if (!firstPoint) return '';
  if (points.length === 1) return `M ${firstPoint.x} ${firstPoint.y}`;

  if (!smooth) {
    return points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ');
  }

  // Create smooth curve using quadratic bezier
  let path = `M ${firstPoint.x} ${firstPoint.y}`;

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]!;
    const curr = points[i]!;
    const midX = (prev.x + curr.x) / 2;
    path += ` Q ${prev.x} ${prev.y} ${midX} ${(prev.y + curr.y) / 2}`;
  }

  // Add final point
  const last = points[points.length - 1]!;
  path += ` T ${last.x} ${last.y}`;

  return path;
}

/**
 * Creates an area path (line path closed to bottom)
 */
function createAreaPath(points: { x: number; y: number }[], bottomY: number): string {
  if (points.length === 0) return '';

  const linePath = createLinePath(points, true);
  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];
  if (!firstPoint || !lastPoint) return linePath;

  const firstX = firstPoint.x;
  const lastX = lastPoint.x;

  return `${linePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
}

/**
 * Selected point info for tooltip
 */
interface SelectedPointInfo {
  series: LineChartSeries;
  point: LineChartPoint;
  index: number;
  x: number;
  y: number;
}

/**
 * LineChart component
 */
function LineChartComponent({
  series,
  showPoints = true,
  showGrid = true,
  showArea = false,
  showTooltip = true,
  showLegend = true,
  onPointPress,
  style,
  height = 250,
  testID,
}: LineChartProps): React.ReactElement {
  const { t } = useTranslation();
  const locale = getCurrentLocale();
  const [containerWidth, setContainerWidth] = useState(300);
  const [selectedPoint, setSelectedPoint] = useState<SelectedPointInfo | null>(null);

  // Calculate chart dimensions
  const chartWidth = containerWidth - MARGIN.left - MARGIN.right;
  const chartHeight = height - MARGIN.top - MARGIN.bottom;

  // Get all values for scaling
  const { minValue, maxValue } = useMemo(() => {
    const allValues: number[] = [];

    series.forEach((s) => {
      s.data.forEach((d) => {
        allValues.push(d.value);
      });
    });

    if (allValues.length === 0) {
      return { minValue: 0, maxValue: 100 };
    }

    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    const padding = (max - min) * 0.1 || 10;

    return {
      minValue: min - padding,
      maxValue: max + padding,
    };
  }, [series]);

  // Calculate point positions for each series
  const seriesWithPositions = useMemo(() => {
    return series.map((s) => {
      const points = s.data.map((d, i) => {
        const x = MARGIN.left + (i / Math.max(s.data.length - 1, 1)) * chartWidth;
        const y =
          MARGIN.top + chartHeight - ((d.value - minValue) / (maxValue - minValue)) * chartHeight;
        return { x, y, data: d };
      });
      return { ...s, points };
    });
  }, [series, chartWidth, chartHeight, minValue, maxValue]);

  // Generate Y-axis ticks
  const yAxisTicks = useMemo(() => {
    const tickCount = 5;
    const ticks: number[] = [];
    const range = maxValue - minValue;
    for (let i = 0; i <= tickCount; i++) {
      ticks.push(minValue + (range / tickCount) * i);
    }
    return ticks;
  }, [minValue, maxValue]);

  // Generate X-axis labels
  const xAxisLabels = useMemo(() => {
    const firstSeries = series[0];
    if (!firstSeries || firstSeries.data.length === 0) return [];

    const dataLength = firstSeries.data.length;
    const maxLabels = Math.min(dataLength, 6);
    const step = Math.ceil(dataLength / maxLabels);

    return firstSeries.data
      .filter((_, i) => i % step === 0 || i === dataLength - 1)
      .map((d, i) => {
        const originalIndex = i * step;
        const x = MARGIN.left + (originalIndex / Math.max(dataLength - 1, 1)) * chartWidth;
        return { label: d.label, x };
      });
  }, [series, chartWidth]);

  const handlePointPress = useCallback(
    (seriesData: LineChartSeries, point: LineChartPoint, index: number, x: number, y: number) => {
      setSelectedPoint((prev) => {
        if (prev?.series.id === seriesData.id && prev?.index === index) {
          return null;
        }
        return { series: seriesData, point, index, x, y };
      });
      onPointPress?.(seriesData, point, index);
    },
    [onPointPress]
  );

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    setContainerWidth(event.nativeEvent.layout.width);
  }, []);

  // Empty state
  if (series.length === 0 || series.every((s) => s.data.length === 0)) {
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

  return (
    <View
      style={[styles.container, { height: height + (showLegend ? 40 : 0) }, style]}
      onLayout={handleLayout}
      testID={testID}
      accessibilityRole="image"
      accessibilityLabel={t('charts.lineChartLabel', { count: series.length })}
    >
      <Svg width={containerWidth} height={height} testID={`${testID}-svg`}>
        <G>
          {/* Grid lines */}
          {showGrid &&
            yAxisTicks.map((tick, index) => {
              const y =
                MARGIN.top +
                chartHeight -
                ((tick - minValue) / (maxValue - minValue)) * chartHeight;
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
            const y =
              MARGIN.top + chartHeight - ((tick - minValue) / (maxValue - minValue)) * chartHeight;
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

          {/* X-axis labels */}
          {xAxisLabels.map((item, index) => (
            <SvgText
              key={`x-label-${index}`}
              x={item.x}
              y={MARGIN.top + chartHeight + 16}
              fontSize={10}
              fill="#374151"
              textAnchor="middle"
            >
              {item.label}
            </SvgText>
          ))}

          {/* Area fills */}
          {showArea &&
            seriesWithPositions.map((s) => (
              <Path
                key={`area-${s.id}`}
                d={createAreaPath(s.points, MARGIN.top + chartHeight)}
                fill={s.color}
                opacity={0.1}
              />
            ))}

          {/* Lines */}
          {seriesWithPositions.map((s) => (
            <Path
              key={`line-${s.id}`}
              d={createLinePath(s.points)}
              stroke={s.color}
              strokeWidth={2}
              fill="none"
            />
          ))}

          {/* Data points */}
          {showPoints &&
            seriesWithPositions.map((s) =>
              s.points.map((p, i) => {
                const isSelected = selectedPoint?.series.id === s.id && selectedPoint?.index === i;
                return (
                  <Circle
                    key={`point-${s.id}-${i}`}
                    cx={p.x}
                    cy={p.y}
                    r={isSelected ? POINT_RADIUS_SELECTED : POINT_RADIUS}
                    fill="white"
                    stroke={s.color}
                    strokeWidth={2}
                    onPress={() => handlePointPress(s, p.data, i, p.x, p.y)}
                  />
                );
              })
            )}

          {/* Tooltip */}
          {showTooltip && selectedPoint && (
            <G>
              {/* Vertical line */}
              <Line
                x1={selectedPoint.x}
                y1={MARGIN.top}
                x2={selectedPoint.x}
                y2={MARGIN.top + chartHeight}
                stroke={selectedPoint.series.color}
                strokeWidth={1}
                strokeDasharray="4,4"
              />
              {/* Tooltip background */}
              <Rect
                x={Math.min(selectedPoint.x - 50, containerWidth - MARGIN.right - 100)}
                y={Math.max(selectedPoint.y - 45, MARGIN.top)}
                width={100}
                height={36}
                fill="white"
                stroke="#e5e7eb"
                strokeWidth={1}
                rx={4}
              />
              {/* Tooltip text */}
              <SvgText
                x={Math.min(selectedPoint.x, containerWidth - MARGIN.right - 50)}
                y={Math.max(selectedPoint.y - 28, MARGIN.top + 17)}
                fontSize={11}
                fill="#374151"
                textAnchor="middle"
                fontWeight="600"
              >
                {selectedPoint.point.label}
              </SvgText>
              <SvgText
                x={Math.min(selectedPoint.x, containerWidth - MARGIN.right - 50)}
                y={Math.max(selectedPoint.y - 14, MARGIN.top + 31)}
                fontSize={11}
                fill={selectedPoint.series.color}
                textAnchor="middle"
              >
                {formatCurrencyLocale(selectedPoint.point.value / 100, locale)}
              </SvgText>
            </G>
          )}

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

      {/* Legend */}
      {showLegend && (
        <View style={styles.legend}>
          {series.map((s) => (
            <View key={s.id} style={styles.legendItem}>
              <View style={[styles.legendLine, { backgroundColor: s.color }]} />
              <Text style={styles.legendText}>{s.name}</Text>
            </View>
          ))}
        </View>
      )}
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
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendLine: {
    width: 16,
    height: 3,
    borderRadius: 1.5,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#374151',
  },
});

/**
 * Memoized LineChart for performance optimization
 */
export const LineChart = memo(LineChartComponent);

export default LineChart;
