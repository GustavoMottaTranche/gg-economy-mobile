/**
 * SummaryCard Component
 *
 * Displays a financial summary card showing income, expenses, and balance
 * for the selected month. Uses AmountDisplay for locale-aware formatting.
 * Includes PaymentStatusSummary section showing predicted vs. paid vs. pending
 * totals for recurring expenses.
 *
 * Uses elevated shadow (lg level) and primary-tinted background to stand out
 * above other dashboard components in the visual hierarchy.
 *
 * **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.5, 8.1, 8.6, 10.1, 10.2, 10.3, 10.4**
 */

import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import { IncomeAmount, ExpenseAmount, BalanceAmount } from '../ui/AmountDisplay';
import { useThemeStyles } from '../../hooks/useThemeStyles';
import { PaymentStatusSummary } from './PaymentStatusSummary';
import { usePaymentTotals } from '../../stores/paymentStatusStore';

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
  /** Weekly recurring expenses total for the month (hidden when 0) */
  weeklyExpensesTotal?: number;
  /** Selected month in YYYY-MM format for payment status totals */
  selectedMonth?: string;
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
  weeklyExpensesTotal,
  selectedMonth,
  style,
  testID,
}: SummaryCardProps): React.ReactElement {
  const { t } = useTranslation();
  const theme = useThemeStyles();

  // Payment status totals from store
  const paymentTotals = usePaymentTotals(selectedMonth ?? '');

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          backgroundColor: theme.colors.semantic.primary.light,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.xl,
          ...theme.shadows.lg,
        },
        balanceSection: {
          alignItems: 'center',
          marginBottom: theme.spacing.lg,
          paddingBottom: theme.spacing.base,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: theme.colors.border.subtle,
        },
        balanceLabel: {
          fontSize: theme.typography.caption.fontSize,
          fontWeight: theme.typography.caption.fontWeight,
          lineHeight: theme.typography.caption.lineHeight,
          color: theme.colors.text.secondary,
          marginBottom: theme.spacing.xs,
          textTransform: 'uppercase',
          letterSpacing: theme.typography.overline.letterSpacing,
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
          width: theme.spacing.xs,
          height: theme.spacing['2xl'] + theme.spacing.sm,
          borderRadius: theme.spacing.xs / 2,
          marginRight: theme.spacing.md,
        },
        incomeIndicator: {
          backgroundColor: theme.colors.semantic.success.base,
        },
        expenseIndicator: {
          backgroundColor: theme.colors.semantic.danger.base,
        },
        detailContent: {
          flex: 1,
        },
        detailLabel: {
          fontSize: theme.typography.overline.fontSize,
          fontWeight: theme.typography.overline.fontWeight,
          lineHeight: theme.typography.overline.lineHeight,
          color: theme.colors.text.tertiary,
          marginBottom: theme.spacing.xs / 2,
          textTransform: 'uppercase',
          letterSpacing: theme.typography.overline.letterSpacing,
        },
        divider: {
          width: StyleSheet.hairlineWidth,
          height: theme.spacing['2xl'] + theme.spacing.sm,
          backgroundColor: theme.colors.border.default,
          marginHorizontal: theme.spacing.base,
        },
        transactionCountContainer: {
          marginTop: theme.spacing.base,
          paddingTop: theme.spacing.md,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: theme.colors.border.subtle,
          alignItems: 'center',
        },
        transactionCount: {
          fontSize: theme.typography.overline.fontSize,
          fontWeight: theme.typography.overline.fontWeight,
          lineHeight: theme.typography.overline.lineHeight,
          color: theme.colors.text.tertiary,
        },
        weeklyExpensesContainer: {
          marginTop: theme.spacing.base,
          paddingTop: theme.spacing.md,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: theme.colors.border.subtle,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        },
        weeklyExpensesLabel: {
          fontSize: theme.typography.overline.fontSize,
          fontWeight: theme.typography.overline.fontWeight,
          lineHeight: theme.typography.overline.lineHeight,
          color: theme.colors.text.tertiary,
          textTransform: 'uppercase',
          letterSpacing: theme.typography.overline.letterSpacing,
        },
      }),
    [theme]
  );

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

      {/* Weekly recurring expenses (shown only when total > 0) */}
      {weeklyExpensesTotal !== undefined && weeklyExpensesTotal > 0 && (
        <View style={styles.weeklyExpensesContainer} testID={`${testID}-weekly-expenses`}>
          <Text style={styles.weeklyExpensesLabel}>{t('dashboard.weeklyExpenses')}</Text>
          <ExpenseAmount
            amount={-weeklyExpensesTotal}
            size="small"
            testID={`${testID}-weekly-expenses-amount`}
          />
        </View>
      )}

      {/* Payment Status Summary - hidden when predictedTotal = 0 (handled internally) */}
      {paymentTotals && (
        <PaymentStatusSummary
          predictedTotal={paymentTotals.predictedTotal}
          paidTotal={paymentTotals.paidTotal}
          pendingTotal={paymentTotals.pendingTotal}
          testID={testID ? `${testID}-payment-status` : undefined}
        />
      )}
    </View>
  );
}

/**
 * Memoized SummaryCard for performance optimization
 */
export const SummaryCard = memo(SummaryCardComponent);

export default SummaryCard;
