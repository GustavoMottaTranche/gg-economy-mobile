/**
 * SavingsMetrics Component
 *
 * Displays Monthly Income, Savings Goal, and Actual Savings in an elevated card.
 * Uses lg shadow in light mode and border in dark mode, matching the Dashboard's
 * SummaryCard pattern. Negative savings goal values are highlighted with the
 * theme's status.error (danger) color.
 *
 * **Validates: Requirements 3.1, 4.1, 15.3, 15.5**
 */

import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useThemeColors } from '../../hooks/useThemeColors';
import { useThemeStore } from '../../stores/themeStore';
import { formatCurrencyLocale, getCurrentLocale } from '../../i18n';
import { spacing, borderRadius, typography, shadows } from '../../constants/theme';

/**
 * Props for the SavingsMetrics component.
 */
export interface SavingsMetricsProps {
  /** Monthly income in cents, null if not configured */
  monthlyIncome: number | null;
  /** Savings goal in cents (can be negative) */
  savingsGoal: number;
  /** Actual savings in cents (can be negative) */
  actualSavings: number;
  /** Optional container style override */
  style?: ViewStyle;
  /** Test ID for testing */
  testID?: string;
}

/**
 * SavingsMetrics displays the three key savings metrics in an elevated card:
 * - Monthly Income (or "—" if not configured)
 * - Savings Goal (highlighted in red when negative)
 * - Actual Savings
 */
function SavingsMetricsComponent({
  monthlyIncome,
  savingsGoal,
  actualSavings,
  style,
  testID,
}: SavingsMetricsProps): React.ReactElement {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const resolvedScheme = useThemeStore((s) => s.resolvedScheme);
  const isDark = resolvedScheme === 'dark';
  const locale = getCurrentLocale();

  // Format values as currency (converting from cents to units)
  const formattedIncome =
    monthlyIncome !== null ? formatCurrencyLocale(monthlyIncome / 100, locale) : '—';
  const formattedSavingsGoal = formatCurrencyLocale(savingsGoal / 100, locale);
  const formattedActualSavings = formatCurrencyLocale(actualSavings / 100, locale);

  // Savings goal color: error/danger when negative, primary text otherwise
  const savingsGoalColor = savingsGoal < 0 ? colors.semantic.danger.base : colors.text.primary;

  const containerStyle = useMemo(
    () => [
      styles.container,
      {
        backgroundColor: colors.surface.card,
        // Elevated card styling: lg shadow in light mode, border in dark mode
        ...(isDark ? { borderWidth: 1, borderColor: colors.border.default } : shadows.light.lg),
      } as ViewStyle,
      style,
    ],
    [colors.surface.card, colors.border.default, isDark, style]
  );

  return (
    <View style={containerStyle} testID={testID} accessibilityRole="summary">
      {/* Monthly Income */}
      <View style={styles.metricRow}>
        <Text style={[styles.label, { color: colors.text.secondary }]}>
          {t('futurePlans.monthlyIncome')}
        </Text>
        <Text
          style={[styles.value, { color: colors.text.primary }]}
          testID={testID ? `${testID}-income` : undefined}
        >
          {formattedIncome}
        </Text>
      </View>

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: colors.border.subtle }]} />

      {/* Savings Goal and Actual Savings side by side */}
      <View style={styles.metricsRow}>
        {/* Savings Goal */}
        <View style={styles.metricItem}>
          <Text style={[styles.label, { color: colors.text.secondary }]}>
            {t('futurePlans.savingsGoal')}
          </Text>
          <Text
            style={[styles.value, { color: savingsGoalColor }]}
            testID={testID ? `${testID}-savings-goal` : undefined}
          >
            {formattedSavingsGoal}
          </Text>
        </View>

        {/* Vertical divider */}
        <View style={[styles.verticalDivider, { backgroundColor: colors.border.subtle }]} />

        {/* Actual Savings */}
        <View style={styles.metricItem}>
          <Text style={[styles.label, { color: colors.text.secondary }]}>
            {t('futurePlans.actualSavings')}
          </Text>
          <Text
            style={[styles.value, { color: colors.text.primary }]}
            testID={testID ? `${testID}-actual-savings` : undefined}
          >
            {formattedActualSavings}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
  },
  metricRow: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.caption.fontSize,
    fontWeight: typography.caption.fontWeight,
    lineHeight: typography.caption.lineHeight,
    textTransform: 'uppercase',
    letterSpacing: typography.overline.letterSpacing,
    marginBottom: spacing.xs,
  },
  value: {
    fontSize: typography.title.fontSize,
    fontWeight: typography.title.fontWeight,
    lineHeight: typography.title.lineHeight,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: spacing.md,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  verticalDivider: {
    width: StyleSheet.hairlineWidth,
    height: spacing['2xl'] + spacing.sm,
  },
});

/**
 * Memoized SavingsMetrics for performance optimization.
 */
export const SavingsMetrics = memo(SavingsMetricsComponent);

export default SavingsMetrics;
