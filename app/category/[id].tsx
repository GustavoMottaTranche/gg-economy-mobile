/**
 * Category Detail Screen
 *
 * Displays all transactions and weekly occurrences for a specific category
 * in the selected reference month. Provides drill-down visibility from
 * the Dashboard's collapsible category sections.
 *
 * **Validates: Requirements 1.2, 1.3, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.4, 3.5, 3.6, 4.1, 4.2, 6.1, 6.2, 6.3, 6.4, 7.1, 7.2, 7.3, 7.4, 8.3, 8.4**
 */
import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useCategoryDetailData } from '../../src/hooks/useCategoryDetailData';
import { useThemeColors } from '../../src/hooks/useThemeColors';
import { useThemeStore } from '../../src/stores/themeStore';
import { useCategoryGoal } from '../../src/stores/goalStore';
import { spacing, borderRadius, typography, shadows } from '../../src/constants/theme';
import { LoadingIndicator } from '../../src/components/ui/LoadingIndicator';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { InstallmentIndicator } from '../../src/components/category/InstallmentIndicator';
import { CategoryPaymentSummary } from '../../src/components/category/CategoryPaymentSummary';
import {
  formatCurrencyLocale,
  formatDateLocale,
  getCurrentLocale,
  getMonthName,
} from '../../src/i18n';
import type { CategoryDetailItem } from '../../src/hooks/useCategoryDetailData';

// ============================================================================
// Helpers
// ============================================================================

/**
 * Validates and returns a YYYY-MM month string.
 * Defaults to the current month if the input is missing or invalid.
 */
