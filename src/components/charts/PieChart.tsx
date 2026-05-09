/**
 * PieChart/DonutChart Component
 *
 * Displays a pie or donut chart for category breakdown visualization.
 * Supports accessibility, locale-aware formatting, and theming.
 *
 * **Validates: Requirements 22, 30**
 */

import React, { memo, useMemo, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
  TouchableOpacity,
  LayoutChangeEvent,
} from 'react-native';
import Svg, { G, Path, Circle } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { formatCurrencyLocale, formatPercentLocale, getCurrentLocale } from '../../i18n';

/**
 * Data point for the pie chart
 */
export interface PieChartDataPoint {
  /** Unique identifier for the segment */
  id: string;
  /** Label for the segment (e.g., category name) */
  label: string;
  /** Value for the segment (in cents) */
  value: number;
  /** Color for the segment */
  color: string;
}

/**
 * Props for the PieChart component
 */
export interface PieChartProps {
  /** Data points to display */
  data: PieChartDataPoint[];
  /** Whether to render as a donut chart (default: false) */
  donut?: boolean;
  /** Inner radius ratio for donut chart (0-1, default: 0.6) */
  innerRadiusRatio?: number;
  /** Whether to show the legend (default: true) */
  showLegend?: boolean;
  /** Legend position (default: 'bottom') */
  legendPosition?: 'bottom' | 'right';
  /** Center label for donut chart (e.g., total amount) */
  centerLabel?: string;
  /** Center sublabel for donut chart */
  centerSublabel?: string;
  /** Callback when a segment is pressed */
  onSegmentPress?: (segment: PieChartDataPoint) => void;
  /** Container style */
  style?: ViewStyle;
  /** Chart size (default: 200) */
  size?: number;
  /** Test ID for testing */
  testID?: string;
}

/**
 * Converts polar coordinates to cartesian
 */
