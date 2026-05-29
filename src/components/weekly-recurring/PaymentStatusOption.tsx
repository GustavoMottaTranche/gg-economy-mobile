/**
 * PaymentStatusOption Component
 *
 * Renders three mutually exclusive radio-button-style options for selecting
 * the initial payment status when creating a recurring expense group.
 *
 * Options:
 * - "Todas pendentes" (all_pending) — default
 * - "Marcar primeira como paga" (first_paid)
 * - "Marcar todas como pagas" (all_paid)
 *
 * **Validates: Requirements 2.1**
 */

import React, { useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { spacing, typography, borderRadius } from '../../constants/theme';
import type { PaymentStatusCreationOption } from '../../types/paymentStatus';

// ─── Option Definitions ──────────────────────────────────────────────────────

interface OptionItem {
  value: PaymentStatusCreationOption;
  label: string;
}

const OPTIONS: OptionItem[] = [
  { value: 'all_pending', label: 'Todas pendentes' },
  { value: 'first_paid', label: 'Marcar primeira como paga' },
  { value: 'all_paid', label: 'Marcar todas como pagas' },
];

// ─── Props ───────────────────────────────────────────────────────────────────

export interface PaymentStatusOptionProps {
  /** Currently selected option */
  selected: PaymentStatusCreationOption;
  /** Callback when an option is selected */
  onSelect: (option: PaymentStatusCreationOption) => void;
  /** Test ID for testing */
  testID?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function PaymentStatusOption({
  selected,
  onSelect,
  testID,
}: PaymentStatusOptionProps): React.JSX.Element {
  const colors = useThemeColors();

  const handleSelect = useCallback(
    (option: PaymentStatusCreationOption) => {
      onSelect(option);
    },
    [onSelect]
  );

  return (
    <View style={styles.container} testID={testID}>
      <Text style={[styles.label, { color: colors.text.secondary }]}>
        Status de pagamento
      </Text>
      <View style={styles.optionsContainer}>
        {OPTIONS.map((option) => {
          const isSelected = selected === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.optionItem,
                {
                  backgroundColor: isSelected
                    ? colors.semantic.primary.light
                    : colors.background.secondary,
                  borderColor: isSelected
                    ? colors.interactive.primary
                    : colors.border.default,
                },
              ]}
              onPress={() => handleSelect(option.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={option.label}
              testID={testID ? `${testID}-${option.value}` : undefined}
            >
              <View
                style={[
                  styles.radio,
                  {
                    borderColor: isSelected
                      ? colors.interactive.primary
                      : colors.border.strong,
                  },
                ]}
              >
                {isSelected && (
                  <View
                    style={[
                      styles.radioInner,
                      { backgroundColor: colors.interactive.primary },
                    ]}
                  />
                )}
              </View>
              <Text
                style={[
                  styles.optionText,
                  {
                    color: isSelected
                      ? colors.text.primary
                      : colors.text.secondary,
                  },
                  isSelected && styles.optionTextSelected,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  label: {
    fontSize: typography.caption.fontSize,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  optionsContainer: {
    gap: spacing.sm,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderRadius: borderRadius.sm,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  optionText: {
    fontSize: typography.body.fontSize,
    flex: 1,
  },
  optionTextSelected: {
    fontWeight: '500',
  },
});

export default PaymentStatusOption;
