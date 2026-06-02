/**
 * CategoryBreakdown Component
 *
 * Displays expense breakdown by category using a donut chart.
 * Supports tapping on categories to navigate to filtered transactions.
 *
 * **Validates: Requirements 21, 22, 30**
 */

import React, { memo, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import { DonutChart, type PieChartDataPoint } from '../charts/PieChart';
import { formatCurrencyLocale, getCurrentLocale } from '../../i18n';
import type { CategoryBreakdownItem } from '../../hooks/useDashboardData';
import { useThemeColors } from '../../hooks/useThemeColors';
import { spacing, borderRadius } from '../../constants/theme';

/**
 * Props for the CategoryBreakdown component
 */
export interface CategoryBreakdownProps {
  /** Expense breakdown data by category */
  data: CategoryBreakdownItem[];
  /** Total expenses in cents */
  totalExpenses: number;
  /** Callback when a category is pressed */
  onCategoryPress?: (categoryId: string | null, categoryName: string) => void;
  /** Container style */
  style?: ViewStyle;
  /** Test ID for testing */
  testID?: string;
}

/**
 * CategoryBreakdown component
 *
 * @example
 * ```tsx
 * <CategoryBreakdown
 *   data={expenseBreakdown}
 *   totalExpenses={350000}
 *   onCategoryPress={(id, name) => navigateToTransactions(id)}
 * />
 * ```
 */
function CategoryBreakdownComponent({
  data,
  totalExpenses,
  onCategoryPress,
  style,
  testID,
}: CategoryBreakdownProps): React.ReactElement {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const locale = getCurrentLocale();

  // Transform data for the DonutChart
  const chartData = useMemo<PieChartDataPoint[]>(() => {
    return data.map((item) => ({
      id: item.categoryId ?? 'uncategorized',
      label: item.categoryName,
      value: item.total,
      color: item.categoryColor,
    }));
  }, [data]);

  // Format total for center label
  const centerLabel = useMemo(() => {
    return formatCurrencyLocale(totalExpenses / 100, locale);
  }, [totalExpenses, locale]);

  // Handle segment press
  const handleSegmentPress = useCallback(
    (segment: PieChartDataPoint) => {
      const categoryId = segment.id === 'uncategorized' ? null : segment.id;
      onCategoryPress?.(categoryId, segment.label);
    },
    [onCategoryPress]
  );

  // Empty state
  if (data.length === 0 || totalExpenses === 0) {
    return (
      <View
        style={[styles.container, { backgroundColor: colors.surface.card }, style]}
        testID={testID}
      >
        <Text style={[styles.title, { color: colors.text.primary }]}>
          {t('dashboard.categoryBreakdown')}
        </Text>
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: colors.text.tertiary }]}>
            {t('dashboard.noData')}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor: colors.surface.card }, style]}
      testID={testID}
    >
      <Text style={[styles.title, { color: colors.text.primary }]}>
        {t('dashboard.categoryBreakdown')}
      </Text>

      {/* Donut Chart */}
      <DonutChart
        data={chartData}
        size={180}
        innerRadiusRatio={0.65}
        centerLabel={centerLabel}
        centerSublabel={t('dashboard.expenses')}
        showLegend={false}
        onSegmentPress={handleSegmentPress}
        testID={`${testID}-chart`}
      />

      {/* Category List */}
      <View style={styles.categoryList}>
        {data.slice(0, 5).map((item) => (
          <TouchableOpacity
            key={item.categoryId ?? 'uncategorized'}
            style={[styles.categoryItem, { borderBottomColor: colors.border.subtle }]}
            onPress={() => onCategoryPress?.(item.categoryId, item.categoryName)}
            accessibilityRole="button"
            accessibilityLabel={`${item.categoryName}: ${formatCurrencyLocale(item.total / 100, locale)}`}
            testID={`${testID}-category-${item.categoryId ?? 'uncategorized'}`}
          >
            <View style={styles.categoryLeft}>
              <View style={[styles.categoryColor, { backgroundColor: item.categoryColor }]} />
              <Text style={[styles.categoryName, { color: colors.text.primary }]} numberOfLines={1}>
                {item.categoryName}
              </Text>
            </View>
            <View style={styles.categoryRight}>
              <Text style={[styles.categoryAmount, { color: colors.text.primary }]}>
                {formatCurrencyLocale(item.total / 100, locale)}
              </Text>
              <Text style={[styles.categoryPercent, { color: colors.text.tertiary }]}>
                {item.percentage.toFixed(1)}%
              </Text>
            </View>
          </TouchableOpacity>
        ))}

        {/* Show "View All" if more than 5 categories */}
        {data.length > 5 && (
          <TouchableOpacity
            style={styles.viewAllButton}
            onPress={() => onCategoryPress?.(null, '')}
            accessibilityRole="button"
            accessibilityLabel={t('dashboard.viewAll')}
            testID={`${testID}-view-all`}
          >
            <Text style={[styles.viewAllText, { color: colors.interactive.primary }]}>
              {t('dashboard.viewAll')}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.base,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
  },
  categoryList: {
    marginTop: spacing.base,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.md,
  },
  categoryColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  categoryRight: {
    alignItems: 'flex-end',
  },
  categoryAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  categoryPercent: {
    fontSize: 12,
    marginTop: 2,
  },
  viewAllButton: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.xs,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

/**
 * Memoized CategoryBreakdown for performance optimization
 */
export const CategoryBreakdown = memo(CategoryBreakdownComponent);

export default CategoryBreakdown;