function resolveMonth(monthParam: string | undefined): string {
  if (monthParam && /^\d{4}-(0[1-9]|1[0-2])$/.test(monthParam)) {
    return monthParam;
  }
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Formats a YYYY-MM string into a readable month label (e.g., "Janeiro 2025").
 */
function formatReferenceMonth(monthStr: string, locale: 'pt-BR' | 'en'): string {
  const [year, month] = monthStr.split('-').map(Number);
  if (!year || !month) return monthStr;

  const monthName = getMonthName(month - 1, locale, 'long');
  const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  return `${capitalizedMonth} ${year}`;
}

// ============================================================================
// CategoryDetailItem Row Component
// ============================================================================

interface ItemRowProps {
  item: CategoryDetailItem;
  locale: 'pt-BR' | 'en';
  weeklyLabel: string;
  pendingLabel: string;
  paidLabel: string;
  installmentLabel?: string;
  isPaid: boolean;
  onPress: (item: CategoryDetailItem) => void;
  colors: ReturnType<typeof useThemeColors>;
  themeShadows: (typeof shadows)['light'];
}

function ItemRow({
  item,
  locale,
  weeklyLabel,
  pendingLabel,
  paidLabel,
  installmentLabel,
  isPaid,
  onPress,
  colors,
  themeShadows,
}: ItemRowProps) {
  const formattedDate = useMemo(() => {
    const date = new Date(item.date + 'T00:00:00');
    if (isNaN(date.getTime())) return item.date;
    return formatDateLocale(date, locale);
  }, [item.date, locale]);
  const formattedAmount = formatCurrencyLocale(Math.abs(item.amount) / 100, locale);

  const paymentStatusLabel = isPaid ? paidLabel : pendingLabel;
  const amountColor = isPaid ? colors.semantic.success.dark : colors.semantic.warning.dark;

  return (
    <TouchableOpacity
      style={[
        styles.itemRow,
        { backgroundColor: colors.surface.card, borderBottomColor: colors.border.subtle },
        themeShadows.sm,
        !isPaid && { opacity: 0.7 },
      ]}
      onPress={() => onPress(item)}
      activeOpacity={0.6}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}, ${formattedDate}, ${formattedAmount}, ${paymentStatusLabel}${item.type === 'weekly' ? `, ${weeklyLabel}` : ''}${installmentLabel ? `, ${installmentLabel}` : ''}`}
      accessibilityHint={
        item.type === 'weekly'
          ? 'Tap to view weekly recurring details'
          : 'Tap to view transaction details'
      }
      testID={`category-detail-item-${item.id}`}
    >
      <View style={styles.itemContent}>
        <View style={styles.itemLeft}>
          <View style={styles.itemTitleRow}>
            <Text style={[styles.itemTitle, { color: colors.text.primary }]} numberOfLines={1}>
              {item.title}
            </Text>
            {installmentLabel && (
              <View style={styles.installmentBadgeContainer}>
                <InstallmentIndicator
                  label={installmentLabel}
                  testID={`installment-indicator-${item.id}`}
                />
              </View>
            )}
            {item.type === 'weekly' && (
              <View
                style={[styles.weeklyBadge, { backgroundColor: colors.semantic.info.light }]}
                accessibilityLabel={weeklyLabel}
              >
                <Text style={[styles.weeklyBadgeText, { color: colors.semantic.info.dark }]}>
                  🔄 {weeklyLabel}
                </Text>
              </View>
            )}
            {!isPaid && (
              <View
                style={[styles.pendingBadge, { backgroundColor: colors.semantic.warning.light }]}
                accessibilityLabel={pendingLabel}
              >
                <Text style={[styles.pendingBadgeText, { color: colors.semantic.warning.dark }]}>
                  {pendingLabel}
                </Text>
              </View>
            )}
          </View>
          <Text style={[styles.itemDate, { color: colors.text.secondary }]}>{formattedDate}</Text>
        </View>
        <Text style={[styles.itemAmount, { color: amountColor }]}>{formattedAmount}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ============================================================================
// Main Screen Component
// ============================================================================

export default function CategoryDetailScreen(): React.ReactElement {
  const { id, month } = useLocalSearchParams<{ id: string; month: string }>();
  const { t } = useTranslation();
  const locale = getCurrentLocale();
  const colors = useThemeColors();
  const resolvedScheme = useThemeStore((s) => s.resolvedScheme);
  const themeShadows = shadows[resolvedScheme];

  // Resolve and validate month parameter
  const resolvedMonth = resolveMonth(month);

  // Get category goal from store
  const categoryGoal = useCategoryGoal(id ?? '');

  // Fetch category detail data
  const {
    category,
    items,
    total,
    count,
    paymentSummary,
    installmentInfo,
    isLoading,
    error,
    refresh,
  } = useCategoryDetailData(id ?? '', resolvedMonth);

  // Dynamic header title
  const headerTitle = category?.name ?? t('categoryDetail.title');

  // Format header values
  const formattedTotal = useMemo(() => formatCurrencyLocale(total / 100, locale), [total, locale]);
  const formattedMonth = useMemo(
    () => formatReferenceMonth(resolvedMonth, locale),
    [resolvedMonth, locale]
  );
  const formattedGoal = useMemo(
    () => (categoryGoal != null ? formatCurrencyLocale(categoryGoal / 100, locale) : null),
    [categoryGoal, locale]
  );
  const formattedDifference = useMemo(() => {
    if (categoryGoal == null) return null;
    // Positive = still under budget, Negative = over budget
    const diff = categoryGoal - total;
    return formatCurrencyLocale(diff / 100, locale);
  }, [categoryGoal, total, locale]);

  // Handle item press navigation
  const handleItemPress = useCallback((item: CategoryDetailItem) => {
    if (item.type === 'weekly' && item.weeklyGroupId) {
      router.push(`/weekly-recurring/${item.weeklyGroupId}`);
    } else {
      router.push(`/transaction/${item.id}`);
    }
  }, []);

  // Render individual list item
  const renderItem = useCallback(
    ({ item }: { item: CategoryDetailItem }) => (
      <ItemRow
        item={item}
        locale={locale}
        weeklyLabel={t('categoryDetail.weeklyIndicator')}
        pendingLabel={t('categoryDetail.pending')}
        paidLabel={t('categoryDetail.paid')}
        installmentLabel={installmentInfo.get(item.id)?.label}
        isPaid={item.isPaid}
        onPress={handleItemPress}
        colors={colors}
        themeShadows={themeShadows}
      />
    ),
    [locale, t, handleItemPress, colors, themeShadows, installmentInfo]
  );

  // Key extractor for FlatList
  const keyExtractor = useCallback((item: CategoryDetailItem) => `${item.type}-${item.id}`, []);

  // Expense group badge label
  const badgeLabel = useMemo(() => {
    if (!category?.expenseGroup) return null;
    return category.expenseGroup === 'fixed'
      ? t('categoryDetail.badgeFixed')
      : t('categoryDetail.badgeVariable');
  }, [category?.expenseGroup, t]);

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background.secondary }]}>
        <Stack.Screen options={{ title: headerTitle }} />
        <LoadingIndicator testID="category-detail-loading" />
      </SafeAreaView>
    );
  }

  // Error state
  if (error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background.secondary }]}>
        <Stack.Screen options={{ title: headerTitle }} />
        <EmptyState
          icon="⚠️"
          title={t('categoryDetail.errorTitle')}
          description={t('categoryDetail.errorDescription')}
          action={{
            label: t('categoryDetail.retry'),
            onPress: refresh,
          }}
          testID="category-detail-error"
        />
      </SafeAreaView>
    );
  }

  // Header component rendered above the FlatList
  const ListHeaderComponent = (
    <View>
      <View
        style={[styles.headerCard, { backgroundColor: colors.surface.card }, themeShadows.md]}
        testID="category-detail-header"
      >
        {/* Category icon + name */}
        <View style={styles.headerTop}>
          <View
            style={[
              styles.iconContainer,
              {
                backgroundColor: category?.color
                  ? `${category.color}20`
                  : colors.background.tertiary,
              },
            ]}
          >
            <Text style={styles.iconText} accessibilityElementsHidden>
              {category?.icon ?? '📁'}
            </Text>
          </View>
          <Text
            style={[styles.categoryName, { color: category?.color ?? colors.text.primary }]}
            numberOfLines={1}
            accessibilityRole="header"
          >
            {category?.name ?? '--'}
          </Text>
        </View>

        {/* Total amount */}
        <Text
          style={[styles.totalAmount, { color: colors.text.primary }]}
          testID="category-detail-total"
          accessibilityLabel={`${t('categoryDetail.title')}: ${formattedTotal}`}
        >
          {formattedTotal}
        </Text>

        {/* Month label */}
        <Text
          style={[styles.monthLabel, { color: colors.text.secondary }]}
          testID="category-detail-month"
        >
          {formattedMonth}
        </Text>

        {/* Goal (expectativa) display */}
        {formattedGoal && (
          <Text
            style={[styles.goalLabel, { color: colors.text.tertiary }]}
            testID="category-detail-goal"
            accessibilityLabel={`${t('goals.suggestionIndicator')} ${formattedGoal}`}
          >
            {t('goals.suggestionIndicator')} {formattedGoal}
          </Text>
        )}

        {/* Difference (gasto - meta) */}
        {formattedDifference && (
          <Text
            style={[styles.differenceLabel, { color: colors.text.secondary }]}
            testID="category-detail-difference"
            accessibilityLabel={`${t('goals.differenceLabel')} ${formattedDifference}`}
          >
            {t('goals.differenceLabel')} {formattedDifference}
          </Text>
        )}

        {/* Count + badge row */}
        <View style={styles.metaRow}>
          <Text
            style={[styles.countText, { color: colors.text.tertiary }]}
            testID="category-detail-count"
          >
            {t('categoryDetail.transactionCount', { count })}
          </Text>
          {badgeLabel && (
            <View
              style={[
                styles.expenseGroupBadge,
                {
                  backgroundColor:
                    category?.expenseGroup === 'fixed'
                      ? colors.semantic.info.light
                      : colors.semantic.warning.light,
                },
              ]}
              testID="category-detail-badge"
            >
              <Text
                style={[
                  styles.expenseGroupBadgeText,
                  {
                    color:
                      category?.expenseGroup === 'fixed'
                        ? colors.semantic.info.dark
                        : colors.semantic.warning.dark,
                  },
                ]}
              >
                {badgeLabel}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Payment summary card (below header card) */}
      <View style={styles.paymentSummaryContainer}>
        <CategoryPaymentSummary
          paidTotal={paymentSummary.paidTotal}
          pendingTotal={paymentSummary.pendingTotal}
          grandTotal={paymentSummary.grandTotal}
          testID="category-detail-payment-summary"
        />
      </View>
    </View>
  );

  // Empty list component
  const ListEmptyComponent = (
    <EmptyState
      icon="📭"
      title={t('categoryDetail.emptyTitle')}
      description={t('categoryDetail.emptyDescription')}
      testID="category-detail-empty"
    />
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background.secondary }]}
      testID="category-detail-screen"
    >
      <Stack.Screen options={{ title: headerTitle }} />
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={ListHeaderComponent}
        ListEmptyComponent={ListEmptyComponent}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        testID="category-detail-list"
      />
    </SafeAreaView>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingBottom: spacing['2xl'],
  },
  // Header card
  headerCard: {
    margin: spacing.base,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  iconText: {
    fontSize: 20,
  },
  categoryName: {
    fontSize: typography.title.fontSize,
    fontWeight: typography.title.fontWeight,
    flexShrink: 1,
  },
  totalAmount: {
    fontSize: typography.heading.fontSize,
    fontWeight: typography.heading.fontWeight,
    marginBottom: spacing.xs,
  },
  monthLabel: {
    fontSize: typography.body.fontSize,
    marginBottom: spacing.sm,
  },
  goalLabel: {
    fontSize: typography.caption.fontSize,
    marginBottom: spacing.xs,
  },
  differenceLabel: {
    fontSize: typography.caption.fontSize,
    marginBottom: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  countText: {
    fontSize: typography.caption.fontSize,
  },
  expenseGroupBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  expenseGroupBadgeText: {
    fontSize: typography.overline.fontSize,
    fontWeight: typography.overline.fontWeight,
  },
  // Payment summary
  paymentSummaryContainer: {
    marginHorizontal: spacing.base,
  },
  // Item row
  itemRow: {
    marginHorizontal: spacing.base,
    marginTop: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    borderRadius: borderRadius.md,
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemLeft: {
    flex: 1,
    marginRight: spacing.md,
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  itemTitle: {
    fontSize: typography.body.fontSize,
    fontWeight: '500',
    flexShrink: 1,
  },
  weeklyBadge: {
    marginLeft: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  weeklyBadgeText: {
    fontSize: typography.overline.fontSize,
    fontWeight: '600',
  },
  installmentBadgeContainer: {
    marginLeft: spacing.sm,
  },
  pendingBadge: {
    marginLeft: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  pendingBadgeText: {
    fontSize: typography.overline.fontSize,
    fontWeight: '600',
  },
  itemDate: {
    fontSize: typography.caption.fontSize,
  },
  itemAmount: {
    fontSize: typography.body.fontSize,
    fontWeight: '600',
  },
});
