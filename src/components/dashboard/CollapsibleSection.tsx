/**
 * CollapsibleSection Component
 *
 * A reusable collapsible container for expense group sections (Fixo/Variável).
 * Displays a header with title, total amount, and chevron indicator.
 * When expanded, renders category rows within the section.
 * Uses LayoutAnimation for smooth expand/collapse transitions (max 300ms).
 *
 * When a generalGoal is configured, also displays the goal value formatted as
 * currency with a suggestion indicator ("meta"/"goal") and expected future spending
 * with a label ("expectativa"/"expected") in secondary styling.
 *
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10, 3.1, 3.2, 3.3, 3.4, 3.5, 5.2, 5.3, 9.2, 9.4, 9.5, 10.1, 10.7, 10.8, 10.9**
 */

import React, { memo, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  LayoutAnimation,
  UIManager,
  Platform,
  ViewStyle,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { formatCurrencyLocale, getCurrentLocale } from '../../i18n';
import { useThemeColors } from '../../hooks/useThemeColors';
import { spacing, borderRadius, shadows } from '../../constants/theme';
import { useThemeStore } from '../../stores/themeStore';
import type { CategoryBreakdownItem } from '../../hooks/useDashboardData';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/**
 * Props for the CollapsibleSection component
 */
export interface CollapsibleSectionProps {
  /** Section title ("Fixo" or "Variável") */
  title: string;
  /** Total amount in cents for the group */
  total: number;
  /** Category breakdown items for this section */
  categories: CategoryBreakdownItem[];
  /** Whether the section is currently expanded */
  isExpanded: boolean;
  /** Callback to toggle expand/collapse */
  onToggle: () => void;
  /** Callback when a category is pressed */
  onCategoryPress: (categoryId: string) => void;
  /** ID of the currently expanded category (for transaction list) */
  expandedCategoryId: string | null;
  /** Currently selected month in YYYY-MM format */
  selectedMonth: string;
  /** General variable expense goal in cents, null if not configured */
  generalGoal?: number | null;
  /** Expected future spending in cents (always >= 0) */
  expectedFutureSpending?: number;
  /** Per-category goals: categoryId → amount in cents */
  categoryGoals?: Map<string, number>;
  /** Optional container style */
  style?: ViewStyle;
  /** Test ID for testing */
  testID?: string;
}

/**
 * Custom LayoutAnimation config with max 300ms duration
 */
const TOGGLE_ANIMATION = LayoutAnimation.create(
  280,
  LayoutAnimation.Types.easeInEaseOut,
  LayoutAnimation.Properties.opacity
);

/**
 * CollapsibleSection component
 *
 * @example
 * ```tsx
 * <CollapsibleSection
 *   title="Fixo"
 *   total={150000}
 *   categories={fixedBreakdown}
 *   isExpanded={isFixedExpanded}
 *   onToggle={() => setFixedExpanded(!isFixedExpanded)}
 *   onCategoryPress={(id) => handleCategoryPress(id)}
 *   expandedCategoryId={expandedCategoryId}
 *   selectedMonth="2024-01"
 * />
 * ```
 */
function CollapsibleSectionComponent({
  title,
  total,
  categories,
  isExpanded,
  onToggle,
  onCategoryPress,
  expandedCategoryId: _expandedCategoryId,
  selectedMonth: _selectedMonth,
  generalGoal,
  expectedFutureSpending,
  categoryGoals,
  style,
  testID,
}: CollapsibleSectionProps): React.ReactElement {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const resolvedScheme = useThemeStore((s) => s.resolvedScheme);
  const locale = getCurrentLocale();

  // Format total in user currency (amount is in cents)
  const formattedTotal = useMemo(() => {
    return formatCurrencyLocale(total / 100, locale);
  }, [total, locale]);

  // Format general goal if configured
  const formattedGoal = useMemo(() => {
    if (generalGoal == null) return null;
    return formatCurrencyLocale(generalGoal / 100, locale);
  }, [generalGoal, locale]);

  // Format expected future spending if available
  const formattedExpected = useMemo(() => {
    if (expectedFutureSpending == null) return null;
    return formatCurrencyLocale(expectedFutureSpending / 100, locale);
  }, [expectedFutureSpending, locale]);

  // Chevron indicator: ▼ when expanded, ▶ when collapsed
  const chevron = isExpanded ? '▼' : '▶';

  // Handle toggle with animation
  const handleToggle = useCallback(() => {
    LayoutAnimation.configureNext(TOGGLE_ANIMATION);
    onToggle();
  }, [onToggle]);

  // Handle category press
  const handleCategoryPress = useCallback(
    (categoryId: string | null) => {
      if (categoryId) {
        onCategoryPress(categoryId);
      }
    },
    [onCategoryPress]
  );

  // Build accessibility label including goal when configured
  const headerAccessibilityLabel = useMemo(() => {
    const expandedState = isExpanded ? 'expandido' : 'colapsado';
    if (generalGoal != null && formattedGoal) {
      return `${title}, ${formattedTotal}, ${t('goals.suggestionIndicator')} ${formattedGoal}, ${expandedState}`;
    }
    return `${title}, ${formattedTotal}, ${expandedState}`;
  }, [title, formattedTotal, formattedGoal, generalGoal, isExpanded, t]);

  // Get shadow based on theme mode
  const sectionShadow = shadows[resolvedScheme].sm;

  return (
    <View
      style={[styles.container, { backgroundColor: colors.surface.card }, sectionShadow, style]}
      testID={testID}
    >
      {/* Section Header */}
      <TouchableOpacity
        style={styles.header}
        onPress={handleToggle}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={headerAccessibilityLabel}
        accessibilityState={{ expanded: isExpanded }}
        testID={testID ? `${testID}-header` : undefined}
      >
        <View style={styles.headerLeft}>
          <Text
            style={[styles.chevron, { color: colors.text.secondary }]}
            accessibilityElementsHidden
          >
            {chevron}
          </Text>
          <Text style={[styles.title, { color: colors.text.primary }]}>{title}</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={[styles.total, { color: colors.text.primary }]}>{formattedTotal}</Text>
          {formattedExpected != null && (
            <Text
              style={[styles.expectedSpending, { color: colors.text.secondary }]}
              testID={testID ? `${testID}-expected` : undefined}
            >
              {t('goals.expectedSpendingLabel')} {formattedExpected}
            </Text>
          )}
          {formattedGoal != null && (
            <Text
              style={[styles.goalValue, { color: colors.text.tertiary }]}
              testID={testID ? `${testID}-goal` : undefined}
            >
              {t('goals.suggestionIndicator')} {formattedGoal}
            </Text>
          )}
        </View>
      </TouchableOpacity>

      {/* Category List (visible when expanded) */}
      {isExpanded && categories.length > 0 && (
        <View style={styles.categoryList} testID={testID ? `${testID}-list` : undefined}>
          {categories.map((category) => {
            const catGoal = categoryGoals?.get(category.categoryId ?? '') ?? null;
            const hasCatGoal = catGoal != null && catGoal > 0;
            const formattedCatGoal = hasCatGoal
              ? formatCurrencyLocale(catGoal / 100, locale)
              : null;
            // Difference: goal - spending (positive = under budget, negative = over budget)
            const difference = hasCatGoal ? catGoal - category.total : null;
            const formattedDifference =
              difference != null ? formatCurrencyLocale(difference / 100, locale) : null;

            return (
              <TouchableOpacity
                key={category.categoryId ?? 'uncategorized'}
                style={[styles.categoryItem, { borderBottomColor: colors.border.subtle }]}
                onPress={() => handleCategoryPress(category.categoryId)}
                accessibilityRole="button"
                accessibilityLabel={
                  hasCatGoal
                    ? `${category.categoryName}: ${formatCurrencyLocale(category.total / 100, locale)}, ${t('goals.suggestionIndicator')} ${formattedCatGoal}, ${t('goals.differenceLabel')} ${formattedDifference}`
                    : `${category.categoryName}: ${formatCurrencyLocale(category.total / 100, locale)}, ${category.percentage}%`
                }
                testID={
                  testID
                    ? `${testID}-category-${category.categoryId ?? 'uncategorized'}`
                    : undefined
                }
              >
                <View style={styles.categoryLeft}>
                  <View
                    style={[styles.categoryColor, { backgroundColor: category.categoryColor }]}
                  />
                  <Text
                    style={[styles.categoryName, { color: colors.text.primary }]}
                    numberOfLines={1}
                  >
                    {category.categoryName}
                  </Text>
                </View>
                <View style={styles.categoryRight}>
                  <Text style={[styles.categoryAmount, { color: colors.text.primary }]}>
                    {formatCurrencyLocale(category.total / 100, locale)}
                  </Text>
                  {hasCatGoal && formattedCatGoal ? (
                    <>
                      <Text style={[styles.categoryGoalText, { color: colors.text.tertiary }]}>
                        {t('goals.suggestionIndicator')} {formattedCatGoal}
                      </Text>
                      <Text style={[styles.categoryDiffText, { color: colors.text.secondary }]}>
                        {t('goals.differenceLabel')} {formattedDifference}
                      </Text>
                    </>
                  ) : (
                    <Text style={[styles.categoryPercent, { color: colors.text.tertiary }]}>
                      {category.percentage}%
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Empty state: section is expanded but no categories */}
      {isExpanded && categories.length === 0 && (
        <View style={styles.emptyState} testID={testID ? `${testID}-empty` : undefined}>
          <Text style={[styles.emptyText, { color: colors.text.tertiary }]}>
            Nenhuma categoria neste mês
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.lg,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chevron: {
    fontSize: 12,
    marginRight: spacing.sm,
    width: 16,
    textAlign: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  total: {
    fontSize: 16,
    fontWeight: '700',
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  expectedSpending: {
    fontSize: 12,
    marginTop: 2,
  },
  goalValue: {
    fontSize: 12,
    marginTop: 2,
  },
  categoryList: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.md,
  },
  categoryColor: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing.sm,
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
  categoryGoalText: {
    fontSize: 11,
    marginTop: 2,
  },
  categoryDiffText: {
    fontSize: 11,
    marginTop: 1,
  },
  categoryPercent: {
    fontSize: 12,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.base,
  },
  emptyText: {
    fontSize: 14,
  },
});

/**
 * Memoized CollapsibleSection for performance optimization
 */
export const CollapsibleSection = memo(CollapsibleSectionComponent);

export default CollapsibleSection;
