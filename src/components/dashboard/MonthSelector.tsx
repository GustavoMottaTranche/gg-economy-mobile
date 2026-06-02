/**
 * MonthSelector Component
 *
 * Provides navigation between months with previous/next buttons
 * and displays the current month name in a locale-aware format.
 *
 * **Validates: Requirements 21, 30**
 */

import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import { getMonthName, getCurrentLocale } from '../../i18n';
import { useThemeColors } from '../../hooks/useThemeColors';
import { spacing, borderRadius } from '../../constants/theme';

/**
 * Props for the MonthSelector component
 */
export interface MonthSelectorProps {
  /** Currently selected month in YYYY-MM format */
  selectedMonth: string;
  /** Callback when previous month is pressed */
  onPreviousMonth: () => void;
  /** Callback when next month is pressed */
  onNextMonth: () => void;
  /** Whether to disable the next button (e.g., for current month) */
  disableNext?: boolean;
  /** Whether to disable the previous button */
  disablePrevious?: boolean;
  /** Whether the currently displayed month is in the future */
  isFutureMonth?: boolean;
  /** Container style */
  style?: ViewStyle;
  /** Test ID for testing */
  testID?: string;
}

/**
 * Parses a YYYY-MM string into year and month
 */
function parseMonth(monthStr: string): { year: number; month: number } {
  const parts = monthStr.split('-').map(Number);
  return {
    year: parts[0] ?? new Date().getFullYear(),
    month: parts[1] ?? 1,
  };
}

/**
 * Formats the month display string
 */
function formatMonthDisplay(monthStr: string, locale: 'pt-BR' | 'en'): string {
  const { year, month } = parseMonth(monthStr);
  const monthName = getMonthName(month - 1, locale, 'long');

  // Capitalize first letter
  const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  return `${capitalizedMonth} ${year}`;
}

/**
 * MonthSelector component
 *
 * @example
 * ```tsx
 * <MonthSelector
 *   selectedMonth="2024-01"
 *   onPreviousMonth={() => setMonth(prev)}
 *   onNextMonth={() => setMonth(next)}
 * />
 * ```
 */
function MonthSelectorComponent({
  selectedMonth,
  onPreviousMonth,
  onNextMonth,
  disableNext = false,
  disablePrevious = false,
  isFutureMonth = false,
  style,
  testID,
}: MonthSelectorProps): React.ReactElement {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const locale = getCurrentLocale();

  const displayText = useMemo(
    () => formatMonthDisplay(selectedMonth, locale),
    [selectedMonth, locale]
  );

  return (
    <View
      style={[styles.container, { backgroundColor: colors.surface.card }, style]}
      testID={testID}
      accessibilityRole="adjustable"
      accessibilityLabel={t('transactions.referenceMonth')}
      accessibilityValue={{ text: displayText }}
    >
      {/* Previous Month Button */}
      <TouchableOpacity
        style={[styles.button, disablePrevious && styles.buttonDisabled]}
        onPress={onPreviousMonth}
        disabled={disablePrevious}
        accessibilityRole="button"
        accessibilityLabel={t('common.previous')}
        accessibilityHint={t('common.previous')}
        testID={`${testID}-prev`}
      >
        <Text
          style={[
            styles.buttonText,
            { color: colors.text.primary },
            disablePrevious && { color: colors.text.tertiary },
          ]}
        >
          ‹
        </Text>
      </TouchableOpacity>

      {/* Month Display */}
      <View style={styles.monthDisplay}>
        <Text
          style={[
            styles.monthText,
            { color: isFutureMonth ? colors.semantic.info.base : colors.text.primary },
          ]}
          testID={`${testID}-text`}
        >
          {displayText}
        </Text>
        {isFutureMonth && (
          <View
            style={[styles.futureBadge, { backgroundColor: colors.semantic.info.light }]}
            testID={`${testID}-future-badge`}
          >
            <Text style={[styles.futureBadgeText, { color: colors.semantic.info.base }]}>
              {t('dashboard.futureMonth', { defaultValue: 'Futuro' })}
            </Text>
          </View>
        )}
      </View>

      {/* Next Month Button */}
      <TouchableOpacity
        style={[styles.button, disableNext && styles.buttonDisabled]}
        onPress={onNextMonth}
        disabled={disableNext}
        accessibilityRole="button"
        accessibilityLabel={t('common.next')}
        accessibilityHint={t('common.next')}
        testID={`${testID}-next`}
      >
        <Text
          style={[
            styles.buttonText,
            { color: colors.text.primary },
            disableNext && { color: colors.text.tertiary },
          ]}
        >
          ›
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  button: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  buttonDisabled: {
    opacity: 0.3,
  },
  buttonText: {
    fontSize: 28,
    fontWeight: '300',
    lineHeight: 32,
  },
  monthDisplay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthText: {
    fontSize: 18,
    fontWeight: '600',
  },
  futureBadge: {
    marginTop: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  futureBadgeText: {
    fontSize: 11,
    fontWeight: '500',
  },
});

/**
 * Memoized MonthSelector for performance optimization
 */
export const MonthSelector = memo(MonthSelectorComponent);

export default MonthSelector;
