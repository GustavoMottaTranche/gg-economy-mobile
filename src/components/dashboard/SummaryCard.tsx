/**
 * SummaryCard Component
 *
 * Displays a financial summary card showing income, expenses, and balance
 * for the selected month. Uses AmountDisplay for locale-aware formatting.
 *
 * **Validates: Requirements 21, 30**
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import { IncomeAmount, ExpenseAmount, BalanceAmount } from '../ui/AmountDisplay';

/**
 * Props for the SummaryCard component
 */
export interface SummaryCardProps {
  /** Total income in cents */
  income: number;
  /** Total expenses in cents */
  expenses: number;
  /** Balance (income - expenses) in cents */
  balance: number;
  /** Number of transactions */
  transactionCount?: number;
  /** Container style */
  style?: ViewStyle;
  /** Test ID for testing */
  testID?: string;
}

/**
 * SummaryCard component
 *
 * @example
 * ```tsx
 * <SummaryCard
 *   income={500000}
 *   expenses={350000}
 *   balance={150000}
 *   transactionCount={42}
 * />
 * ```
 */
function SummaryCardComponent({
  income,
  expenses,
  balance,
  transactionCount,
  style,
  testID,
}: SummaryCardProps): React.ReactElement {
  const { t } = useTranslation();

  return (
    <View
      style={[styles.container, style]}
      testID={testID}
      accessibilityRole="summary"
      accessibilityLabel={t('dashboard.monthlyOverview')}
    >
      {/* Balance - Main highlight */}
      <View style={styles.balanceSection}>
        <Text style={styles.balanceLabel}>{t('dashboard.balance')}</Text>
        <BalanceAmount amount={balance} size="xlarge" testID={`${testID}-balance`} />
      </View>

      {/* Income and Expenses row */}
      <View style={styles.detailsRow}>
        {/* Income */}
        <View style={styles.detailItem}>
          <View style={[styles.indicator, styles.incomeIndicator]} />
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>{t('dashboard.income')}</Text>
            <IncomeAmount amount={income} size="medium" showSign testID={`${testID}-income`} />
          </View>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Expenses */}
        <View style={styles.detailItem}>
          <View style={[styles.indicator, styles.expenseIndicator]} />
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>{t('dashboard.expenses')}</Text>
            <ExpenseAmount amount={-expenses} size="medium" testID={`${testID}-expenses`} />
          </View>
        </View>
      </View>

      {/* Transaction count (optional) */}
      {transactionCount !== undefined && transactionCount > 0 && (
        <View style={styles.transactionCountContainer}>
          <Text style={styles.transactionCount}>
            {t('review.transactionsToReview', { count: transactionCount })
              .replace(/to review/i, '')
              .replace(/para revisar/i, '')
              .trim()}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  balanceSection: {
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  balanceLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  indicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: 12,
  },
  incomeIndicator: {
    backgroundColor: '#16A34A',
  },
  expenseIndicator: {
    backgroundColor: '#DC2626',
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#9CA3AF',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 16,
  },
  transactionCountContainer: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    alignItems: 'center',
  },
  transactionCount: {
    fontSize: 12,
    color: '#9CA3AF',
  },
});

/**
 * Memoized SummaryCard for performance optimization
 */
export const SummaryCard = memo(SummaryCardComponent);

export default SummaryCard;
