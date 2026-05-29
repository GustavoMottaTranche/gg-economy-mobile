/**
 * Theme Constants Module
 *
 * Centralized design tokens for UI components.
 * Provides consistent styling across the application with light/dark mode support.
 *
 * **Validates: Requirements 1.1, 1.6, 3.1, 3.2, 3.3, 10.7**
 */

// ─── Type Definitions ────────────────────────────────────────────────────────

/**
 * A color variant with light, base, and dark tones.
 */
export interface ColorVariant {
  readonly light: string;
  readonly base: string;
  readonly dark: string;
}

/**
 * Primary color scale with 10 intensity levels (50–900).
 * Luminosity decreases progressively from 50 (lightest) to 900 (darkest).
 */
export interface PrimaryScale {
  readonly 50: string;
  readonly 100: string;
  readonly 200: string;
  readonly 300: string;
  readonly 400: string;
  readonly 500: string;
  readonly 600: string;
  readonly 700: string;
  readonly 800: string;
  readonly 900: string;
}

/**
 * Neutral color scale with 11 tones from white (0) to near-black (900).
 */
export interface NeutralScale {
  readonly 0: string;
  readonly 50: string;
  readonly 100: string;
  readonly 200: string;
  readonly 300: string;
  readonly 400: string;
  readonly 500: string;
  readonly 600: string;
  readonly 700: string;
  readonly 800: string;
  readonly 900: string;
}

/**
 * Semantic color groups: primary (with full scale), secondary, success, danger, warning, info, and neutral.
 */
export interface SemanticColors {
  readonly primary: ColorVariant & { readonly scale: PrimaryScale };
  readonly secondary: ColorVariant;
  readonly success: ColorVariant;
  readonly danger: ColorVariant;
  readonly warning: ColorVariant;
  readonly info: ColorVariant;
  readonly neutral: NeutralScale;
}

/**
 * Mode-specific color tokens covering background, text, border, semantic, surface, and interactive groups.
 */
export interface ModeColors {
  readonly background: {
    readonly primary: string;
    readonly secondary: string;
    readonly tertiary: string;
  };
  readonly text: {
    readonly primary: string;
    readonly secondary: string;
    readonly tertiary: string;
    readonly inverse: string;
  };
  readonly border: {
    readonly default: string;
    readonly subtle: string;
    readonly strong: string;
  };
  readonly semantic: SemanticColors;
  readonly surface: {
    readonly card: string;
    readonly elevated: string;
    readonly overlay: string;
  };
  readonly interactive: {
    readonly primary: string;
    readonly primaryPressed: string;
    readonly disabled: string;
  };
}

/**
 * Complete theme color definition with light and dark mode palettes.
 */
export interface ThemeColors {
  readonly light: ModeColors;
  readonly dark: ModeColors;
}


// ─── Light Mode Colors ───────────────────────────────────────────────────────

const lightColors: ModeColors = {
  background: {
    primary: '#FFFFFF',
    secondary: '#F5F5F7',
    tertiary: '#EBEBF0',
  },
  text: {
    primary: '#1C1C1E',
    secondary: '#6B7280',
    tertiary: '#9CA3AF',
    inverse: '#FFFFFF',
  },
  border: {
    default: '#E5E7EB',
    subtle: '#F3F4F6',
    strong: '#D1D5DB',
  },
  semantic: {
    primary: {
      light: '#EFF6FF',
      base: '#3B82F6',
      dark: '#1D4ED8',
      scale: {
        50: '#EFF6FF',
        100: '#DBEAFE',
        200: '#BFDBFE',
        300: '#93C5FD',
        400: '#60A5FA',
        500: '#3B82F6',
        600: '#2563EB',
        700: '#1D4ED8',
        800: '#1E40AF',
        900: '#1E3A5F',
      },
    },
    secondary: {
      light: '#F5F5F7',
      base: '#6B7280',
      dark: '#374151',
    },
    success: {
      light: '#DCFCE7',
      base: '#16A34A',
      dark: '#166534',
    },
    danger: {
      light: '#FEE2E2',
      base: '#DC2626',
      dark: '#991B1B',
    },
    warning: {
      light: '#FEF3C7',
      base: '#D97706',
      dark: '#92400E',
    },
    info: {
      light: '#DBEAFE',
      base: '#2563EB',
      dark: '#1E40AF',
    },
    neutral: {
      0: '#FFFFFF',
      50: '#FAFAFA',
      100: '#F5F5F5',
      200: '#E5E5E5',
      300: '#D4D4D4',
      400: '#A3A3A3',
      500: '#737373',
      600: '#525252',
      700: '#404040',
      800: '#262626',
      900: '#171717',
    },
  },
  surface: {
    card: '#FFFFFF',
    elevated: '#FFFFFF',
    overlay: 'rgba(0, 0, 0, 0.5)',
  },
  interactive: {
    primary: '#3B82F6',
    primaryPressed: '#2563EB',
    disabled: '#D1D5DB',
  },
} as const;

