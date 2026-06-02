/**
 * Transactions Screen (Tab: transactions)
 *
 * Displays transactions organized by month with:
 * - Redesigned header with screen title and add-transaction button
 * - Monthly summary with color-coded values (green income, red expenses)
 * - FilterPanel for category, value range, and date range filtering
 * - Unified statement list merging regular transactions and weekly recurring expenses
 * - Infinite scroll pagination via FlashList (page size 20)
 * - Navigation between months
 * - Transaction deletion with confirmation
 * - Payment status toggle for all transaction types
 * - Light/dark theme support via useThemeColors
 *
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 3.1, 3.2, 3.3, 3.4, 3.5, 4.6, 5.6, 6.1, 6.2, 6.3, 6.4, 6.6, 6.7, 6.8, 7.2, 7.4, 8.6, 9.1**
 */
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { FlashList, ListRenderItemInfo } from '@shopify/flash-list';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import {
  usePaginatedTransactions,
  type PaginatedTransactionWithCategory,
  type FilteredSummary,
} from '../../src/hooks/usePaginatedTransactions';
import { useFilterStore } from '../../src/stores/filterStore';
import { useCategories } from '../../src/hooks/useCategories';
import { FilterPanel } from '../../src/components/filters/FilterPanel';
import { MonthSelector } from '../../src/components/dashboard/MonthSelector';
import { TransactionCard } from '../../src/components/ui/TransactionCard';
import { LoadingIndicator } from '../../src/components/ui/LoadingIndicator';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { formatCurrencyLocale, getCurrentLocale } from '../../src/i18n';
import {
  deleteAllInGroup,
  deleteSingleParcel,
} from '../../src/services/installment/InstallmentGroupManager';
import { generateMonthlyTransactions } from '../../src/services/recurring/RecurringTransactionService';
import { deleteTransaction } from '../../src/db/queries/transactions';
import { useThemeColors } from '../../src/hooks/useThemeColors';
import { useThemeStore } from '../../src/stores/themeStore';
import { typography, spacing, borderRadius, shadows } from '../../src/constants/theme';
import {
  useWeeklyRecurringStore,
  useExpandedGroupIds,
} from '../../src/stores/weeklyRecurringStore';
import {
  useWeeklyOccurrences,
  useWeeklyGroups,
  useWeeklyMonthlyTotal,
} from '../../src/stores/weeklyRecurringStore';
import { usePaymentStatusStore } from '../../src/stores/paymentStatusStore';
import { useUnifiedStatementItems } from '../../src/hooks/useUnifiedStatementItems';
import { WeeklyGroupItem } from '../../src/components/WeeklyGroupItem';

import { PaymentStatusToggle } from '../../src/components/PaymentStatusToggle';
import type { UnifiedStatementItem } from '../../src/types/unifiedStatementItem';
import type { WeeklyOccurrence } from '../../src/types/weeklyRecurring';

/**
 * Gets the current month in YYYY-MM format
 */
function getCurrentMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Gets the previous month from a YYYY-MM string
 */
function getPreviousMonth(monthStr: string): string {
  const [year, month] = monthStr.split('-').map(Number);
  const date = new Date(year!, month! - 1, 1);
  date.setMonth(date.getMonth() - 1);
  const newYear = date.getFullYear();
  const newMonth = (date.getMonth() + 1).toString().padStart(2, '0');
  return `${newYear}-${newMonth}`;
}

/**
 * Gets the next month from a YYYY-MM string
 */
function getNextMonth(monthStr: string): string {
  const [year, month] = monthStr.split('-').map(Number);
  const date = new Date(year!, month! - 1, 1);
  date.setMonth(date.getMonth() + 1);
  const newYear = date.getFullYear();
  const newMonth = (date.getMonth() + 1).toString().padStart(2, '0');
  return `${newYear}-${newMonth}`;
}

/**
 * Monthly Summary Header Component
 *
 * Displays income (green), expenses (red), and balance using semantic color tokens.
 * Includes weekly recurring expenses in the totals.
 */
