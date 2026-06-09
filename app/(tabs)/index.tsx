/**
 * Dashboard Screen (Tab: index)
 *
 * The main dashboard showing financial overview including:
 * - Month selector for navigating between months (unrestricted future navigation)
 * - Summary card with income, expenses, and balance
 * - Expense chart with filter (Todos / Somente Fixo / Somente Variável)
 * - Collapsible sections for Fixed and Variable expense categories
 *
 * Layout order: MonthSelector → SummaryCard → ExpenseChart with ChartFilter → Seção_Fixo → Seção_Variável
 * Uses theme system for all colors, spacing, typography, and shadows.
 * SummaryCard uses elevated shadow (lg) while other components use lower elevation (sm/md).
 *
 * **Validates: Requirements 1.2, 4.6, 5.1, 5.4, 5.5, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6**
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, Text, Pressable } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useDashboardData } from '../../src/hooks/useDashboardData';
import { useThemeColors } from '../../src/hooks/useThemeColors';
import { useThemeStore } from '../../src/stores/themeStore';
import { spacing, shadows, borderRadius, typography } from '../../src/constants/theme';
import { LoadingIndicator } from '../../src/components/ui/LoadingIndicator';
import { EmptyState } from '../../src/components/ui/EmptyState';
import {
  MonthSelector,
  MonthPickerModal,
  CollapsibleSection,
  ChartFilter,
  ExpenseChart,
  PendingSection,
  ExpenseSummaryCard,
} from '../../src/components/dashboard';
import { usePaymentStatusStore, usePendingItems } from '../../src/stores/paymentStatusStore';
import { formatCurrencyLocale, getCurrentLocale } from '../../src/i18n';

/**
 * Get current month in YYYY-MM format
 */
function getCurrentMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Dashboard Screen Component
 */
