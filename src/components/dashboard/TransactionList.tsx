/**
 * TransactionList Component
 *
 * Displays a list of transactions for an expanded category row.
 * Uses the `useCategoryTransactions` hook for lazy-loading data.
 * Shows loading, error, and empty states inline within the expanded CategoryRow.
 *
 * **Validates: Requirements 2.5**
 */

import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useCategoryTransactions } from '../../hooks/useCategoryTransactions';
import { useThemeColors } from '../../hooks/useThemeColors';
import { formatCurrencyLocale, getCurrentLocale } from '../../i18n';
import { spacing } from '../../constants/theme';

/**
 * Props for the TransactionList component
 */
export interface TransactionListProps {
  /** Category ID to fetch transactions for */
  categoryId: string;
  /** Reference month in YYYY-MM format */
  month: string;
  /** Test ID for testing */
  testID?: string;
}

/**
 * TransactionList component
 *
 * Renders inline within an expanded CategoryRow, displaying each transaction
 * with description, amount, and date. Transactions are ordered by date descending
 * (most recent first) as returned by the query.
 *
 * @example
 * ```tsx
 * <TransactionList
 *   categoryId="abc-123"
 *   month="2024-06"
 *   testID="transaction-list"
 * />
 * ```
 */
function TransactionListComponent({
  categoryId,
  month,
  testID,
}: TransactionListProps): React.ReactElement {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const locale = getCurrentLocale();

  const { transactions, isLoading, error, retry } = useCategoryTransactions(
    categoryId,
    month,
    true // Always enabled since this component is only rendered when expanded
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          paddingTop: spacing.sm,
          paddingBottom: spacing.xs,
        },
        loadingContainer: {
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: spacing.base,
        },
        errorContainer: {
          alignItems: 'center',
          paddingVertical: spacing.md,
        },
        errorText: {
          fontSize: 13,
          color: colors.semantic.danger.base,
          marginBottom: spacing.sm,
          textAlign: 'center',
        },
        retryButton: {
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.xs,
          borderRadius: spacing.xs,
          backgroundColor: colors.semantic.danger.light,
        },
        retryText: {
          fontSize: 13,
          fontWeight: '500',
          color: colors.semantic.danger.base,
        },
        emptyContainer: {
          alignItems: 'center',
          paddingVertical: spacing.md,
        },
        emptyText: {
          fontSize: 13,
          color: colors.text.tertiary,
          fontStyle: 'italic',
        },
        transactionItem: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: spacing.sm,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border.subtle,
        },
        transactionLeft: {
          flex: 1,
          marginRight: spacing.sm,
        },
        transactionDescription: {
          fontSize: 14,
          fontWeight: '400',
          color: colors.text.primary,
        },
        transactionDate: {
          fontSize: 12,
          color: colors.text.tertiary,
          marginTop: 2,
        },
        transactionAmount: {
          fontSize: 14,
          fontWeight: '600',
          color: colors.text.primary,
        },
      }),
    [colors]
  );

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.container} testID={testID}>
        <View style={styles.loadingContainer} testID={`${testID}-loading`}>
          <ActivityIndicator size="small" color={colors.interactive.primary} />
        </View>
      </View>
    );
  }

  // Error state with retry button
  if (error) {
    return (
      <View style={styles.container} testID={testID}>
        <View style={styles.errorContainer} testID={`${testID}-error`}>
          <Text style={styles.errorText}>
            {t('dashboard.transactionLoadError', { defaultValue: 'Erro ao carregar lançamentos' })}
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={retry}
            accessibilityRole="button"
            accessibilityLabel={t('common.retry', { defaultValue: 'Tentar novamente' })}
            testID={`${testID}-retry`}
          >
            <Text style={styles.retryText}>
              {t('common.retry', { defaultValue: 'Tentar novamente' })}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Empty state
  if (transactions.length === 0) {
    return (
      <View style={styles.container} testID={testID}>
        <View style={styles.emptyContainer} testID={`${testID}-empty`}>
          <Text style={styles.emptyText}>
            {t('dashboard.noTransactionsInMonth', { defaultValue: 'Nenhum lançamento neste mês' })}
          </Text>
        </View>
      </View>
    );
  }

  // Transaction list
  return (
    <View style={styles.container} testID={testID}>
      {transactions.map((transaction, index) => {
        const isLast = index === transactions.length - 1;
        const formattedAmount = formatCurrencyLocale(transaction.amount / 100, locale);
        const formattedDate = formatShortDate(transaction.date, locale);

        return (
          <View
            key={transaction.id}
            style={[styles.transactionItem, isLast && { borderBottomWidth: 0 }]}
            testID={`${testID}-item-${transaction.id}`}
          >
            <View style={styles.transactionLeft}>
              <Text style={styles.transactionDescription} numberOfLines={1}>
                {transaction.description ||
                  t('dashboard.noDescription', { defaultValue: 'Sem descrição' })}
              </Text>
              <Text style={styles.transactionDate}>{formattedDate}</Text>
            </View>
            <Text style={styles.transactionAmount}>{formattedAmount}</Text>
          </View>
        );
      })}
    </View>
  );
}

/**
 * Formats a date string (YYYY-MM-DD) into a short display format (DD/MM).
 * Falls back to locale-aware formatting if available.
 */
function formatShortDate(dateStr: string, _locale: string): string {
  try {
    const date = new Date(dateStr + 'T00:00:00');
    if (isNaN(date.getTime())) {
      return dateStr;
    }
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}`;
  } catch {
    return dateStr;
  }
}

/**
 * Memoized TransactionList for performance optimization
 */
export const TransactionList = memo(TransactionListComponent);

export default TransactionList;
