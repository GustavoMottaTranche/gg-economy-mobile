/**
 * Hook for mode-aware color palette selection.
 *
 * Reads the resolved color scheme from the theme store and returns
 * the corresponding color palette (light or dark).
 *
 * **Validates: Requirements 2.1, 10.5**
 */
import { useThemeStore } from '../stores/themeStore';
import { colors, type ModeColors } from '../constants/theme';

/**
 * Returns the color palette matching the current resolved scheme (light or dark).
 *
 * Components using this hook will automatically re-render when the theme changes,
 * since the hook subscribes to the Zustand store's `resolvedScheme` slice.
 *
 * @example
 * ```tsx
 * const colors = useThemeColors();
 * <View style={{ backgroundColor: colors.background.primary }} />
 * ```
 */
export function useThemeColors(): ModeColors {
  const resolvedScheme = useThemeStore((s) => s.resolvedScheme);
  return colors[resolvedScheme];
}
