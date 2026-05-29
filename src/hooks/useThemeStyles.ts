/**
 * Unified theme styles hook.
 *
 * Combines mode-aware colors with static design tokens (typography, spacing,
 * shadows, borderRadius) into a single object for components that need
 * multiple token types.
 *
 * **Validates: Requirements 2.1, 2.3, 10.5**
 */
import { useThemeStore } from '../stores/themeStore';
import {
  colors,
  typography,
  spacing,
  shadows,
  borderRadius,
  type ModeColors,
  type TypographyScale,
  type SpacingScale,
  type ShadowSystem,
  type BorderRadiusScale,
} from '../constants/theme';

/**
 * The shape returned by `useThemeStyles()`.
 */
export interface ThemeStylesResult {
  /** Mode-aware color palette (light or dark) */
  readonly colors: ModeColors;
  /** Typography scale (static, mode-independent) */
  readonly typography: TypographyScale;
  /** Spacing scale (static, mode-independent) */
  readonly spacing: SpacingScale;
  /** Mode-appropriate shadow set (light shadows for light mode, dark shadows for dark mode) */
  readonly shadows: ShadowSystem['light'] | ShadowSystem['dark'];
  /** Border radius constants (static, mode-independent) */
  readonly borderRadius: BorderRadiusScale;
}

/**
 * Returns a unified style object combining mode-aware colors and shadows
 * with static typography, spacing, and borderRadius tokens.
 *
 * Shadows are automatically selected based on the current mode:
 * - Light mode → `shadows.light` (higher opacity, non-zero elevation)
 * - Dark mode → `shadows.dark` (reduced opacity, zero elevation)
 *
 * @example
 * ```tsx
 * const theme = useThemeStyles();
 * <View style={{
 *   backgroundColor: theme.colors.surface.card,
 *   padding: theme.spacing.base,
 *   borderRadius: theme.borderRadius.lg,
 *   ...theme.shadows.md,
 * }} />
 * ```
 */
export function useThemeStyles(): ThemeStylesResult {
  const resolvedScheme = useThemeStore((s) => s.resolvedScheme);

  return {
    colors: colors[resolvedScheme],
    typography,
    spacing,
    shadows: shadows[resolvedScheme],
    borderRadius,
  };
}
