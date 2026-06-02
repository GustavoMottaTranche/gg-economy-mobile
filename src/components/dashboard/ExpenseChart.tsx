/**
 * ExpenseChart Component
 *
 * Displays a donut chart for expense visualization with two modes:
 * - Fixed-vs-variable comparison (filter = 'all'): two segments showing totals
 * - Per-group breakdown (filter = 'fixed' or 'variable'): individual category segments
 *
 * Uses roundPercentages to ensure displayed percentages always sum to 100.
 * Animates transitions between visualization modes (200-400ms).
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 4.2, 4.3, 4.4, 4.7, 4.8**
 */

import React, { memo, useMemo, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, ViewStyle } from 'react-native';
import Svg, { G, Path, Circle } from 'react-native-svg';
import { useThemeColors } from '../../hooks/useThemeColors';
import { spacing } from '../../constants/theme';
import { formatCurrencyLocale, getCurrentLocale } from '../../i18n';
import { roundPercentages } from '../../utils/roundPercentages';
import type { ChartFilterOption } from './ChartFilter';
import type { CategoryBreakdownItem } from '../../hooks/useDashboardData';

/**
 * Props for the ExpenseChart component
 */
export interface ExpenseChartProps {
  /** Total fixed expenses (in cents) */
  fixedTotal: number;
  /** Total variable expenses (in cents) */
  variableTotal: number;
  /** Fixed category breakdown items */
  fixedCategories: CategoryBreakdownItem[];
  /** Variable category breakdown items */
  variableCategories: CategoryBreakdownItem[];
  /** Current filter selection */
  filter: ChartFilterOption;
  /** Optional container style */
  style?: ViewStyle;
  /** Test ID for testing */
  testID?: string;
}

/**
 * Chart segment data
 */
interface ChartSegment {
  id: string;
  label: string;
  value: number;
  color: string;
  percentage: number;
}

/** Chart size constant */
const CHART_SIZE = 200;
/** Inner radius ratio for donut */
const INNER_RADIUS_RATIO = 0.6;
/** Animation duration in ms */
const ANIMATION_DURATION = 300;

/** Default colors for fixed/variable comparison mode */
const FIXED_COLOR = '#3B82F6'; // Blue
const VARIABLE_COLOR = '#F59E0B'; // Amber

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
 * Creates an SVG donut slice path
 */
