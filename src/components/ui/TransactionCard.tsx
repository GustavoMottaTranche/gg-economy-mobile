/**
 * TransactionCard Component
 *
 * Displays a transaction with date, description, amount, and category.
 * Provides visual distinction for income (green) vs expenses (red).
 * Supports accessibility and i18n.
 *
 * **Validates: Requirements 30**
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle, TextStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import { formatCurrencyLocale, formatDateLocale, getCurrentLocale } from '../../i18n';
import { TRANSACTION_COLORS } from '../../constants/theme';
import type { Transaction } from '../../types/transaction';
import type { Category } from '../../types/category';

/**
 * Props for the TransactionCard component
 */
export interface TransactionCardProps {
  /** Transaction data to display */
  transaction: Transaction;
  /** Optional category data for display */
  category?: Category | null;
  /** Callback when the card is pressed */
  onPress?: (transaction: Transaction) => void;
  /** Whether the card is in a selected state */
  selected?: boolean;
  /** Whether to show the duplicate indicator */
  showDuplicateIndicator?: boolean;
  /** Whether to show the excluded indicator */
  showExcludedIndicator?: boolean;
  /** Custom container style */
  style?: ViewStyle;
  /** Test ID for testing */
  testID?: string;
}

/**
 * TransactionCard component
 *
 * @example
 * ```tsx
 * <TransactionCard
 *   transaction={transaction}
 *   category={category}
 *   onPress={(t) => navigateToDetail(t.id)}
 * />
 * ```
 */
function TransactionCardComponent({
  transaction,
  category,
  onPress,
  selected = false,
  showDuplicateIndicator = true,
  showExcludedIndicator = true,
  style,
  testID,
}: TransactionCardProps): JSX.Element {
  const { t } = useTranslation();
  const locale = getCurrentLocale();

  const isIncome = transaction.amount > 0;
  const isExcluded = transaction.isExcludedFromTotals;
  const isDuplicate = !!transaction.duplicateOf;

  // Determine colors based on transaction type and state
  const getColors = () => {
    if (isExcluded) {
      return TRANSACTION_COLORS.excluded;
    }
    return isIncome ? TRANSACTION_COLORS.income : TRANSACTION_COLORS.expense;
  };

  const colors = getColors();

  // Format the date
  const formattedDate = formatDateLocale(transaction.date, locale, {
    dateStyle: 'short',
  });

  // Format the amount
  const formattedAmount = formatCurrencyLocale(
    Math.abs(transaction.amount) / 100, // Convert from cents
    locale,
    { showPositiveSign: isIncome }
  );

  // Build accessibility label
  const accessibilityLabel = [
    t('transactions.date'),
    formattedDate,
    transaction.description,
    isIncome ? t('dashboard.income') : t('dashboard.expenses'),
    formattedAmount,
    category?.name,
    isExcluded ? t('transactions.excluded') : '',
    isDuplicate ? t('transactions.duplicate') : '',
  ]
    .filter(Boolean)
    .join(', ');

  const handlePress = () => {
    if (onPress) {
      onPress(transaction);
    }
  };

  const containerStyle: ViewStyle[] = [
    styles.container,
    selected && styles.selectedContainer,
    isExcluded && styles.excludedContainer,
    style,
  ].filter(Boolean) as ViewStyle[];

  const amountStyle: TextStyle[] = [
    styles.amount,
    { color: colors.text },
    isExcluded && styles.excludedText,
  ].filter(Boolean) as TextStyle[];

  const content = (
    <View style={containerStyle} testID={testID}>
      {/* Left section: Date and Description */}
      <View style={styles.leftSection}>
        <Text style={styles.date} numberOfLines={1}>
          {formattedDate}
        </Text>
        <Text style={styles.description} numberOfLines={2}>
          {transaction.description}
        </Text>
        {category && (
          <View style={styles.categoryContainer}>
            <View style={[styles.categoryDot, { backgroundColor: category.color }]} />
            <Text style={styles.categoryName} numberOfLines={1}>
              {category.name}
            </Text>
          </View>
        )}
      </View>

      {/* Right section: Amount and Indicators */}
      <View style={styles.rightSection}>
        <Text style={amountStyle}>
          {isIncome ? '+' : '-'}
          {formattedAmount}
        </Text>

        {/* Indicators */}
        <View style={styles.indicators}>
          {showDuplicateIndicator && isDuplicate && (
            <View style={styles.indicator} accessibilityLabel={t('transactions.duplicate')}>
              <Text style={styles.indicatorText}>⚠️</Text>
            </View>
          )}
          {showExcludedIndicator && isExcluded && (
            <View style={styles.indicator} accessibilityLabel={t('transactions.excluded')}>
              <Text style={styles.indicatorText}>🚫</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={t('transactions.editTransaction')}
        testID={testID ? `${testID}-touchable` : undefined}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <View accessibilityRole="text" accessibilityLabel={accessibilityLabel}>
      {content}
    </View>
  );
}

/**
 * Styles for TransactionCard
 */
const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 4,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  selectedContainer: {
    borderColor: TRANSACTION_COLORS.selected.border,
    backgroundColor: TRANSACTION_COLORS.selected.background,
  },
  excludedContainer: {
    backgroundColor: TRANSACTION_COLORS.excluded.background,
    opacity: 0.7,
  },
  leftSection: {
    flex: 1,
    marginRight: 12,
  },
  rightSection: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  date: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  description: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  categoryName: {
    fontSize: 12,
    color: '#6b7280',
  },
  amount: {
    fontSize: 18,
    fontWeight: '600',
  },
  excludedText: {
    textDecorationLine: 'line-through',
    color: TRANSACTION_COLORS.excluded.text,
  },
  indicators: {
    flexDirection: 'row',
    marginTop: 4,
  },
  indicator: {
    marginLeft: 4,
  },
  indicatorText: {
    fontSize: 12,
  },
});

/**
 * Memoized TransactionCard for performance optimization
 */
export const TransactionCard = memo(TransactionCardComponent);

export default TransactionCard;