interface MonthlySummaryProps {
  summary: FilteredSummary;
  weeklyTotal: number; // in currency units (same as weekly_occurrences.amount)
}

function MonthlySummary({ summary, weeklyTotal }: MonthlySummaryProps): React.ReactElement {
  const { t } = useTranslation();
  const locale = getCurrentLocale();
  const colors = useThemeColors();
  const resolvedScheme = useThemeStore((s) => s.resolvedScheme);
  const themeShadows = shadows[resolvedScheme];

  const { totalIncome = 0, totalExpenses = 0, balance = 0, transactionCount = 0 } = summary || {};

  // All values are now in cents - divide by 100 for display
  const incomeDisplay = totalIncome / 100;
  const expensesDisplay = (Math.abs(totalExpenses) + (weeklyTotal || 0)) / 100;
  const balanceDisplay = (balance - (weeklyTotal || 0)) / 100;

  const formattedIncome = formatCurrencyLocale(incomeDisplay, locale);
  const formattedExpenses = formatCurrencyLocale(expensesDisplay, locale);
  const formattedBalance = formatCurrencyLocale(balanceDisplay, locale);

  const balanceColor =
    balanceDisplay >= 0 ? colors.semantic.success.dark : colors.semantic.danger.dark;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        summaryContainer: {
          backgroundColor: colors.surface.card,
          marginHorizontal: spacing.base,
          marginVertical: spacing.sm,
          borderRadius: borderRadius.md,
          padding: spacing.base,
          ...themeShadows.sm,
        },
        summaryTitle: {
          fontSize: typography.caption.fontSize,
          fontWeight: '600',
          color: colors.text.secondary,
          marginBottom: spacing.md,
          textTransform: 'uppercase',
          letterSpacing: typography.overline.letterSpacing,
        },
        summaryRow: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginBottom: spacing.base,
        },
        summaryItem: {
          flex: 1,
        },
        summaryLabel: {
          fontSize: typography.overline.fontSize,
          fontWeight: typography.overline.fontWeight,
          color: colors.text.tertiary,
          marginBottom: spacing.xs,
        },
        summaryValue: {
          fontSize: typography.body.fontSize + 2,
          fontWeight: '600',
        },
        incomeValue: {
          color: colors.semantic.success.dark,
        },
        expenseValue: {
          color: colors.semantic.danger.dark,
        },
        balanceContainer: {
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border.default,
          paddingTop: spacing.md,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        },
        balanceLabel: {
          fontSize: typography.caption.fontSize + 1,
          fontWeight: '500',
          color: colors.text.primary,
        },
        balanceValue: {
          fontSize: typography.title.fontSize - 2,
          fontWeight: '700',
        },
        transactionCount: {
          fontSize: typography.overline.fontSize,
          fontWeight: typography.overline.fontWeight,
          color: colors.text.tertiary,
          marginTop: spacing.sm,
          textAlign: 'center',
        },
      }),
    [colors, themeShadows]
  );

  return (
    <View
      style={styles.summaryContainer}
      testID="monthly-summary"
      accessible
      accessibilityRole="summary"
      accessibilityLabel={`${t('transactions.monthSummary')}: ${t('dashboard.income')} ${formattedIncome}, ${t('dashboard.expenses')} ${formattedExpenses}, ${t('dashboard.balance')} ${formattedBalance}`}
    >
      <Text style={styles.summaryTitle} numberOfLines={1}>
        {t('transactions.monthSummary')}
      </Text>

      <View style={styles.summaryRow}>
        <View style={styles.summaryItem} accessibilityElementsHidden>
          <Text style={styles.summaryLabel} numberOfLines={1}>
            {t('dashboard.income')}
          </Text>
          <Text style={[styles.summaryValue, styles.incomeValue]} numberOfLines={1}>
            +{formattedIncome}
          </Text>
        </View>

        <View style={styles.summaryItem} accessibilityElementsHidden>
          <Text style={styles.summaryLabel} numberOfLines={1}>
            {t('dashboard.expenses')}
          </Text>
          <Text style={[styles.summaryValue, styles.expenseValue]} numberOfLines={1}>
            -{formattedExpenses}
          </Text>
        </View>
      </View>

      <View style={styles.balanceContainer} accessibilityElementsHidden>
        <Text style={styles.balanceLabel} numberOfLines={1}>
          {t('dashboard.balance')}
        </Text>
        <Text style={[styles.balanceValue, { color: balanceColor }]} numberOfLines={1}>
          {balanceDisplay >= 0 ? '+' : ''}
          {formattedBalance}
        </Text>
      </View>

      <Text style={styles.transactionCount} numberOfLines={1} accessibilityElementsHidden>
        {transactionCount} {transactionCount === 1 ? 'transaction' : 'transactions'}
      </Text>
    </View>
  );
}

