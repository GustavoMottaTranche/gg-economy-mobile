/**
 * Dashboard Screen (Tab: index)
 *
 * The main dashboard showing financial overview including:
 * - Month selector for navigating between months
 * - Summary card with income, expenses, and balance
 * - Category breakdown with donut chart
 * - Trend charts for income vs expenses over time
 *
 * **Validates: Requirements 21, 22, 30**
 */
import { useCallback } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useDashboardData } from '../../src/hooks/useDashboardData';
import { LoadingIndicator } from '../../src/components/ui/LoadingIndicator';
import { EmptyState } from '../../src/components/ui/EmptyState';
import {
  SummaryCard,
  MonthSelector,
  CategoryBreakdown,
  TrendChart,
} from '../../src/components/dashboard';

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

  // Get dashboard data from hook
  const {
    summary,
    expenseBreakdown,
    trendData,
    selectedMonth,
    trendPeriod,
    isLoading,
    error,
    setTrendPeriod,
    previousMonth,
    nextMonth,
    refresh,
  } = useDashboardData();

  // Check if next month should be disabled (can't go beyond current month)
  const currentMonth = getCurrentMonth();
  const isNextDisabled = selectedMonth >= currentMonth;

  // Handle category press - navigate to filtered transactions
  const handleCategoryPress = useCallback(
    (categoryId: string | null, categoryName: string) => {
      // Navigate to transactions screen with category filter
      if (categoryId) {
        router.push({
          pathname: '/transactions',
          params: {
            categoryId,
            categoryName,
            month: selectedMonth,
          },
        });
      } else {
        // Navigate to all transactions for the month
        router.push({
          pathname: '/transactions',
          params: {
            month: selectedMonth,
          },
        });
      }
    },
    [router, selectedMonth]
  );

  // Handle refresh
  const handleRefresh = useCallback(() => {
    refresh();
  }, [refresh]);

  // Loading state
  if (isLoading && !summary) {
    return (
      <View style={styles.loadingContainer} accessible accessibilityLabel={t('common.loading')}>
        <LoadingIndicator size="large" />
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.errorContainer} accessible accessibilityLabel={t('common.error')}>
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
    summary.totalIncome > 0 || summary.totalExpenses > 0 || summary.transactionCount > 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={handleRefresh}
          tintColor="#3B82F6"
          accessibilityLabel={t('common.refresh')}
        />
      }
      accessible
      accessibilityLabel={t('dashboard.title')}
      accessibilityRole="scrollbar"
    >
      {/* Month Selector */}
      <MonthSelector
        selectedMonth={selectedMonth}
        onPreviousMonth={previousMonth}
        onNextMonth={nextMonth}
        disableNext={isNextDisabled}
        style={styles.monthSelector}
        testID="dashboard-month-selector"
      />

      {/* Summary Card */}
      <SummaryCard
        income={summary.totalIncome}
        expenses={summary.totalExpenses}
        balance={summary.balance}
        transactionCount={summary.transactionCount}
        style={styles.summaryCard}
        testID="dashboard-summary"
      />

      {/* Content based on data availability */}
      {hasData ? (
        <>
          {/* Category Breakdown */}
          <CategoryBreakdown
            data={expenseBreakdown}
            totalExpenses={summary.totalExpenses}
            onCategoryPress={handleCategoryPress}
            style={styles.categoryBreakdown}
            testID="dashboard-category-breakdown"
          />

          {/* Trend Chart */}
          <TrendChart
            data={trendData}
            selectedPeriod={trendPeriod}
            onPeriodChange={setTrendPeriod}
            style={styles.trendChart}
            testID="dashboard-trend-chart"
          />
        </>
      ) : (
        /* Empty State */
        <View style={styles.emptyStateContainer}>
          <EmptyState
            icon="📊"
            title={t('dashboard.noData')}
            description={t('empty.transactionsHint')}
            action={{
              label: t('import.selectFile'),
              onPress: () => router.push('/import'),
            }}
          />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F2F7',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F2F7',
    padding: 20,
  },
  monthSelector: {
    marginBottom: 16,
  },
  summaryCard: {
    marginBottom: 16,
  },
  categoryBreakdown: {
    marginBottom: 16,
  },
  trendChart: {
    marginBottom: 16,
  },
  emptyStateContainer: {
    marginTop: 32,
    alignItems: 'center',
  },
});
