/**
 * InstallmentPreview Component
 *
 * Displays an ordered list of installment parcels showing:
 * - Parcel number (X/N)
 * - Reference month (locale-formatted)
 * - Amount (or hint text when amount is not yet entered)
 *
 * This is a presentational component that receives pre-calculated
 * installment data and renders the preview list.
 *
 * **Validates: Requirements 7.1, 7.2, 7.3, 7.4**
 */
import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useThemeColors } from '../hooks/useThemeColors';
import { spacing, borderRadius, typography } from '../constants/theme';
import { AmountDisplay } from './ui/AmountDisplay';
import type { InstallmentDetail } from '../types/installment';

/**
 * Props for the InstallmentPreview component
 */
export interface InstallmentPreviewProps {
  /** Array of installment details to display */
  installments: InstallmentDetail[];
  /** Locale string for formatting months (e.g., 'pt-BR', 'en-US') */
  locale: string;
  /** Transaction type to determine amount sign display */
  transactionType: 'income' | 'expense';
  /** Optional test ID */
  testID?: string;
}

/**
 * Format a reference month (YYYY-MM) into a locale-formatted string
 * using Intl.DateTimeFormat with the user's locale.
 */
function formatMonth(referenceMonth: string, locale: string): string {
  const [yearStr, monthStr] = referenceMonth.split('-');
  if (!yearStr || !monthStr) return referenceMonth;
  const date = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1, 1);
  return new Intl.DateTimeFormat(locale === 'pt-BR' ? 'pt-BR' : 'en-US', {
    month: 'long',
    year: 'numeric',
  }).format(date);
}

/**
 * InstallmentPreview component
 *
 * Renders a list of installment parcels with their number, month, and value.
 * When a parcel's amount is 0, it shows a hint text instead of the value.
 */
function InstallmentPreviewComponent({
  installments,
  locale,
  transactionType,
  testID = 'installment-preview',
}: InstallmentPreviewProps): React.JSX.Element | null {
  const { t } = useTranslation();
  const colors = useThemeColors();

  // Memoize formatted months to avoid recalculating on every render
  const formattedMonths = useMemo(() => {
    return installments.map((parcel) => formatMonth(parcel.referenceMonth, locale));
  }, [installments, locale]);

  if (installments.length === 0) {
    return null;
  }

  return (
    <View style={styles.section} testID={testID}>
      <Text style={[styles.label, { color: colors.text.primary }]}>
        {t('manual.installment.preview')}
      </Text>
      <View
        style={[
          styles.previewContainer,
          { backgroundColor: colors.surface.card, borderColor: colors.border.default },
        ]}
      >
        {installments.map((parcel, idx) => (
          <View
            key={parcel.index}
            style={[styles.previewItem, { borderBottomColor: colors.border.subtle }]}
            testID={`${testID}-item-${parcel.index}`}
          >
            <Text style={[styles.previewParcelLabel, { color: colors.text.primary }]}>
              {t('manual.installment.parcelLabel', {
                index: parcel.index,
                total: parcel.totalParcels,
              })}
            </Text>
            <Text style={[styles.previewMonth, { color: colors.text.secondary }]}>
              {formattedMonths[idx]}
            </Text>
            {parcel.amount > 0 ? (
              <AmountDisplay
                amount={transactionType === 'expense' ? -parcel.amount : parcel.amount}
                size="small"
                colorVariant="auto"
                showSign
                testID={`${testID}-amount-${parcel.index}`}
              />
            ) : (
              <Text style={[styles.previewNoAmount, { color: colors.text.tertiary }]}>
                {t('manual.installment.noAmountPreview')}
              </Text>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: typography.caption.fontSize + 1,
    fontWeight: '500',
    marginBottom: spacing.sm,
  },
  previewContainer: {
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  previewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  previewParcelLabel: {
    fontSize: typography.caption.fontSize + 1,
    fontWeight: '500',
    flex: 1,
  },
  previewMonth: {
    fontSize: typography.caption.fontSize + 1,
    flex: 1,
    textAlign: 'center',
  },
  previewNoAmount: {
    fontSize: typography.overline.fontSize + 1,
    fontStyle: 'italic',
    flex: 1,
    textAlign: 'right',
  },
});

/**
 * Memoized InstallmentPreview for performance optimization.
 * Re-renders only when installments, locale, or transactionType change.
 */
export const InstallmentPreview = memo(InstallmentPreviewComponent);

export default InstallmentPreview;