/**
 * Main Transactions Screen Component
 */
export default function TransactionsScreen(): React.ReactElement {
  const { t } = useTranslation();
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth);

  const colors = useThemeColors();
  const locale = getCurrentLocale();

  // Filter store state and actions
  const filters = useFilterStore((s) => s.filters);
  const isExpanded = useFilterStore((s) => s.isExpanded);
  const setExpanded = useFilterStore((s) => s.setExpanded);
  const resetDateRange = useFilterStore((s) => s.resetDateRange);

  // Categories for FilterPanel
  const { categories } = useCategories();

  // Paginated transactions with filter support (includes pendingOnly)
  const { transactions, isLoading, isLoadingMore, error, hasMore, summary, loadMore } =
    usePaginatedTransactions({
      referenceMonth: selectedMonth,
      categoryIds: filters.categoryIds.length > 0 ? filters.categoryIds : undefined,
      minAmount: filters.minAmount,
      maxAmount: filters.maxAmount,
      startDate: filters.startDate,
      endDate: filters.endDate,
      pendingOnly: filters.pendingOnly || undefined,
    });

  // Weekly occurrences for the selected month
  const weeklyOccurrences = useWeeklyOccurrences(selectedMonth);
  const weeklyGroups = useWeeklyGroups();
  const expandedGroupIds = useExpandedGroupIds();

  // Weekly expenses total - use the same source as the home (store's monthlyTotal)
  // This value is in currency units (same as weekly_occurrences.amount)
  const weeklyMonthlyTotal = useWeeklyMonthlyTotal(selectedMonth);

  // Payment status store for optimistic toggle
  const togglePaymentStatus = usePaymentStatusStore((s) => s.togglePaymentStatus);

  // Unified statement items merging transactions and weekly occurrences
  const unifiedItems = useUnifiedStatementItems({
    transactions,
    weeklyOccurrences,
    weeklyGroups,
    pendingOnly: filters.pendingOnly,
    expandedGroupIds,
  });

  // Generate recurring transactions for the selected month (idempotent)
  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        await generateMonthlyTransactions(selectedMonth);
      } catch (err) {
        console.warn('[Transactions] Failed to generate recurring transactions:', err);
      }

      if (cancelled) return;

      // Load weekly groups (only if not already loaded)
      const store = useWeeklyRecurringStore.getState();
      if (store.groups.length === 0) {
        await store.loadGroups();
      }

      if (cancelled) return;

      // Load occurrences for this month
      await store.loadOccurrencesForMonth(selectedMonth);
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [selectedMonth]);

  // Reset filters and pagination when reference month changes
  const handleMonthChange = useCallback(
    (newMonth: string) => {
      setSelectedMonth(newMonth);
      resetDateRange();
    },
    [resetDateRange]
  );

  // Dynamic styles based on theme
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: colors.background.secondary,
        },
        header: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: spacing.base,
          paddingVertical: spacing.md,
          backgroundColor: colors.background.primary,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border.default,
        },
        title: {
          fontSize: typography.heading.fontSize,
          fontWeight: typography.heading.fontWeight,
          lineHeight: typography.heading.lineHeight,
          color: colors.text.primary,
        },
        addButton: {
          width: spacing['2xl'] + spacing.xs,
          height: spacing['2xl'] + spacing.xs,
          borderRadius: (spacing['2xl'] + spacing.xs) / 2,
          backgroundColor: colors.interactive.primary,
          justifyContent: 'center',
          alignItems: 'center',
        },
        addButtonText: {
          fontSize: spacing.xl,
          fontWeight: '400',
          color: colors.text.inverse,
          lineHeight: typography.heading.lineHeight,
        },
        monthSelectorContainer: {
          paddingHorizontal: spacing.base,
          paddingTop: spacing.base,
          paddingBottom: spacing.sm,
        },
        filterPanelContainer: {
          paddingHorizontal: spacing.base,
          paddingBottom: spacing.sm,
        },
        listContent: {
          flex: 1,
        },
        loadingFooter: {
          paddingVertical: spacing.base,
          alignItems: 'center',
          justifyContent: 'center',
        },
      }),
    [colors]
  );

  // Navigation handlers
  const handlePreviousMonth = useCallback(() => {
    handleMonthChange(getPreviousMonth(selectedMonth));
  }, [selectedMonth, handleMonthChange]);

  const handleNextMonth = useCallback(() => {
    handleMonthChange(getNextMonth(selectedMonth));
  }, [selectedMonth, handleMonthChange]);

  // Filter panel handlers
  const handleFilterToggle = useCallback(() => {
    setExpanded(!isExpanded);
  }, [isExpanded, setExpanded]);

  const handleFiltersChange = useCallback((newFilters: typeof filters) => {
    const store = useFilterStore.getState();
    store.setCategoryIds(newFilters.categoryIds);
    store.setMinAmount(newFilters.minAmount);
    store.setMaxAmount(newFilters.maxAmount);
    store.setStartDate(newFilters.startDate);
    store.setEndDate(newFilters.endDate);
  }, []);

  // Transaction handlers
  const handleTransactionPress = useCallback((transaction: PaginatedTransactionWithCategory) => {
    router.push(`/transaction/${transaction.id}`);
  }, []);

  const handleTransactionLongPress = useCallback(
    (transaction: PaginatedTransactionWithCategory) => {
      if (transaction.installmentGroupId) {
        // Group-aware delete dialog for installment parcels
        Alert.alert(
          t('transactions.installmentDelete.title'),
          t('transactions.installmentDelete.message'),
          [
            {
              text: t('common.cancel'),
              style: 'cancel',
            },
            {
              text: t('transactions.installmentDelete.deleteSingle'),
              onPress: async () => {
                try {
                  await deleteSingleParcel(transaction.id, transaction.installmentGroupId!);
                } catch (_err) {
                  Alert.alert(
                    t('transactions.installmentDelete.errorTitle'),
                    t('transactions.installmentDelete.errorMessage')
                  );
                }
              },
            },
            {
              text: t('transactions.installmentDelete.deleteAll'),
              style: 'destructive',
              onPress: async () => {
                try {
                  await deleteAllInGroup(transaction.installmentGroupId!);
                } catch (_err) {
                  Alert.alert(
                    t('transactions.installmentDelete.errorTitle'),
                    t('transactions.installmentDelete.errorMessage')
                  );
                }
              },
            },
          ]
        );
      } else {
        // Normal single delete confirmation
        Alert.alert(t('transactions.deleteTransaction'), t('transactions.deleteConfirmation'), [
          {
            text: t('common.cancel'),
            style: 'cancel',
          },
          {
            text: t('common.delete'),
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteTransaction(transaction.id);
              } catch (_err) {
                Alert.alert(t('common.error'), t('errors.generic'));
              }
            },
          },
        ]);
      }
    },
    [t]
  );

  const handleAddManual = useCallback(() => {
    router.push('/(tabs)/manual');
  }, []);

  const handleImport = useCallback(() => {
    router.push('/import');
  }, []);

  // Pull-to-refresh handler
  const [isRefreshing, setIsRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const store = useWeeklyRecurringStore.getState();
      await store.loadGroups();
      await store.loadOccurrencesForMonth(selectedMonth);
    } finally {
      setIsRefreshing(false);
    }
  }, [selectedMonth]);

  // Weekly group expand/collapse handler
  const handleToggleGroupExpansion = useCallback((groupId: string) => {
    useWeeklyRecurringStore.getState().toggleGroupExpansion(groupId);
  }, []);

  // Weekly parcel press handler (navigate to parcel detail view)
  const handleParcelPress = useCallback((occurrence: WeeklyOccurrence) => {
    router.push({
      pathname: '/weekly-recurring/parcel-detail',
      params: { occurrenceId: occurrence.id },
    });
  }, []);

  // Edit group handler (navigate to edit screen)
  const handleEditGroup = useCallback((groupId: string) => {
    router.push(`/weekly-recurring/${groupId}?edit=true`);
  }, []);

  // Delete group handler (confirmation dialog + store action)
  const handleDeleteGroup = useCallback(
    (groupId: string) => {
      Alert.alert(
        'Excluir grupo',
        'Tem certeza que deseja excluir este grupo? Ocorrências futuras serão removidas. Esta ação é irreversível.',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Excluir',
            style: 'destructive',
            onPress: async () => {
              try {
                await useWeeklyRecurringStore.getState().deleteGroup(groupId);
                await useWeeklyRecurringStore.getState().loadGroups();
                await useWeeklyRecurringStore.getState().loadOccurrencesForMonth(selectedMonth);
              } catch (_err) {
                Alert.alert('Erro', 'Não foi possível excluir o grupo.');
              }
            },
          },
        ]
      );
    },
    [selectedMonth]
  );

  // Payment status toggle for weekly occurrences (optimistic update via paymentStatusStore)
  const handleToggleWeeklyPaymentStatus = useCallback(
    (occurrenceId: string) => {
      togglePaymentStatus(occurrenceId, 'weekly').then(() => {
        // Refresh weekly occurrences after toggle
        useWeeklyRecurringStore.getState().loadOccurrencesForMonth(selectedMonth);
      });
    },
    [togglePaymentStatus, selectedMonth]
  );

  // Payment status toggle for regular transactions (optimistic update via paymentStatusStore)
  const handleToggleTransactionPaymentStatus = useCallback(
    (transactionId: string) => {
      togglePaymentStatus(transactionId, 'monthly');
    },
    [togglePaymentStatus]
  );

  // Allow navigating to future months (for projected recurring expenses)
  const isNextDisabled = false;

  // Render item for FlashList using type discrimination on UnifiedStatementItem
  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<UnifiedStatementItem>) => {
      switch (item.type) {
        case 'weeklyGroupHeader': {
          const groupOccurrences = weeklyOccurrences.filter(
            (occ) => occ.weeklyGroupId === item.data.group.id
          );
          return (
            <WeeklyGroupItem
              group={item.data.group}
              occurrences={groupOccurrences}
              isExpanded={item.data.isExpanded}
              onToggleExpand={handleToggleGroupExpansion}
              onParcelPress={handleParcelPress}
              onTogglePaymentStatus={handleToggleWeeklyPaymentStatus}
              pendingOnly={filters.pendingOnly}
              onEditGroup={handleEditGroup}
              onDeleteGroup={handleDeleteGroup}
              testID={`weekly-group-${item.data.group.id}`}
            />
          );
        }
        case 'weeklyParcel': {
          // Parcels are rendered inside WeeklyGroupItem when expanded
          // This case handles any orphan parcel items in the list (shouldn't normally occur)
          return null;
        }
        case 'transaction': {
          const transaction = item.data;
          return (
            <View style={statementStyles.transactionRow}>
              <PaymentStatusToggle
                isPaid={transaction.isPaid ?? false}
                onToggle={() => handleToggleTransactionPaymentStatus(transaction.id)}
                size="small"
                testID={`payment-toggle-${transaction.id}`}
              />
              <View style={statementStyles.transactionCardContainer}>
                <TouchableOpacity
                  onLongPress={() => handleTransactionLongPress(transaction)}
                  delayLongPress={500}
                  activeOpacity={1}
                  testID={`transaction-item-${transaction.id}`}
                >
                  <TransactionCard
                    transaction={transaction}
                    category={transaction.category}
                    onPress={() => handleTransactionPress(transaction)}
                    testID={`transaction-card-${transaction.id}`}
                  />
                </TouchableOpacity>
              </View>
            </View>
          );
        }
        default:
          return null;
      }
    },
    [
      weeklyOccurrences,
      filters.pendingOnly,
      handleToggleGroupExpansion,
      handleParcelPress,
      handleToggleWeeklyPaymentStatus,
      handleToggleTransactionPaymentStatus,
      handleTransactionPress,
      handleTransactionLongPress,
      handleEditGroup,
      handleDeleteGroup,
    ]
  );

  const keyExtractor = useCallback((item: UnifiedStatementItem) => {
    switch (item.type) {
      case 'transaction':
        return `tx-${item.data.id}`;
      case 'weeklyGroupHeader':
        return `wg-${item.data.group.id}`;
      case 'weeklyParcel':
        return `wp-${item.data.id}`;
      default:
        return String(Math.random());
    }
  }, []);

  // Loading footer component for infinite scroll
  const ListFooterComponent = useMemo(() => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.loadingFooter} testID="loading-more-indicator">
        <ActivityIndicator size="small" color={colors.interactive.primary} />
      </View>
    );
  }, [isLoadingMore, styles.loadingFooter, colors.interactive.primary]);

  // Memoized header component (MonthSelector + FilterPanel + MonthlySummary)
  const ListHeader = useMemo(
    () => (
      <View>
        <View style={styles.monthSelectorContainer}>
          <MonthSelector
            selectedMonth={selectedMonth}
            onPreviousMonth={handlePreviousMonth}
            onNextMonth={handleNextMonth}
            disableNext={isNextDisabled}
            testID="month-selector"
          />
        </View>
        <View style={styles.filterPanelContainer}>
          <FilterPanel
            isExpanded={isExpanded}
            onToggle={handleFilterToggle}
            filters={filters}
            onFiltersChange={handleFiltersChange}
            categories={categories}
            locale={locale as 'pt-BR' | 'en'}
          />
        </View>
        <MonthlySummary summary={summary} weeklyTotal={weeklyMonthlyTotal} />
      </View>
    ),
    [
      selectedMonth,
      handlePreviousMonth,
      handleNextMonth,
      isNextDisabled,
      isExpanded,
      handleFilterToggle,
      filters,
      handleFiltersChange,
      categories,
      locale,
      summary,
      weeklyMonthlyTotal,
      styles,
    ]
  );

  // Memoized empty component
  const ListEmpty = useMemo(
    () => (
      <EmptyState
        icon="📊"
        title={t('empty.transactions')}
        description={t('empty.transactionsHint')}
        action={{
          label: t('fileImport.selectFile'),
          onPress: handleImport,
        }}
        testID="empty-transactions"
      />
    ),
    [t, handleImport]
  );

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('transactions.title')}</Text>
        </View>
        <LoadingIndicator message={t('common.loading')} testID="loading-indicator" />
      </SafeAreaView>
    );
  }

  // Error state
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('transactions.title')}</Text>
        </View>
        <EmptyState icon="⚠️" title={t('common.error')} description={error} testID="error-state" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} testID="transactions-screen">
      <View style={styles.header}>
        <Text style={styles.title}>{t('transactions.title')}</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddManual}
          accessibilityRole="button"
          accessibilityLabel={t('transactions.addTransaction')}
          testID="add-transaction-button"
        >
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.listContent}>
        <FlashList
          data={unifiedItems}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={unifiedItems.length === 0 ? ListEmpty : undefined}
          ListFooterComponent={ListFooterComponent}
          onEndReached={hasMore ? loadMore : undefined}
          onEndReachedThreshold={0.5}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
          testID="transactions-list"
        />
      </View>
    </SafeAreaView>
  );
}

/**
 * Static styles for the unified statement item rendering.
 * Used by the renderItem function for transaction rows with payment toggle.
 */
const statementStyles = StyleSheet.create({
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: spacing.base,
  },
  transactionCardContainer: {
    flex: 1,
  },
});