function describeDonutSlice(
  x: number,
  y: number,
  outerRadius: number,
  innerRadius: number,
  startAngle: number,
  endAngle: number
): string {
  // Handle full circle case (360°) - SVG arcs can't draw a full circle
  // because start and end points would be identical
  const angleDiff = endAngle - startAngle;
  if (angleDiff >= 359.99) {
    // Draw two half-circles instead
    const path1 = describeDonutSlice(x, y, outerRadius, innerRadius, startAngle, startAngle + 180);
    const path2 = describeDonutSlice(
      x,
      y,
      outerRadius,
      innerRadius,
      startAngle + 180,
      startAngle + 359.99
    );
    return path1 + ' ' + path2;
  }

  const outerStart = polarToCartesian(x, y, outerRadius, endAngle);
  const outerEnd = polarToCartesian(x, y, outerRadius, startAngle);
  const innerStart = polarToCartesian(x, y, innerRadius, endAngle);
  const innerEnd = polarToCartesian(x, y, innerRadius, startAngle);
  const largeArcFlag = angleDiff <= 180 ? '0' : '1';

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
 * Builds chart segments for the "all" filter (fixed vs variable comparison)
 */
function buildComparisonSegments(fixedTotal: number, variableTotal: number): ChartSegment[] {
  const total = fixedTotal + variableTotal;
  if (total === 0) return [];

  const values = [fixedTotal, variableTotal].filter((v) => v > 0);
  const percentages = roundPercentages(values, total);

  const segments: ChartSegment[] = [];
  let pIdx = 0;

  if (fixedTotal > 0) {
    segments.push({
      id: 'fixed',
      label: 'Fixo',
      value: fixedTotal,
      color: FIXED_COLOR,
      percentage: percentages[pIdx++] ?? 0,
    });
  }

  if (variableTotal > 0) {
    segments.push({
      id: 'variable',
      label: 'Variável',
      value: variableTotal,
      color: VARIABLE_COLOR,
      percentage: percentages[pIdx] ?? 0,
    });
  }

  return segments;
}

/**
 * Builds chart segments for a specific group breakdown (fixed or variable)
 */
function buildGroupSegments(categories: CategoryBreakdownItem[]): ChartSegment[] {
  const validCategories = categories.filter((c) => c.total > 0);
  if (validCategories.length === 0) return [];

  const total = validCategories.reduce((sum, c) => sum + c.total, 0);
  const values = validCategories.map((c) => c.total);
  const percentages = roundPercentages(values, total);

  return validCategories.map((cat, i) => ({
    id: cat.categoryId ?? `cat-${i}`,
    label: cat.categoryName,
    value: cat.total,
    color: cat.categoryColor,
    percentage: percentages[i] ?? 0,
  }));
}

/**
 * ExpenseChart component
 */
function ExpenseChartComponent({
  fixedTotal,
  variableTotal,
  fixedCategories,
  variableCategories,
  filter,
  style,
  testID,
}: ExpenseChartProps): React.ReactElement {
  const colors = useThemeColors();
  const locale = getCurrentLocale();
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const prevFilterRef = useRef<ChartFilterOption>(filter);

  // Animate transition when filter changes
  useEffect(() => {
    if (prevFilterRef.current !== filter) {
      prevFilterRef.current = filter;
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }).start();
    }
  }, [filter, fadeAnim]);

  // Compute segments based on filter
  const segments = useMemo((): ChartSegment[] => {
    switch (filter) {
      case 'all':
        return buildComparisonSegments(fixedTotal, variableTotal);
      case 'fixed':
        return buildGroupSegments(fixedCategories);
      case 'variable':
        return buildGroupSegments(variableCategories);
      default:
        return [];
    }
  }, [filter, fixedTotal, variableTotal, fixedCategories, variableCategories]);

  // Chart geometry
  const center = CHART_SIZE / 2;
  const outerRadius = (CHART_SIZE / 2) * 0.9;
  const innerRadius = outerRadius * INNER_RADIUS_RATIO;

  // Compute SVG paths for segments
  const segmentPaths = useMemo(() => {
    if (segments.length === 0) return [];

    const total = segments.reduce((sum, s) => sum + s.value, 0);
    let currentAngle = 0;

    return segments.map((segment) => {
      const angle = (segment.value / total) * 360;
      const startAngle = currentAngle;
      // Ensure we don't exceed 360 for the last segment
      const endAngle = currentAngle + angle;
      currentAngle = endAngle;

      return {
        ...segment,
        path: describeDonutSlice(center, center, outerRadius, innerRadius, startAngle, endAngle),
      };
    });
  }, [segments, center, outerRadius, innerRadius]);

  // Determine if we should show empty state
  const isEmpty = segments.length === 0;

  // Empty state
  if (isEmpty) {
    return (
      <View style={[styles.container, style]} testID={testID}>
        <View
          style={[
            styles.emptyChart,
            {
              width: CHART_SIZE,
              height: CHART_SIZE,
              backgroundColor: colors.background.secondary,
            },
          ]}
          testID={testID ? `${testID}-empty` : undefined}
        >
          <Text style={[styles.emptyText, { color: colors.text.tertiary }]}>
            Sem dados para exibição
          </Text>
        </View>
      </View>
    );
  }

  // Compute total for center label
  const displayTotal = segments.reduce((sum, s) => sum + s.value, 0);
  const formattedTotal = formatCurrencyLocale(displayTotal / 100, locale);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }, style]} testID={testID}>
      {/* Donut Chart */}
      <View style={styles.chartContainer}>
        <Svg width={CHART_SIZE} height={CHART_SIZE} testID={testID ? `${testID}-svg` : undefined}>
          <G>
            {segmentPaths.map((segment) => (
              <Path key={segment.id} d={segment.path} fill={segment.color} />
            ))}
            {/* Inner circle for donut hole */}
            <Circle cx={center} cy={center} r={innerRadius - 2} fill={colors.surface.card} />
          </G>
        </Svg>
        {/* Center label */}
        <View
          style={[
            styles.centerLabelContainer,
            { width: innerRadius * 1.4, height: innerRadius * 1.4 },
          ]}
        >
          <Text
            style={[styles.centerLabel, { color: colors.text.primary }]}
            numberOfLines={1}
            testID={testID ? `${testID}-total` : undefined}
          >
            {formattedTotal}
          </Text>
          <Text style={[styles.centerSublabel, { color: colors.text.secondary }]}>Total</Text>
        </View>
      </View>

      {/* Legend */}
      <View
        style={styles.legend}
        accessibilityRole="list"
        testID={testID ? `${testID}-legend` : undefined}
      >
        {segments.map((segment) => (
          <View
            key={segment.id}
            style={styles.legendItem}
            accessibilityRole="text"
            accessibilityLabel={`${segment.label}: ${formatCurrencyLocale(segment.value / 100, locale)}, ${segment.percentage}%`}
            testID={testID ? `${testID}-legend-${segment.id}` : undefined}
          >
            <View style={[styles.legendColor, { backgroundColor: segment.color }]} />
            <View style={styles.legendTextContainer}>
              <Text style={[styles.legendLabel, { color: colors.text.primary }]} numberOfLines={1}>
                {segment.label}
              </Text>
              <Text style={[styles.legendValue, { color: colors.text.secondary }]}>
                {formatCurrencyLocale(segment.value / 100, locale)} ({segment.percentage}%)
              </Text>
            </View>
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  chartContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: CHART_SIZE,
    height: CHART_SIZE,
  },
  centerLabelContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerLabel: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  centerSublabel: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 2,
  },
  emptyChart: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 100,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: spacing.base,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: spacing.base,
    paddingHorizontal: spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    marginRight: spacing.sm,
    marginBottom: spacing.xs,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: spacing.sm,
  },
  legendTextContainer: {
    flexShrink: 1,
  },
  legendLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  legendValue: {
    fontSize: 12,
    marginTop: 1,
  },
});

/**
 * Memoized ExpenseChart for performance optimization
 */
export const ExpenseChart = memo(ExpenseChartComponent);

export default ExpenseChart;