// ─── Dark Mode Colors ────────────────────────────────────────────────────────

const darkColors: ModeColors = {
  background: {
    primary: '#000000',
    secondary: '#1C1C1E',
    tertiary: '#2C2C2E',
  },
  text: {
    primary: '#F5F5F7',
    secondary: '#A1A1AA',
    tertiary: '#71717A',
    inverse: '#1C1C1E',
  },
  border: {
    default: 'rgba(255, 255, 255, 0.12)',
    subtle: 'rgba(255, 255, 255, 0.08)',
    strong: 'rgba(255, 255, 255, 0.20)',
  },
  semantic: {
    primary: {
      light: '#1E3A5F',
      base: '#60A5FA',
      dark: '#93C5FD',
      scale: {
        50: '#0C1929',
        100: '#122640',
        200: '#1A3556',
        300: '#1E3A5F',
        400: '#2563EB',
        500: '#3B82F6',
        600: '#60A5FA',
        700: '#93C5FD',
        800: '#BFDBFE',
        900: '#DBEAFE',
      },
    },
    secondary: {
      light: '#2C2C2E',
      base: '#A1A1AA',
      dark: '#D4D4D8',
    },
    success: {
      light: '#064E3B',
      base: '#34D399',
      dark: '#6EE7B7',
    },
    danger: {
      light: '#7F1D1D',
      base: '#F87171',
      dark: '#FCA5A5',
    },
    warning: {
      light: '#78350F',
      base: '#FBBF24',
      dark: '#FDE68A',
    },
    info: {
      light: '#1E3A8A',
      base: '#60A5FA',
      dark: '#93C5FD',
    },
    neutral: {
      0: '#000000',
      50: '#0A0A0A',
      100: '#171717',
      200: '#262626',
      300: '#404040',
      400: '#525252',
      500: '#737373',
      600: '#A3A3A3',
      700: '#D4D4D4',
      800: '#E5E5E5',
      900: '#FAFAFA',
    },
  },
  surface: {
    card: '#1C1C1E',
    elevated: '#2C2C2E',
    overlay: 'rgba(0, 0, 0, 0.7)',
  },
  interactive: {
    primary: '#60A5FA',
    primaryPressed: '#93C5FD',
    disabled: '#3F3F46',
  },
} as const;

// ─── Exported Colors ─────────────────────────────────────────────────────────

/**
 * Complete color palette with light and dark mode variants.
 * Access via `colors.light` or `colors.dark`, or use the `useThemeColors()` hook
 * for automatic mode-aware color selection.
 */
export const colors: ThemeColors = {
  light: lightColors,
  dark: darkColors,
} as const;

// ─── Typography Scale ─────────────────────────────────────────────────────────

/**
 * A single typography level definition.
 */
interface TypographyLevel {
  readonly fontSize: number;
  readonly fontWeight: '400' | '500' | '600' | '700';
  readonly lineHeight: number;
  readonly letterSpacing?: number;
}

/**
 * Typography scale with 6 hierarchical levels from display (largest) to overline (smallest).
 * Each level defines fontSize, fontWeight, lineHeight, and optional letterSpacing.
 *
 * **Validates: Requirements 1.2**
 */
export interface TypographyScale {
  readonly display: TypographyLevel;
  readonly heading: TypographyLevel;
  readonly title: TypographyLevel;
  readonly body: TypographyLevel;
  readonly caption: TypographyLevel;
  readonly overline: TypographyLevel;
}

/**
 * Typography scale values following iOS Human Interface Guidelines sizing.
 * Line heights maintain a 1.2x–1.5x ratio relative to font size.
 */
export const typography: TypographyScale = {
  display:  { fontSize: 34, fontWeight: '700', lineHeight: 41 },
  heading:  { fontSize: 28, fontWeight: '700', lineHeight: 36 },
  title:    { fontSize: 22, fontWeight: '600', lineHeight: 30 },
  body:     { fontSize: 16, fontWeight: '400', lineHeight: 24 },
  caption:  { fontSize: 13, fontWeight: '400', lineHeight: 18 },
  overline: { fontSize: 11, fontWeight: '500', lineHeight: 16, letterSpacing: 0.5 },
} as const;

