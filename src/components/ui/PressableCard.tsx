/**
 * PressableCard - Reusable pressable card wrapper with theme support.
 *
 * Applies theme tokens for background, border radius, shadows (light mode),
 * and borders (dark mode). Provides press feedback via opacity reduction.
 *
 * **Validates: Requirements 6.2, 6.3, 6.4, 9.1, 9.5**
 */
import React from 'react';
import { TouchableOpacity, StyleSheet, type ViewStyle, type StyleProp } from 'react-native';

import { useThemeColors } from '../../hooks/useThemeColors';
import { useThemeStyles } from '../../hooks/useThemeStyles';
import { useThemeStore } from '../../stores/themeStore';

/**
 * Card variant determines border radius and shadow level:
 * - 'primary': borderRadius.lg (16px), shadow md (main cards, summary cards)
 * - 'secondary': borderRadius.md (12px), shadow sm (list items, settings cards)
 */
export type PressableCardVariant = 'primary' | 'secondary';

export interface PressableCardProps {
  /** Card content */
  children: React.ReactNode;
  /** Press handler */
  onPress?: () => void;
  /** Card variant controlling border radius and shadow level */
  variant?: PressableCardVariant;
  /** Optional style overrides */
  style?: StyleProp<ViewStyle>;
  /** Whether the card is disabled (opacity 0.5, no press) */
  disabled?: boolean;
  /** Test ID for testing */
  testID?: string;
}

/**
 * A reusable pressable card component that applies theme tokens for
 * consistent styling across the app.
 *
 * - Light mode: Uses shadows from the theme shadow system
 * - Dark mode: Uses a 1px border with neutral color at ~12% opacity
 * - Press feedback: activeOpacity of 0.7 during touch
 * - Disabled state: opacity 0.5, interactions blocked
 *
 * @example
 * ```tsx
 * <PressableCard variant="primary" onPress={handlePress}>
 *   <Text>Main card content</Text>
 * </PressableCard>
 *
 * <PressableCard variant="secondary" onPress={handleItemPress}>
 *   <Text>List item content</Text>
 * </PressableCard>
 * ```
 */
export function PressableCard({
  children,
  onPress,
  variant = 'primary',
  style,
  disabled = false,
  testID,
}: PressableCardProps) {
  const colors = useThemeColors();
  const theme = useThemeStyles();
  const resolvedScheme = useThemeStore((s) => s.resolvedScheme);

  const isDark = resolvedScheme === 'dark';

  // Border radius based on variant
  const radius =
    variant === 'primary' ? theme.borderRadius.lg : theme.borderRadius.md;

  // Shadow/border based on mode
  const elevationStyle: ViewStyle = isDark
    ? {
        borderWidth: 1,
        borderColor: colors.border.default, // rgba(255, 255, 255, 0.12)
      }
    : variant === 'primary'
      ? theme.shadows.md
      : theme.shadows.sm;

  const cardStyle: ViewStyle = {
    backgroundColor: colors.surface.card,
    borderRadius: radius,
    ...elevationStyle,
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      disabled={disabled}
      style={[cardStyle, disabled && styles.disabled, style]}
      testID={testID}
      accessibilityRole={onPress ? 'button' : undefined}
    >
      {children}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  disabled: {
    opacity: 0.5,
  },
});
