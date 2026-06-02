/**
 * TransactionCard Component
 *
 * Displays a transaction with title as primary text, optional description as secondary text,
 * date+time in localized format, amount, and category.
 * Provides visual distinction for income (green) vs expenses (red).
 * Supports accessibility and i18n.
 *
 * **Validates: Requirements 8.1, 8.2, 8.3, 8.4, 30**
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle, TextStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import { formatCurrencyLocale, getCurrentLocale } from '../../i18n';
import { formatDateTimeForLocale } from './DateTimePicker';
import { TRANSACTION_COLORS, spacing, borderRadius, typography } from '../../constants/theme';
import { useThemeColors } from '../../hooks/useThemeColors';
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
}: TransactionCardProps): React.JSX.Element {
  const { t } = useTranslation();
  const locale = getCurrentLocale();
  const themeColors = useThemeColors();

  const isIncome = transaction.amount > 0;
  const isExcluded = transaction.isExcludedFromTotals;
  const isDuplicate = !!transaction.duplicateOf;
  const isRecurring = !!transaction.recurringId;

  // Determine colors based on transaction type and state
  const getColors = () => {
    if (isExcluded) {
      return TRANSACTION_COLORS.excluded;
    }
    return isIncome ? TRANSACTION_COLORS.income : TRANSACTION_COLORS.expense;
  };

  const txColors = getColors();

  // Format the date+time using locale-aware formatter
  const formattedDate = formatDateTimeForLocale(transaction.date, locale);

  // Format the amount (sign is handled manually in the template)
  const formattedAmount = formatCurrencyLocale(
    Math.abs(transaction.amount) / 100, // Convert from cents
    locale
  );

  // Build accessibility label
  const accessibilityLabel = [
    transaction.title,
    transaction.description || undefined,
    t('transactions.date'),
    formattedDate,
    isIncome ? t('dashboard.income') : t('dashboard.expenses'),
    formattedAmount,
    category?.name,
    isRecurring ? t('transactions.recurring') : '',
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
    { backgroundColor: themeColors.surface.card, borderColor: themeColors.border.default },
    selected && styles.selectedContainer,
    isExcluded && styles.excludedContainer,
    style,
  ].filter(Boolean) as ViewStyle[];

  const amountStyle: TextStyle[] = [
    styles.amount,
    { color: txColors.text },
    isExcluded && styles.excludedText,
  ].filter(Boolean) as TextStyle[];

  const content = (
    <View style={containerStyle} testID={testID}>
      {/* Left section: Title, Description, Date, and Category */}
      <View style={styles.leftSection}>
        <Text style={[styles.title, { color: themeColors.text.primary }]} numberOfLines={1}>
          {transaction.title}
        </Text>
        {transaction.description !== '' && (
          <Text
            style={[styles.description, { color: themeColors.text.secondary }]}
            numberOfLines={2}
          >
            {transaction.description}
          </Text>
        )}
        <Text style={[styles.date, { color: themeColors.text.tertiary }]} numberOfLines={1}>
          {formattedDate}
        </Text>
        {category && (
          <View style={styles.categoryContainer}>
            <View style={[styles.categoryDot, { backgroundColor: category.color }]} />
            <Text
              style={[styles.categoryName, { color: themeColors.text.secondary }]}
              numberOfLines={1}
            >
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
          {isRecurring && (
            <View style={styles.indicator} accessibilityLabel={t('transactions.recurring')}>
              <Text style={[styles.recurringIndicator, { color: themeColors.semantic.info.base }]}>
                ∞
              </Text>
            </View>
          )}
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
    borderRadius: borderRadius.md,
    padding: spacing.base,
    marginVertical: spacing.xs,
    marginHorizontal: spacing.base,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
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
    marginRight: spacing.md,
  },
  rightSection: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  title: {
    fontSize: typography.body.fontSize,
    fontWeight: '500',
    marginBottom: 2,
  },
  description: {
    fontSize: typography.caption.fontSize,
    marginBottom: 2,
  },
  date: {
    fontSize: typography.overline.fontSize + 1,
    marginBottom: spacing.xs,
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  categoryName: {
    fontSize: typography.overline.fontSize + 1,
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
    marginTop: spacing.xs,
  },
  indicator: {
    marginLeft: spacing.xs,
  },
  indicatorText: {
    fontSize: typography.overline.fontSize + 1,
  },
  recurringIndicator: {
    fontSize: typography.caption.fontSize + 1,
    fontWeight: '700',
  },
});

/**
 * Memoized TransactionCard for performance optimization
 */
export const TransactionCard = memo(TransactionCardComponent);

export default TransactionCard;
