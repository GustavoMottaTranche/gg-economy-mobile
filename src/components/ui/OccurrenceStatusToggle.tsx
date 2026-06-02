/**
 * OccurrenceStatusToggle - Visual toggle for payment status of recurring occurrences.
 *
 * Displays a check icon (green/success) when paid, or an empty circle when pending.
 * Supports 'small' and 'medium' sizes for use in compact lists or standard views.
 *
 * **Validates: Requirements 1.2, 1.3**
 */
import React from 'react';
import { TouchableOpacity, StyleSheet, type ViewStyle } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';

import { useThemeColors } from '../../hooks/useThemeColors';

export interface OccurrenceStatusToggleProps {
  /** Whether the occurrence is paid */
  isPaid: boolean;
  /** Callback when the toggle is tapped */
  onToggle: () => void;
  /** Size variant: 'small' for compact lists, 'medium' for standard views */
  size?: 'small' | 'medium';
  /** Test ID for testing */
  testID?: string;
}

/** Size configuration for each variant */
const SIZE_CONFIG = {
  small: { container: 28, icon: 16, hitSlop: 8 },
  medium: { container: 36, icon: 22, hitSlop: 4 },
} as const;

/**
 * A pressable toggle that visually indicates payment status.
 * - When isPaid=true: shows a filled circle with a check icon in success color
 * - When isPaid=false: shows an empty circle with border in neutral color
 *
 * @example
 * ```tsx
 * <OccurrenceStatusToggle
 *   isPaid={occurrence.isPaid}
 *   onToggle={() => handleToggle(occurrence.id)}
 *   size="medium"
 *   testID="status-toggle"
 * />
 * ```
 */
export function OccurrenceStatusToggle({
  isPaid,
  onToggle,
  size = 'medium',
  testID,
}: OccurrenceStatusToggleProps) {
  const colors = useThemeColors();
  const config = SIZE_CONFIG[size];

  const containerStyle: ViewStyle = {
    width: config.container,
    height: config.container,
    borderRadius: config.container / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: isPaid ? colors.semantic.success.light : 'transparent',
    borderWidth: isPaid ? 0 : 2,
    borderColor: isPaid ? undefined : colors.border.strong,
  };

  const accessibilityLabel = isPaid ? 'Marcar como pendente' : 'Marcar como pago';

  return (
    <TouchableOpacity
      onPress={onToggle}
      activeOpacity={0.7}
      style={[styles.touchable, containerStyle]}
      hitSlop={config.hitSlop}
      testID={testID}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: isPaid }}
      accessibilityLabel={accessibilityLabel}
    >
      {isPaid ? (
        <Svg
          width={config.icon}
          height={config.icon}
          viewBox="0 0 24 24"
          fill="none"
          testID={testID ? `${testID}-check-icon` : undefined}
        >
          <Path
            d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"
            fill={colors.semantic.success.base}
          />
        </Svg>
      ) : (
        <Svg
          width={config.icon}
          height={config.icon}
          viewBox="0 0 24 24"
          fill="none"
          testID={testID ? `${testID}-empty-icon` : undefined}
        >
          <Circle cx="12" cy="12" r="9" stroke={colors.border.strong} strokeWidth="2" fill="none" />
        </Svg>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  touchable: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