function polarToCartesian(
  centerX: number,
  centerY: number,
  radius: number,
  angleInDegrees: number
): { x: number; y: number } {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

/**
 * Creates an SVG pie slice path
 */
function describePieSlice(
  x: number,
  y: number,
  outerRadius: number,
  innerRadius: number,
  startAngle: number,
  endAngle: number
): string {
  const outerStart = polarToCartesian(x, y, outerRadius, endAngle);
  const outerEnd = polarToCartesian(x, y, outerRadius, startAngle);
  const innerStart = polarToCartesian(x, y, innerRadius, endAngle);
  const innerEnd = polarToCartesian(x, y, innerRadius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

  if (innerRadius === 0) {
    // Pie slice (no hole)
    return [
      'M',
      outerStart.x,
      outerStart.y,
      'A',
      outerRadius,
      outerRadius,
      0,
      largeArcFlag,
      0,
      outerEnd.x,
      outerEnd.y,
      'L',
      x,
      y,
      'Z',
    ].join(' ');
  }

  // Donut slice
  return [
    'M',
    outerStart.x,
    outerStart.y,
    'A',
    outerRadius,
    outerRadius,
    0,
    largeArcFlag,
    0,
    outerEnd.x,
    outerEnd.y,
    'L',
    innerEnd.x,
    innerEnd.y,
    'A',
    innerRadius,
    innerRadius,
    0,
    largeArcFlag,
    1,
    innerStart.x,
    innerStart.y,
    'Z',
  ].join(' ');
}

/**
 * Legend item component
 */
interface LegendItemProps {
  item: PieChartDataPoint;
  percentage: number;
  onPress?: () => void;
  isSelected?: boolean;
}

const LegendItem = memo(function LegendItem({
  item,
  percentage,
  onPress,
  isSelected,
}: LegendItemProps): React.ReactElement {
  const locale = getCurrentLocale();
  const formattedValue = formatCurrencyLocale(item.value / 100, locale);
  const formattedPercent = formatPercentLocale(percentage / 100, locale, 1);

  return (
    <TouchableOpacity
      style={[styles.legendItem, isSelected && styles.legendItemSelected]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${item.label}: ${formattedValue}, ${formattedPercent}`}
      testID={`legend-item-${item.id}`}
    >
      <View style={[styles.legendColor, { backgroundColor: item.color }]} />
      <View style={styles.legendTextContainer}>
        <Text style={styles.legendLabel} numberOfLines={1}>
          {item.label}
        </Text>
        <Text style={styles.legendValue}>
          {formattedValue} ({formattedPercent})
        </Text>
      </View>
    </TouchableOpacity>
  );
});

/**
 * PieChart component
 */
function PieChartComponent({
  data,
  donut = false,
  innerRadiusRatio = 0.6,
  showLegend = true,
  legendPosition = 'bottom',
  centerLabel,
  centerSublabel,
  onSegmentPress,
  style,
  size = 200,
  testID,
}: PieChartProps): React.ReactElement {
  const { t } = useTranslation();
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null);
  const [containerWidth, setContainerWidth] = useState(size);

  // Calculate total and filter out zero/negative values
  const { total, validData } = useMemo(() => {
    const filtered = data.filter((d) => d.value > 0);
    const sum = filtered.reduce((acc, d) => acc + d.value, 0);
    return { total: sum, validData: filtered };
  }, [data]);

  // Calculate chart dimensions
  const chartSize = useMemo(() => {
    if (legendPosition === 'right' && showLegend) {
      return Math.min(size, containerWidth * 0.5);
    }
    return Math.min(size, containerWidth);
  }, [size, containerWidth, legendPosition, showLegend]);

  const center = chartSize / 2;
  const outerRadius = (chartSize / 2) * 0.9;
  const innerRadius = donut ? outerRadius * innerRadiusRatio : 0;

  // Calculate segments
  const segments = useMemo(() => {
    if (total === 0) return [];

    let currentAngle = 0;
    return validData.map((item) => {
      const percentage = (item.value / total) * 100;
      const angle = (item.value / total) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;
      currentAngle = endAngle;

      return {
        ...item,
        percentage,
        startAngle,
        endAngle,
        path: describePieSlice(center, center, outerRadius, innerRadius, startAngle, endAngle),
      };
    });
  }, [validData, total, center, outerRadius, innerRadius]);

  const handleSegmentPress = useCallback(
    (segment: PieChartDataPoint) => {
      setSelectedSegment((prev) => (prev === segment.id ? null : segment.id));
      onSegmentPress?.(segment);
    },
    [onSegmentPress]
  );

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    setContainerWidth(event.nativeEvent.layout.width);
  }, []);

  // Empty state
  if (validData.length === 0) {
    return (
      <View
        style={[styles.container, style]}
        testID={testID}
        accessibilityRole="none"
        accessibilityLabel={t('charts.noData')}
      >
        <View style={[styles.emptyChart, { width: chartSize, height: chartSize }]}>
          <Text style={styles.emptyText}>{t('charts.noData')}</Text>
        </View>
      </View>
    );
  }

  const renderChart = () => (
    <View
      style={styles.chartContainer}
      accessibilityRole="image"
      accessibilityLabel={t('charts.pieChartLabel', { count: validData.length })}
    >
      <Svg width={chartSize} height={chartSize} testID={`${testID}-svg`}>
        <G>
          {segments.map((segment) => (
            <Path
              key={segment.id}
              d={segment.path}
              fill={segment.color}
              opacity={selectedSegment && selectedSegment !== segment.id ? 0.5 : 1}
              onPress={() => handleSegmentPress(segment)}
            />
          ))}
          {donut && <Circle cx={center} cy={center} r={innerRadius - 2} fill="white" />}
        </G>
      </Svg>
      {donut && (centerLabel || centerSublabel) && (
        <View
          style={[
            styles.centerLabelContainer,
            { width: innerRadius * 1.4, height: innerRadius * 1.4 },
          ]}
        >
          {centerLabel && (
            <Text style={styles.centerLabel} numberOfLines={1}>
              {centerLabel}
            </Text>
          )}
          {centerSublabel && (
            <Text style={styles.centerSublabel} numberOfLines={1}>
              {centerSublabel}
            </Text>
          )}
        </View>
      )}
    </View>
  );

  const renderLegend = () => (
    <View
      style={[styles.legend, legendPosition === 'right' ? styles.legendRight : styles.legendBottom]}
      accessibilityRole="list"
      accessibilityLabel={t('charts.legendLabel')}
    >
      {segments.map((segment) => (
        <LegendItem
          key={segment.id}
          item={segment}
          percentage={segment.percentage}
          onPress={() => handleSegmentPress(segment)}
          isSelected={selectedSegment === segment.id}
        />
      ))}
    </View>
  );

  return (
    <View
      style={[styles.container, legendPosition === 'right' && styles.containerRow, style]}
      onLayout={handleLayout}
      testID={testID}
    >
      {renderChart()}
      {showLegend && renderLegend()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  containerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  chartContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerLabelContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    textAlign: 'center',
  },
  centerSublabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 2,
  },
  legend: {
    flexWrap: 'wrap',
  },
  legendBottom: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
    paddingHorizontal: 8,
  },
  legendRight: {
    flexDirection: 'column',
    marginLeft: 16,
    flex: 1,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginRight: 8,
    marginBottom: 4,
  },
  legendItemSelected: {
    backgroundColor: '#f3f4f6',
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendTextContainer: {
    flex: 1,
  },
  legendLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  legendValue: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 1,
  },
  emptyChart: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 100,
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
  },
});

/**
 * Memoized PieChart for performance optimization
 */
export const PieChart = memo(PieChartComponent);

/**
 * Convenience component for donut chart
 */
export const DonutChart = memo(function DonutChart(
  props: Omit<PieChartProps, 'donut'>
): React.ReactElement {
  return <PieChart {...props} donut />;
});

export default PieChart;
