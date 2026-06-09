/**
 * FundTransactionList Component
 *
 * Displays all linked transactions for a fund showing title, amount, date,
 * and reference month. Future-dated transactions (referenceMonth > current month)
 * are shown with muted styling and a "futuro"/"future" badge.
 *
 * **Validates: Requirements 8.4, 8.5, 9.2, 9.3**
 */

import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useThemeColors } from '../../hooks/useThemeColors';
import { formatCurrencyLocale, getCurrentLocale } from '../../i18n';
import { spacing, typography, borderRadius } from '../../constants/theme';
import { getReferenceMonth } from '../../utils/formatDate';
import type { FundTransactionWithDetails } from '../../repositories/FundTransactionRepository';

/**
 * Props for the FundTransactionList component.
 */
export interface FundTransactionListProps {
  /** List of linked transactions with details */
  transactions: FundTransactionWithDetails[];
  /** Optional test ID */
  testID?: string;
}

/**
 * Formats a date string (YYYY-MM-DD or ISO) into a short display format (DD/MM).
 */
function formatShortDate(dateStr: string): string {
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
 * Formats a reference month (YYYY-MM) into a short display (MM/YYYY).
 */
function formatReferenceMonthDisplay(refMonth: string): string {
  const parts = refMonth.split('-');
  if (parts.length !== 2) return refMonth;
  return `${parts[1]}/${parts[0]}`;
}

/**
 * FundTransactionList displays all linked transactions for a fund.
 * Transactions with a reference month after the current month are shown
 * with muted styling (lower opacity) and a "futuro"/"future" badge.
 * Shows an empty state when no transactions are linked.
 */
function FundTransactionListComponent({
  transactions,
  testID,
}: FundTransactionListProps): React.ReactElement {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const locale = getCurrentLocale();

  const currentMonth = useMemo(() => getReferenceMonth(new Date()), []);

  // Empty state
  if (transactions.length === 0) {
    return (
      <View style={styles.container} testID={testID}>
        <View style={styles.emptyContainer} testID={testID ? `${testID}-empty` : undefined}>
          <Text style={[styles.emptyText, { color: colors.text.tertiary }]}>
            {t('futurePlans.transactions.noLinkedTransactions')}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container} testID={testID}>
      {transactions.map((transaction, index) => {
        const isLast = index === transactions.length - 1;
        const isFuture = transaction.referenceMonth > currentMonth;
        const formattedAmount = formatCurrencyLocale(transaction.amount / 100, locale);
        const formattedDate = formatShortDate(transaction.date);
        const formattedRefMonth = formatReferenceMonthDisplay(transaction.referenceMonth);

        return (
          <View
            key={transaction.id}
            style={[
              styles.transactionItem,
              { borderBottomColor: colors.border.subtle },
              isLast && styles.lastItem,
              isFuture && styles.futureItem,
            ]}
            testID={testID ? `${testID}-item-${transaction.id}` : undefined}
          >
            <View style={styles.transactionLeft}>
              <View style={styles.titleRow}>
                <Text
                  style={[
                    styles.transactionTitle,
                    { color: colors.text.primary },
                    isFuture && styles.mutedText,
                  ]}
                  numberOfLines={1}
                >
                  {transaction.title}
                </Text>
                {isFuture && (
                  <View
                    style={[styles.futureBadge, { backgroundColor: colors.semantic.info.light }]}
                    testID={testID ? `${testID}-future-badge-${transaction.id}` : undefined}
                  >
                    <Text style={[styles.futureBadgeText, { color: colors.semantic.info.base }]}>
                      {t('futurePlans.transactions.futureIndicator')}
                    </Text>
                  </View>
                )}
              </View>
              <Text
                style={[
                  styles.transactionMeta,
                  { color: colors.text.tertiary },
                  isFuture && styles.mutedText,
                ]}
              >
                {formattedDate} • {formattedRefMonth}
              </Text>
            </View>
            <Text
              style={[
                styles.transactionAmount,
                { color: colors.text.primary },
                isFuture && styles.mutedText,
              ]}
            >
              {formattedAmount}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing.xs,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  emptyText: {
    fontSize: typography.caption.fontSize,
    fontStyle: 'italic',
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  lastItem: {
    borderBottomWidth: 0,
  },
  futureItem: {
    opacity: 0.6,
  },
  transactionLeft: {
    flex: 1,
    marginRight: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transactionTitle: {
    fontSize: 14,
    fontWeight: '400',
    flexShrink: 1,
  },
  transactionMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  futureBadge: {
    marginLeft: spacing.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  futureBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  mutedText: {
    opacity: 1, // opacity is applied at container level via futureItem
  },
});

/**
 * Memoized FundTransactionList for performance optimization.
 */
export const FundTransactionList = memo(FundTransactionListComponent);

export default FundTransactionList;
