/**
 * InstallmentIndicator Component
 *
 * Displays a small badge indicating the installment position (e.g., "3/12")
 * or a recurring symbol (∞) for transactions in the Category Detail Screen.
 *
 * **Validates: Requirements 1.5, 5.1, 5.4, 5.5, 6.2**
 */
import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useThemeColors } from '../../hooks/useThemeColors';
import { spacing, borderRadius, typography } from '../../constants/theme';

/**
 * Props for the InstallmentIndicator component
 */
export interface InstallmentIndicatorProps {
  /** Label text: "X/Y" for installments or "∞" for recurring */
  label: string;
  /** Optional test ID for testing */
  testID?: string;
}

/**
 * Parse the label to determine the accessibility description.
 * - If label contains "/" (e.g., "3/12"), returns { type: 'installment', current, total }
 * - If label is "∞", returns { type: 'recurring' }
 */
function parseLabel(
  label: string
): { type: 'installment'; current: string; total: string } | { type: 'recurring' } {
  if (label.includes('/')) {
    const [current, total] = label.split('/');
    return { type: 'installment', current: current ?? '', total: total ?? '' };
  }
  return { type: 'recurring' };
}

/**
 * InstallmentIndicator component
 *
 * Renders a small badge with the installment label and appropriate accessibility text.
 * Supports light/dark themes via useThemeColors.
 */
function InstallmentIndicatorComponent({
  label,
  testID = 'installment-indicator',
}: InstallmentIndicatorProps): React.JSX.Element {
  const { t } = useTranslation();
  const colors = useThemeColors();

  const parsed = parseLabel(label);

  const accessibilityLabel =
    parsed.type === 'installment'
      ? t('categoryDetail.installmentLabel', { current: parsed.current, total: parsed.total })
      : t('categoryDetail.recurringLabel');

  return (
    <View
      style={[styles.badge, { backgroundColor: colors.semantic.neutral[100] }]}
      testID={testID}
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel}
    >
      <Text style={[styles.label, { color: colors.text.secondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.sm,
    alignSelf: 'center',
  },
  label: {
    fontSize: typography.overline.fontSize,
    fontWeight: typography.overline.fontWeight,
    lineHeight: typography.overline.lineHeight,
    letterSpacing: typography.overline.letterSpacing,
  },
});

/**
 * Memoized InstallmentIndicator for performance optimization.
 * Re-renders only when label or testID change.
 */
export const InstallmentIndicator = memo(InstallmentIndicatorComponent);

export default InstallmentIndicator;