// ─── Spacing Scale ───────────────────────────────────────────────────────────

/**
 * Spacing scale based on 4px multiples for consistent layout rhythm.
 *
 * **Validates: Requirements 1.3**
 */
export interface SpacingScale {
  readonly xs: 4;
  readonly sm: 8;
  readonly md: 12;
  readonly base: 16;
  readonly lg: 20;
  readonly xl: 24;
  readonly '2xl': 32;
  readonly '3xl': 48;
}

/**
 * Spacing values used for padding, margin, and gap throughout the app.
 * All values are positive multiples of 4.
 */
export const spacing: SpacingScale = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
} as const;

// ─── Shadow System ───────────────────────────────────────────────────────────

/**
 * A single shadow level definition compatible with React Native's shadow props.
 */
interface ShadowLevel {
  readonly shadowColor: string;
  readonly shadowOffset: { readonly width: number; readonly height: number };
  readonly shadowOpacity: number;
  readonly shadowRadius: number;
  readonly elevation: number;
}

/**
 * Shadow system with light and dark mode variants at 3 elevation levels.
 * Dark mode uses reduced opacity and zero elevation for subtlety.
 *
 * **Validates: Requirements 1.4**
 */
export interface ShadowSystem {
  readonly light: {
    readonly sm: ShadowLevel;
    readonly md: ShadowLevel;
    readonly lg: ShadowLevel;
  };
  readonly dark: {
    readonly sm: ShadowLevel;
    readonly md: ShadowLevel;
    readonly lg: ShadowLevel;
  };
}

/**
 * Shadow values for light and dark modes.
 * Light mode uses subtle shadows with increasing elevation.
 * Dark mode uses minimal shadows (elevation 0) since dark surfaces don't cast visible shadows.
 */
export const shadows: ShadowSystem = {
  light: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 3,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 3,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
      elevation: 4,
    },
  },
  dark: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.02,
      shadowRadius: 2,
      elevation: 0,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.03,
      shadowRadius: 3,
      elevation: 0,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.04,
      shadowRadius: 4,
      elevation: 0,
    },
  },
} as const;

// ─── Border Radius ───────────────────────────────────────────────────────────

/**
 * Border radius scale for consistent rounded corners.
 *
 * **Validates: Requirements 1.5**
 */
export interface BorderRadiusScale {
  readonly sm: 8;
  readonly md: 12;
  readonly lg: 16;
  readonly xl: 24;
}

/**
 * Border radius constants.
 * - sm (8): Small elements like chips and badges
 * - md (12): List items and secondary cards
 * - lg (16): Main cards and primary surfaces
 * - xl (24): Modals and large containers
 */
export const borderRadius: BorderRadiusScale = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;

// ─── Unified Theme Object ────────────────────────────────────────────────────

/**
 * Complete theme object containing all design tokens.
 * Import this for full access to the design system, or import individual
 * tokens (colors, typography, spacing, shadows, borderRadius) for tree-shaking.
 *
 * **Validates: Requirements 1.6**
 */
export const theme = {
  colors,
  typography,
  spacing,
  shadows,
  borderRadius,
} as const;

export type Theme = typeof theme;

// ─── Legacy Exports (Backward Compatibility) ─────────────────────────────────

/**
 * Transaction color schemes for different transaction states and types.
 * Used by TransactionCard and other transaction-related components.
 *
 * @deprecated Prefer using semantic colors from `colors.light.semantic` or `colors.dark.semantic`.
 * Kept for backward compatibility with existing components.
 */
export const TRANSACTION_COLORS = {
  /** Colors for income transactions (positive amounts) */
  income: {
    text: '#166534',
    background: '#dcfce7',
    border: '#86efac',
  },
  /** Colors for expense transactions (negative amounts) */
  expense: {
    text: '#991b1b',
    background: '#fee2e2',
    border: '#fca5a5',
  },
  /** Colors for neutral/default state */
  neutral: {
    text: '#374151',
    background: '#f3f4f6',
    border: '#d1d5db',
  },
  /** Colors for selected transaction state */
  selected: {
    border: '#3b82f6',
    background: '#eff6ff',
  },
  /** Colors for excluded transactions */
  excluded: {
    text: '#6b7280',
    background: '#f9fafb',
  },
} as const;

/**
 * Type representing the available transaction color scheme keys
 */
export type TransactionColorScheme = keyof typeof TRANSACTION_COLORS;
