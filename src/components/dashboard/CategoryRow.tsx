/**
 * CategoryRow Component
 *
 * An individual category line item that can expand to show transactions.
 * Displays category name, color indicator, total amount, and percentage.
 * When expanded, renders the TransactionList component for lazy-loaded transactions.
 *
 * **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7**
 */

import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { formatCurrencyLocale, getCurrentLocale } from '../../i18n';
import { spacing } from '../../constants/theme';
import { TransactionList } from './TransactionList';
import type { CategoryBreakdownItem } from '../../hooks/useDashboardData';

/**
 * Props for the CategoryRow component
 */
export interface CategoryRowProps {
  /** Category breakdown item data */
  category: CategoryBreakdownItem;
  /** Whether this row is currently expanded to show transactions */
  isExpanded: boolean;
  /** Callback when the row is pressed (toggle expand/collapse) */
  onPress: () => void;
  /** Currently selected month in YYYY-MM format */
  selectedMonth: string;
  /** Test ID for testing */
  testID?: string;
}

/**
 * CategoryRow component
 *
 * Renders a single category row with color indicator, name, amount, and percentage.
 * When expanded, shows the TransactionList component which handles loading, error,
 * and empty states internally via the useCategoryTransactions hook.
 *
 * @example
 * ```tsx
 * <CategoryRow
 *   category={categoryItem}
 *   isExpanded={expandedCategoryId === categoryItem.categoryId}
 *   onPress={() => handleCategoryPress(categoryItem.categoryId)}
 *   selectedMonth="2024-06"
 *   testID="category-row-food"
 * />
 * ```
 */
function CategoryRowComponent({
  category,
  isExpanded,
  onPress,
  selectedMonth,
  testID,
}: CategoryRowProps): React.ReactElement {
  const colors = useThemeColors();
  const locale = getCurrentLocale();

  // Format the total amount (amount is in cents)
  const formattedAmount = useMemo(
    () => formatCurrencyLocale(category.total / 100, locale),
    [category.total, locale]
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border.subtle,
        },
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.base,
        },
        rowLeft: {
          flexDirection: 'row',
          alignItems: 'center',
          flex: 1,
          marginRight: spacing.md,
        },
        colorIndicator: {
          width: 10,
          height: 10,
          borderRadius: 5,
          marginRight: spacing.sm,
        },
        categoryName: {
          fontSize: 14,
          fontWeight: '500',
          color: colors.text.primary,
          flex: 1,
        },
        rowRight: {
          alignItems: 'flex-end',
        },
        amount: {
          fontSize: 14,
          fontWeight: '600',
          color: colors.text.primary,
        },
        percentage: {
          fontSize: 12,
          color: colors.text.tertiary,
          marginTop: 2,
        },
        transactionListContainer: {
          paddingHorizontal: spacing.base,
          paddingBottom: spacing.sm,
        },
      }),
    [colors]
  );

  return (
    <View style={styles.container} testID={testID}>
      {/* Category Row - Pressable area */}
      <TouchableOpacity
        style={styles.row}
        onPress={onPress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${category.categoryName}: ${formattedAmount}, ${category.percentage}%`}
        accessibilityState={{ expanded: isExpanded }}
        testID={testID ? `${testID}-pressable` : undefined}
      >
        <View style={styles.rowLeft}>
          <View
            style={[styles.colorIndicator, { backgroundColor: category.categoryColor }]}
            accessibilityElementsHidden
          />
          <Text style={styles.categoryName} numberOfLines={1}>
            {category.categoryName}
          </Text>
        </View>
        <View style={styles.rowRight}>
          <Text style={styles.amount}>{formattedAmount}</Text>
          <Text style={styles.percentage}>{category.percentage}%</Text>
        </View>
      </TouchableOpacity>

      {/* Inline Transaction List (visible when expanded) */}
      {isExpanded && category.categoryId && (
        <View style={styles.transactionListContainer}>
          <TransactionList
            categoryId={category.categoryId}
            month={selectedMonth}
            testID={testID ? `${testID}-transactions` : undefined}
          />
        </View>
      )}
    </View>
  );
}

/**
 * Memoized CategoryRow for performance optimization
 */
export const CategoryRow = memo(CategoryRowComponent);

export default CategoryRow;
