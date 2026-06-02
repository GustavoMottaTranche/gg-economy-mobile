/**
 * WeeklyParcelRow Component
 *
 * Displays an individual weekly parcel row within an expanded WeeklyGroupItem.
 * Shows the occurrence date, formatted currency amount, and a PaymentStatusToggle.
 * Pressable to navigate to the parcel detail view.
 *
 * **Validates: Requirements 1.5, 2.1, 3.1**
 */
import React, { memo, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

import { useThemeColors } from '../hooks/useThemeColors';
import { formatCurrencyLocale, getCurrentLocale } from '../i18n';
import { spacing, typography } from '../constants/theme';
import { PaymentStatusToggle } from './PaymentStatusToggle';
import type { WeeklyOccurrence } from '../types/weeklyRecurring';

/**
 * Props for the WeeklyParcelRow component
 */
export interface WeeklyParcelRowProps {
  /** The weekly occurrence data to display */
  occurrence: WeeklyOccurrence;
  /** Callback when the row is pressed (navigate to parcel detail) */
  onPress: (occurrence: WeeklyOccurrence) => void;
  /** Callback when the payment status toggle is tapped */
  onTogglePaymentStatus: (occurrenceId: string) => void;
  /** Optional test ID for testing */
  testID?: string;
}

/**
 * Formats a date string (YYYY-MM-DD) into a short day/month format.
 * For pt-BR: "03/06", for en: "06/03"
 */
function formatParcelDate(dateStr: string): string {
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
 * WeeklyParcelRow component
 *
 * Renders a single weekly occurrence row with:
 * - Payment status toggle (left)
 * - Date in short format (center-left)
 * - Amount formatted as currency (right)
 *
 * The entire row is pressable to navigate to the parcel detail view.
 *
 * @example
 * ```tsx
 * <WeeklyParcelRow
 *   occurrence={occurrence}
 *   onPress={(occ) => navigateToDetail(occ)}
 *   onTogglePaymentStatus={(id) => handleToggle(id)}
 *   testID="weekly-parcel-row"
 * />
 * ```
 */
function WeeklyParcelRowComponent({
  occurrence,
  onPress,
  onTogglePaymentStatus,
  testID,
}: WeeklyParcelRowProps): React.ReactElement {
  const colors = useThemeColors();
  const locale = getCurrentLocale();

  const isPaid = occurrence.isPaid ?? false;
  const formattedDate = formatParcelDate(occurrence.date);
  const formattedAmount = formatCurrencyLocale(occurrence.amount / 100, locale);

  const handlePress = useCallback(() => {
    onPress(occurrence);
  }, [onPress, occurrence]);

  const handleToggle = useCallback(() => {
    onTogglePaymentStatus(occurrence.id);
  }, [onTogglePaymentStatus, occurrence.id]);

  const dynamicStyles = useMemo(
    () => ({
      container: {
        borderBottomColor: colors.border.subtle,
      },
      dateText: {
        color: isPaid ? colors.text.tertiary : colors.text.primary,
      },
      amountText: {
        color: isPaid ? colors.text.tertiary : colors.text.primary,
      },
    }),
    [colors, isPaid]
  );

  return (
    <TouchableOpacity
      style={[styles.container, dynamicStyles.container]}
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Parcela ${formattedDate}, ${formattedAmount}`}
      testID={testID}
    >
      <View style={styles.toggleContainer}>
        <PaymentStatusToggle
          isPaid={isPaid}
          onToggle={handleToggle}
          size="small"
          testID={testID ? `${testID}-toggle` : undefined}
        />
      </View>

      <View style={styles.contentContainer}>
        <Text
          style={[styles.dateText, dynamicStyles.dateText, isPaid && styles.dateTextPaid]}
          testID={testID ? `${testID}-date` : undefined}
        >
          {formattedDate}
        </Text>

        <Text
          style={[styles.amountText, dynamicStyles.amountText]}
          testID={testID ? `${testID}-amount` : undefined}
        >
          {formattedAmount}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  toggleContainer: {
    marginRight: spacing.md,
  },
  contentContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateText: {
    fontSize: typography.body.fontSize - 2,
    fontWeight: '400',
  },
  dateTextPaid: {
    textDecorationLine: 'line-through',
  },
  amountText: {
    fontSize: typography.body.fontSize - 2,
    fontWeight: '600',
  },
});

/**
 * Memoized WeeklyParcelRow for performance optimization.
 * Re-renders only when occurrence data or callbacks change.
 */
export const WeeklyParcelRow = memo(WeeklyParcelRowComponent);

export default WeeklyParcelRow;
