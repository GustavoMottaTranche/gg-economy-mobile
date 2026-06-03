/**
 * CategoryRow Component
 *
 * An individual category line item that can expand to show transactions.
 * Displays category name, color indicator, total amount, and percentage.
 * When a goal is configured, displays the goal value with a suggestion indicator.
 * When expanded, renders the TransactionList component for lazy-loaded transactions.
 *
 * **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 5.2, 5.3, 9.2, 9.4, 9.5**
 */

import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
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
  /** Optional goal amount in cents for this category */
  goalAmount?: number | null;
  /** Test ID for testing */
  testID?: string;
}

/**
 * CategoryRow component
 *
 * Renders a single category row with color indicator, name, amount, and percentage.
 * When a goal is configured, displays the goal formatted as currency with a
 * suggestion indicator using muted/secondary styling.
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
 *   goalAmount={200000}
 *   testID="category-row-food"
 * />
 * ```
 */
function CategoryRowComponent({
  category,
  isExpanded,
  onPress,
  selectedMonth,
  goalAmount,
  testID,
}: CategoryRowProps): React.ReactElement {
  const colors = useThemeColors();
  const locale = getCurrentLocale();
  const { t } = useTranslation();

  const hasGoal = goalAmount != null && goalAmount > 0;

  // Format the total amount (amount is in cents)
  const formattedAmount = useMemo(
    () => formatCurrencyLocale(category.total / 100, locale),
    [category.total, locale]
  );

  // Format the goal amount (in cents) when it exists
  const formattedGoal = useMemo(
    () => (hasGoal ? formatCurrencyLocale(goalAmount / 100, locale) : null),
    [hasGoal, goalAmount, locale]
  );

  // Build accessibility label including goal when present
  const accessibilityLabel = useMemo(() => {
    if (hasGoal && formattedGoal) {
      return `${category.categoryName}: ${formattedAmount}, ${category.percentage}%, ${t('goals.suggestionIndicator')} ${formattedGoal}`;
    }
    return `${category.categoryName}: ${formattedAmount}, ${category.percentage}%`;
  }, [category.categoryName, formattedAmount, category.percentage, hasGoal, formattedGoal, t]);

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
          flexShrink: 0,
        },
        amount: {
          fontSize: 14,
          fontWeight: '600',
          color: colors.text.primary,
        },
        goalText: {
          fontSize: 11,
          color: colors.text.tertiary,
          marginTop: 2,
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
        accessibilityLabel={accessibilityLabel}
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
          {hasGoal && formattedGoal ? (
            <Text style={styles.goalText} testID={testID ? `${testID}-goal` : undefined}>
              {t('goals.suggestionIndicator')} {formattedGoal}
            </Text>
          ) : (
            <Text style={styles.percentage}>{category.percentage}%</Text>
          )}
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