export default function DashboardScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const colors = useThemeColors();
  const resolvedScheme = useThemeStore((s) => s.resolvedScheme);

  // Get dashboard data from hook
  const {
    summary,
    fixedBreakdown,
    variableBreakdown,
    fixedTotal,
    variableTotal,
    weeklyTotal,
    generalGoal,
    categoryGoals,
    expectedFutureSpending,
    chartFilter,
    setChartFilter,
    selectedMonth,
    setSelectedMonth,
    fundExpensesTotal,
    isLoading,
    error,
    previousMonth,
    nextMonth,
    refresh,
  } = useDashboardData();

  // Payment status store - pending items for the selected month
  const pendingItems = usePendingItems(selectedMonth);

  // Load pending items and payment totals when month changes (Requirement 4.7, 5.2)
  useEffect(() => {
    const store = usePaymentStatusStore.getState();
    store.loadPendingItemsForMonth(selectedMonth);
    store.loadPaymentTotalsForMonth(selectedMonth);
  }, [selectedMonth]);

  // Local state for collapsible sections (expanded by default)
  const [isFixedExpanded, setFixedExpanded] = useState(true);
  const [isVariableExpanded, setVariableExpanded] = useState(true);

  // Month picker modal state
  const [isMonthPickerVisible, setMonthPickerVisible] = useState(false);

  // Check if selected month is in the future
  const currentMonth = getCurrentMonth();
  const isFutureMonth = selectedMonth > currentMonth;

  // Handle category press in collapsible sections (navigate to category detail)
  const handleCategoryPress = useCallback(
    (categoryId: string) => {
      router.push(`/category/${categoryId}?month=${selectedMonth}`);
    },
    [router, selectedMonth]
  );

  // Month picker handlers
  const handleOpenMonthPicker = useCallback(() => {
    setMonthPickerVisible(true);
  }, []);

  const handleCloseMonthPicker = useCallback(() => {
    setMonthPickerVisible(false);
  }, []);

  const handleSelectMonth = useCallback(
    (month: string) => {
      setSelectedMonth(month);
    },
    [setSelectedMonth]
  );

  // Handle refresh
  const handleRefresh = useCallback(() => {
    refresh();
    usePaymentStatusStore.getState().loadPendingItemsForMonth(selectedMonth);
  }, [refresh, selectedMonth]);

  // Handle tap on fund expense summary - navigate to Future Plans (Requirement 10.6)
  const handleFundExpensePress = useCallback(() => {
    router.push('/(tabs)/future-plans');
  }, [router]);

  // Handle toggle payment status from PendingSection (Requirement 4.2)
  const handleTogglePaymentStatus = useCallback(
    (id: string, type: 'weekly' | 'monthly' | 'installment') => {
      usePaymentStatusStore.getState().togglePaymentStatus(id, type);
    },
    []
  );

  // Handle item press - navigate to Entry_Screen (Requirement 4.6)
  const handlePendingItemPress = useCallback(
    (groupId: string, type: 'weekly' | 'monthly' | 'installment') => {
      if (type === 'weekly') {
        router.push(`/weekly-recurring/${groupId}`);
      } else {
        // For monthly and installment, groupId is actually the transaction id (passed from PendingSection)
        router.push(`/transaction/${groupId}`);
      }
    },
    [router]
  );

  // Get shadow styles based on theme
  const chartShadow = shadows[resolvedScheme].md;

  // Dynamic styles based on theme colors
  const dynamicStyles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: colors.background.secondary,
        },
        contentContainer: {
          paddingHorizontal: spacing.base,
          paddingTop: spacing.base,
          paddingBottom: spacing['2xl'],
        },
        loadingContainer: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.background.secondary,
        },
        errorContainer: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.background.secondary,
          padding: spacing.lg,
        },
        monthSelector: {
          marginBottom: spacing.base,
        },
        summaryCard: {
          marginBottom: spacing.base,
        },
        pendingSection: {
          marginBottom: spacing.base,
        },
        chartSection: {
          marginBottom: spacing.base,
          backgroundColor: colors.surface.card,
          borderRadius: borderRadius.lg,
          padding: spacing.base,
          ...chartShadow,
        },
        chartFilter: {
          marginBottom: spacing.base,
        },
        fixedSection: {
          marginBottom: spacing.base,
        },
        variableSection: {
          marginBottom: spacing.base,
        },
        emptyStateContainer: {
          marginTop: spacing['2xl'],
          alignItems: 'center',
        },
        fundExpenseSummary: {
          marginBottom: spacing.base,
          paddingHorizontal: spacing.base,
          paddingVertical: spacing.sm,
        },
        fundExpenseText: {
          fontSize: typography.caption.fontSize,
          color: colors.interactive.primary,
          fontWeight: '500',
        },
      }),
    [colors, chartShadow]
  );

  // Loading state
  if (isLoading && !summary) {
    return (
      <View
        style={dynamicStyles.loadingContainer}
        accessible
        accessibilityLabel={t('common.loading')}
      >
        <StatusBar style={resolvedScheme === 'dark' ? 'light' : 'dark'} />
        <LoadingIndicator size="large" />
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={dynamicStyles.errorContainer} accessible accessibilityLabel={t('common.error')}>
        <StatusBar style={resolvedScheme === 'dark' ? 'light' : 'dark'} />
        <EmptyState
          icon="⚠️"
          title={t('common.error')}
          description={error}
          action={{
            label: t('common.retry'),
            onPress: refresh,
          }}
        />
      </View>
    );
  }

  // Check if there's any data
  const hasData =
    summary.totalIncome > 0 ||
    summary.totalExpenses > 0 ||
    summary.transactionCount > 0 ||
    weeklyTotal > 0 ||
    variableBreakdown.length > 0;

  return (
    <ScrollView
      style={dynamicStyles.container}
      contentContainerStyle={dynamicStyles.contentContainer}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={handleRefresh}
          tintColor={colors.interactive.primary}
          accessibilityLabel={t('common.refresh')}
        />
      }
      accessible
      accessibilityLabel={t('dashboard.title')}
      accessibilityRole="scrollbar"
    >
      <StatusBar style={resolvedScheme === 'dark' ? 'light' : 'dark'} />

      {/* 1. Month Selector - unrestricted forward navigation */}
      <MonthSelector
        selectedMonth={selectedMonth}
        onPreviousMonth={previousMonth}
        onNextMonth={nextMonth}
        onMonthPress={handleOpenMonthPicker}
        isFutureMonth={isFutureMonth}
        style={dynamicStyles.monthSelector}
        testID="dashboard-month-selector"
      />

      {/* Month Picker Modal */}
      <MonthPickerModal
        visible={isMonthPickerVisible}
        selectedMonth={selectedMonth}
        onSelectMonth={handleSelectMonth}
        onClose={handleCloseMonthPicker}
        testID="dashboard-month-picker"
      />

      {/* Expense Chart with ChartFilter - top of the page after month selector */}
      {hasData || pendingItems.length > 0 ? (
        <>
          {/* Expense Summary - Paid vs Pending (uses same filter as chart) */}
          {(() => {
            // Sum pending amounts using absolute value since weekly occurrences
            // store positive amounts while monthly transactions store negative amounts
            const filteredPendingAbs = pendingItems
              .filter((item) => {
                if (chartFilter === 'all') return true;
                if (chartFilter === 'fixed') return item.expenseGroup === 'fixed';
                if (chartFilter === 'variable')
                  return item.expenseGroup === 'variable' || item.expenseGroup === null;
                return true;
              })
              .reduce((sum, item) => sum + Math.abs(item.amount), 0);
            // totalForFilter already represents only PAID amounts (queries filter isPaid=1)
            // So: Total previsto = paid (totalForFilter) + pending (filteredPendingAbs)
            const totalForFilter =
              chartFilter === 'fixed'
                ? fixedTotal
                : chartFilter === 'variable'
                  ? variableTotal
                  : fixedTotal + variableTotal;
            return (
              <ExpenseSummaryCard
                paid={totalForFilter}
                pending={filteredPendingAbs}
                testID="dashboard-expense-summary"
              />
            );
          })()}

          {/* Fund expense summary - only shown when fund expenses > 0 (Requirement 10.1, 10.4, 10.5, 10.6) */}
          {fundExpensesTotal > 0 && (
            <Pressable
              onPress={handleFundExpensePress}
              style={dynamicStyles.fundExpenseSummary}
              accessibilityRole="link"
              accessibilityLabel={t('futurePlans.dashboard.fundExpensesLabel')}
              testID="dashboard-fund-expense-summary"
            >
              <Text style={dynamicStyles.fundExpenseText}>
                {t('futurePlans.dashboard.fundExpensesLabel')}:{' '}
                {formatCurrencyLocale(fundExpensesTotal / 100, getCurrentLocale())}
              </Text>
            </Pressable>
          )}

          <View style={dynamicStyles.chartSection}>
            <ChartFilter
              selected={chartFilter}
              onSelect={setChartFilter}
              style={dynamicStyles.chartFilter}
              testID="dashboard-chart-filter"
            />
            <ExpenseChart
              fixedTotal={fixedTotal}
              variableTotal={variableTotal}
              fixedCategories={fixedBreakdown}
              variableCategories={variableBreakdown}
              filter={chartFilter}
              testID="dashboard-expense-chart"
            />
          </View>

          {/* 4. Seção Fixo - low elevation (sm shadow via CollapsibleSection) */}
          <View style={dynamicStyles.fixedSection}>
            <CollapsibleSection
              title="Fixo"
              total={fixedTotal}
              categories={fixedBreakdown}
              isExpanded={isFixedExpanded}
              onToggle={() => setFixedExpanded((prev) => !prev)}
              onCategoryPress={handleCategoryPress}
              expandedCategoryId={null}
              selectedMonth={selectedMonth}
              testID="dashboard-fixed-section"
            />
          </View>

          {/* 5. Seção Variável - low elevation (sm shadow via CollapsibleSection) */}
          <View style={dynamicStyles.variableSection}>
            <CollapsibleSection
              title="Variável"
              total={variableTotal}
              categories={variableBreakdown}
              isExpanded={isVariableExpanded}
              onToggle={() => setVariableExpanded((prev) => !prev)}
              onCategoryPress={handleCategoryPress}
              expandedCategoryId={null}
              selectedMonth={selectedMonth}
              generalGoal={generalGoal}
              categoryGoals={categoryGoals}
              expectedFutureSpending={expectedFutureSpending}
              testID="dashboard-variable-section"
            />
          </View>

          {/* Pending Section */}
          <View style={dynamicStyles.pendingSection}>
            <PendingSection
              items={pendingItems}
              onToggleStatus={handleTogglePaymentStatus}
              onItemPress={handlePendingItemPress}
              testID="dashboard-pending-section"
            />
          </View>
        </>
      ) : (
        /* Empty State */
        <View style={dynamicStyles.emptyStateContainer}>
          <EmptyState
            icon="📊"
            title={t('dashboard.noData')}
            description={t('empty.transactionsHint')}
            action={{
              label: t('fileImport.selectFile'),
              onPress: () => router.push('/import'),
            }}
          />
        </View>
      )}
    </ScrollView>
  );
}
