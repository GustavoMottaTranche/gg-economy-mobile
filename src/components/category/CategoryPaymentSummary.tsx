/**
 * CategoryPaymentSummary Component
 *
 * Displays a compact summary of paid vs pending expenses for a category.
 * Matches the ExpenseSummaryCard layout: two-column row with divider
 * (green for paid, orange for pending), and a total row below.
 *
 * Hidden when grandTotal === 0.
 *
 * Requirements: 3.1, 3.5, 3.6, 3.7, 5.2, 5.3, 5.4, 5.5, 6.1, 6.3, 6.4
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useThemeColors } from '../../hooks/useThemeColors';
import { formatCurrencyLocale, getCurrentLocale } from '../../i18n';
import { spacing, borderRadius, typography } from '../../constants/theme';

export interface CategoryPaymentSummaryProps {
  /** Total paid amount in cents */
  paidTotal: number;
  /** Total pending amount in cents */
  pendingTotal: number;
  /** Grand total (paid + pending) in cents */
  grandTotal: number;
  /** Optional testID for testing */
  testID?: string;
}

function CategoryPaymentSummaryComponent({
  paidTotal,
  pendingTotal,
  grandTotal,
  testID,
}: CategoryPaymentSummaryProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const locale = getCurrentLocale();

  if (grandTotal === 0) return null;

  const formattedPaid = formatCurrencyLocale(paidTotal / 100, locale);
  const formattedPending = formatCurrencyLocale(pendingTotal / 100, locale);
  const formattedTotal = formatCurrencyLocale(grandTotal / 100, locale);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.surface.card, borderColor: colors.border.subtle },
      ]}
      testID={testID}
      accessibilityRole="summary"
      accessibilityLabel={t('categoryDetail.predictedTotal') + ': ' + formattedTotal}
    >
      {/* Top row: Paid | Pending */}
      <View style={styles.totalsRow}>
        <View style={styles.totalItem}>
          <Text style={[styles.totalLabel, { color: colors.semantic.success.base }]}>
            {t('categoryDetail.paid')}
          </Text>
          <Text style={[styles.totalValue, { color: colors.semantic.success.base }]}>
            {formattedPaid}
          </Text>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border.default }]} />
        <View style={styles.totalItem}>
          <Text style={[styles.totalLabel, { color: colors.semantic.warning.base }]}>
            {t('categoryDetail.pending')}
          </Text>
          <Text style={[styles.totalValue, { color: colors.semantic.warning.base }]}>
            {formattedPending}
          </Text>
        </View>
      </View>

      {/* Bottom row: Predicted total */}
      <View style={[styles.predictedRow, { borderTopColor: colors.border.subtle }]}>
        <Text style={[styles.predictedLabel, { color: colors.text.secondary }]}>
          {t('categoryDetail.predictedTotal')}
        </Text>
        <Text style={[styles.predictedValue, { color: colors.text.primary }]}>
          {formattedTotal}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.base,
    marginBottom: spacing.base,
  },
  totalsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  totalItem: {
    flex: 1,
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: typography.caption.fontSize,
    fontWeight: '500',
    marginBottom: 2,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  divider: {
    width: 1,
    height: 36,
  },
  predictedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  predictedLabel: {
    fontSize: typography.caption.fontSize,
    fontWeight: '500',
  },
  predictedValue: {
    fontSize: typography.body.fontSize,
    fontWeight: '700',
  },
});

export const CategoryPaymentSummary = memo(CategoryPaymentSummaryComponent);
export default CategoryPaymentSummary;
