/**
 * Transactions Screen (Tab: transactions)
 *
 * Displays transactions organized by month with:
 * - Monthly summary (income, expenses, balance)
 * - Transaction list sorted by date using FlashList
 * - Navigation between months
 * - Transaction deletion with confirmation
 * - Visual distinction for income vs expenses
 *
 * **Validates: Requirements 19, 20, 30**
 */
import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Alert, SafeAreaView, TouchableOpacity } from 'react-native';
import { FlashList, ListRenderItemInfo } from '@shopify/flash-list';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useTransactions, TransactionWithCategory } from '../../src/hooks/useTransactions';
import { MonthSelector } from '../../src/components/dashboard/MonthSelector';
import { TransactionCard } from '../../src/components/ui/TransactionCard';
import { LoadingIndicator } from '../../src/components/ui/LoadingIndicator';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { formatCurrencyLocale, getCurrentLocale } from '../../src/i18n';

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
 */
interface MonthlySummaryProps {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  transactionCount: number;
}

function MonthlySummary({
  totalIncome,
  totalExpenses,
  balance,
  transactionCount,
}: MonthlySummaryProps): React.ReactElement {
  const { t } = useTranslation();
  const locale = getCurrentLocale();

  // Convert from cents to currency units
  const formattedIncome = formatCurrencyLocale(totalIncome / 100, locale);
  const formattedExpenses = formatCurrencyLocale(totalExpenses / 100, locale);
  const formattedBalance = formatCurrencyLocale(balance / 100, locale);

  const balanceColor = balance >= 0 ? '#166534' : '#991b1b';

  return (
    <View
      style={styles.summaryContainer}
      testID="monthly-summary"
      accessible
      accessibilityRole="summary"
      accessibilityLabel={`${t('transactions.monthSummary')}: ${t('dashboard.income')} ${formattedIncome}, ${t('dashboard.expenses')} ${formattedExpenses}, ${t('dashboard.balance')} ${formattedBalance}`}
    >
      <Text style={styles.summaryTitle}>{t('transactions.monthSummary')}</Text>

      <View style={styles.summaryRow}>
        <View style={styles.summaryItem} accessibilityElementsHidden>
          <Text style={styles.summaryLabel}>{t('dashboard.income')}</Text>
          <Text style={[styles.summaryValue, styles.incomeValue]}>+{formattedIncome}</Text>
        </View>

        <View style={styles.summaryItem} accessibilityElementsHidden>
          <Text style={styles.summaryLabel}>{t('dashboard.expenses')}</Text>
          <Text style={[styles.summaryValue, styles.expenseValue]}>-{formattedExpenses}</Text>
        </View>
      </View>

      <View style={styles.balanceContainer} accessibilityElementsHidden>
        <Text style={styles.balanceLabel}>{t('dashboard.balance')}</Text>
        <Text style={[styles.balanceValue, { color: balanceColor }]}>
          {balance >= 0 ? '+' : ''}
          {formattedBalance}
        </Text>
      </View>

      <Text style={styles.transactionCount} accessibilityElementsHidden>
        {transactionCount} {transactionCount === 1 ? 'transaction' : 'transactions'}
      </Text>
    </View>
  );
}

/**
 * Transaction List Component using FlashList
 */
interface TransactionListProps {
  transactions: TransactionWithCategory[];
  onTransactionPress: (transaction: TransactionWithCategory) => void;
  onTransactionLongPress: (transaction: TransactionWithCategory) => void;
  ListHeaderComponent?: React.ReactElement;
  ListEmptyComponent?: React.ReactElement;
}

function TransactionList({
  transactions,
  onTransactionPress,
  onTransactionLongPress,
  ListHeaderComponent,
  ListEmptyComponent,
}: TransactionListProps): React.ReactElement {
  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<TransactionWithCategory>) => (
      <TouchableOpacity
        onLongPress={() => onTransactionLongPress(item)}
        delayLongPress={500}
        activeOpacity={1}
        testID={`transaction-item-${item.id}`}
      >
        <TransactionCard
          transaction={item}
          category={item.category}
          onPress={() => onTransactionPress(item)}
          testID={`transaction-card-${item.id}`}
        />
      </TouchableOpacity>
    ),
    [onTransactionPress, onTransactionLongPress]
  );

  const keyExtractor = useCallback((item: TransactionWithCategory) => item.id, []);

  return (
    <FlashList
      data={transactions}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      estimatedItemSize={100}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={ListEmptyComponent}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      testID="transactions-list"
    />
  );
}

/**
 * Main Transactions Screen Component
 */
export default function TransactionsScreen(): React.ReactElement {
  const { t } = useTranslation();
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth);
  const currentMonth = getCurrentMonth();

  // Fetch transactions for the selected month
  const { transactions, isLoading, error, summary, remove } = useTransactions({
    referenceMonth: selectedMonth,
  });

  // Navigation handlers
  const handlePreviousMonth = useCallback(() => {
    setSelectedMonth((prev) => getPreviousMonth(prev));
  }, []);

  const handleNextMonth = useCallback(() => {
    setSelectedMonth((prev) => getNextMonth(prev));
  }, []);

  // Transaction handlers
  const handleTransactionPress = useCallback((transaction: TransactionWithCategory) => {
    router.push(`/transaction/${transaction.id}`);
  }, []);

  const handleTransactionLongPress = useCallback(
    (transaction: TransactionWithCategory) => {
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
              await remove(transaction.id);
            } catch (err) {
              Alert.alert(t('common.error'), t('errors.generic'));
            }
          },
        },
      ]);
    },
    [t, remove]
  );

  const handleImport = useCallback(() => {
    router.push('/import');
  }, []);

  const handleAddManual = useCallback(() => {
    router.push('/(tabs)/manual');
  }, []);

  // Disable next button if we're at the current month
  const isNextDisabled = selectedMonth >= currentMonth;

  // Memoized header component
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
        <MonthlySummary
          totalIncome={summary.totalIncome}
          totalExpenses={summary.totalExpenses}
          balance={summary.balance}
          transactionCount={summary.transactionCount}
        />
      </View>
    ),
    [selectedMonth, handlePreviousMonth, handleNextMonth, isNextDisabled, summary]
  );

  // Memoized empty component
  const ListEmpty = useMemo(
    () => (
      <EmptyState
        icon="📊"
        title={t('empty.transactions')}
        description={t('empty.transactionsHint')}
        action={{
          label: t('import.selectFile'),
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

      <TransactionList
        transactions={transactions}
        onTransactionPress={handleTransactionPress}
        onTransactionLongPress={handleTransactionLongPress}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={transactions.length === 0 ? ListEmpty : undefined}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000000',
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 24,
    fontWeight: '400',
    color: '#FFFFFF',
    lineHeight: 28,
  },
  monthSelectorContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  summaryContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  summaryItem: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '600',
  },
  incomeValue: {
    color: '#166534',
  },
  expenseValue: {
    color: '#991b1b',
  },
  balanceContainer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
    paddingTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  balanceValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  transactionCount: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
  },
  listContent: {
    paddingBottom: 24,
  },
});
