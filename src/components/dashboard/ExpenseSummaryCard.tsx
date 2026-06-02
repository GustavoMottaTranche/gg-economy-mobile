/**
 * ExpenseSummaryCard Component
 *
 * Shows a compact summary of paid vs pending expenses for the month.
 * Uses the same filter as the pie chart (controlled externally).
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { formatCurrencyLocale, getCurrentLocale } from '../../i18n';
import { spacing, borderRadius, typography } from '../../constants/theme';

export interface ExpenseSummaryCardProps {
  /** Total paid amount (cents) for the current filter */
  paid: number;
  /** Total pending amount (cents) for the current filter */
  pending: number;
  testID?: string;
}

function ExpenseSummaryCardComponent({ paid, pending, testID }: ExpenseSummaryCardProps) {
  const colors = useThemeColors();
  const locale = getCurrentLocale();

  const total = paid + Math.abs(pending);
  const formattedPaid = formatCurrencyLocale(paid / 100, locale);
  const formattedPending = formatCurrencyLocale(Math.abs(pending) / 100, locale);
  const formattedTotal = formatCurrencyLocale(total / 100, locale);

  if (total === 0) return null;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.surface.card, borderColor: colors.border.subtle },
      ]}
      testID={testID}
    >
      {/* Totals */}
      <View style={styles.totalsRow}>
        <View style={styles.totalItem}>
          <Text style={[styles.totalLabel, { color: colors.semantic.success.base }]}>Pago</Text>
          <Text style={[styles.totalValue, { color: colors.semantic.success.base }]}>
            {formattedPaid}
          </Text>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border.default }]} />
        <View style={styles.totalItem}>
          <Text style={[styles.totalLabel, { color: colors.semantic.warning.base }]}>Pendente</Text>
          <Text style={[styles.totalValue, { color: colors.semantic.warning.base }]}>
            {formattedPending}
          </Text>
        </View>
      </View>

      {/* Total previsto */}
      <View style={[styles.predictedRow, { borderTopColor: colors.border.subtle }]}>
        <Text style={[styles.predictedLabel, { color: colors.text.secondary }]}>
          Total previsto
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

export const ExpenseSummaryCard = memo(ExpenseSummaryCardComponent);
export default ExpenseSummaryCard;
