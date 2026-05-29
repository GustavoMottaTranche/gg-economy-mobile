/**
 * PaymentStatusSummary Component
 *
 * Displays a summary of predicted vs. paid vs. pending totals for recurring
 * expenses in the selected month. Uses distinct colors for quick visual
 * differentiation: green for paid, orange/warning for pending.
 *
 * Hidden when predictedTotal equals zero (no recurring occurrences for the month).
 *
 * **Validates: Requirements 5.1, 5.3, 5.4, 5.6**
 */

import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeStyles } from '../../hooks/useThemeStyles';
import { formatCurrencyLocale, getCurrentLocale } from '../../i18n';

/**
 * Props for the PaymentStatusSummary component
 */
export interface PaymentStatusSummaryProps {
  /** Total predicted amount (sum of all recurring occurrences for the month) */
  predictedTotal: number;
  /** Total paid amount (sum of occurrences with isPaid=true) */
  paidTotal: number;
  /** Total pending amount (predictedTotal - paidTotal) */
  pendingTotal: number;
  /** Test ID for testing */
  testID?: string;
}

/**
 * PaymentStatusSummary component
 *
 * Renders a section showing predicted, paid, and pending totals for the month.
 * Returns null when predictedTotal is zero (hides the section).
 *
 * @example
 * ```tsx
 * <PaymentStatusSummary
 *   predictedTotal={150000}
 *   paidTotal={80000}
 *   pendingTotal={70000}
 *   testID="payment-summary"
 * />
 * ```
 */
function PaymentStatusSummaryComponent({
  predictedTotal,
  paidTotal,
  pendingTotal,
  testID,
}: PaymentStatusSummaryProps): React.ReactElement | null {
  const theme = useThemeStyles();
  const locale = getCurrentLocale();

  // Hide section when predictedTotal equals zero (Req 5.3)
  if (predictedTotal === 0) {
    return null;
  }

  const formattedPredicted = formatCurrencyLocale(predictedTotal / 100, locale);
  const formattedPaid = formatCurrencyLocale(paidTotal / 100, locale);
  const formattedPending = formatCurrencyLocale(pendingTotal / 100, locale);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          marginTop: theme.spacing.base,
          paddingTop: theme.spacing.md,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: theme.colors.border.subtle,
        },
        title: {
          fontSize: theme.typography.overline.fontSize,
          fontWeight: theme.typography.overline.fontWeight,
          lineHeight: theme.typography.overline.lineHeight,
          color: theme.colors.text.tertiary,
          textTransform: 'uppercase',
          letterSpacing: theme.typography.overline.letterSpacing,
          marginBottom: theme.spacing.sm,
        },
        row: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: theme.spacing.xs,
        },
        label: {
          fontSize: theme.typography.caption.fontSize,
          fontWeight: theme.typography.caption.fontWeight,
          lineHeight: theme.typography.caption.lineHeight,
          color: theme.colors.text.secondary,
        },
        predictedValue: {
          fontSize: theme.typography.caption.fontSize,
          fontWeight: '600',
          lineHeight: theme.typography.caption.lineHeight,
          color: theme.colors.text.primary,
        },
        paidValue: {
          fontSize: theme.typography.caption.fontSize,
          fontWeight: '600',
          lineHeight: theme.typography.caption.lineHeight,
          color: theme.colors.semantic.success.base,
        },
        pendingValue: {
          fontSize: theme.typography.caption.fontSize,
          fontWeight: '600',
          lineHeight: theme.typography.caption.lineHeight,
          color: theme.colors.semantic.warning.base,
        },
        indicator: {
          width: theme.spacing.xs,
          height: theme.spacing.xs,
          borderRadius: theme.spacing.xs / 2,
          marginRight: theme.spacing.sm,
        },
        paidIndicator: {
          backgroundColor: theme.colors.semantic.success.base,
        },
        pendingIndicator: {
          backgroundColor: theme.colors.semantic.warning.base,
        },
        labelRow: {
          flexDirection: 'row',
          alignItems: 'center',
        },
      }),
    [theme],
  );

  return (
    <View
      style={styles.container}
      testID={testID}
      accessibilityRole="summary"
      accessibilityLabel={`Previsto ${formattedPredicted}, Pago ${formattedPaid}, Pendente ${formattedPending}`}
    >
      <Text style={styles.title}>Previsto vs. Pago</Text>

      {/* Predicted total row */}
      <View style={styles.row} testID={testID ? `${testID}-predicted` : undefined}>
        <Text style={styles.label}>Previsto</Text>
        <Text style={styles.predictedValue}>{formattedPredicted}</Text>
      </View>

      {/* Paid total row - green (Req 5.6) */}
      <View style={styles.row} testID={testID ? `${testID}-paid` : undefined}>
        <View style={styles.labelRow}>
          <View style={[styles.indicator, styles.paidIndicator]} />
          <Text style={styles.label}>Pago</Text>
        </View>
        <Text style={styles.paidValue}>{formattedPaid}</Text>
      </View>

      {/* Pending total row - orange (Req 5.6) */}
      <View style={styles.row} testID={testID ? `${testID}-pending` : undefined}>
        <View style={styles.labelRow}>
          <View style={[styles.indicator, styles.pendingIndicator]} />
          <Text style={styles.label}>Pendente</Text>
        </View>
        <Text style={styles.pendingValue}>{formattedPending}</Text>
      </View>
    </View>
  );
}

/**
 * Memoized PaymentStatusSummary for performance optimization
 */
export const PaymentStatusSummary = memo(PaymentStatusSummaryComponent);

export default PaymentStatusSummary;
