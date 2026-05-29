/**
 * Property-Based Tests for Theme Tokens
 *
 * Feature: ui-style-improvements
 * Tests correctness properties of the theme design tokens using fast-check.
 */

import * as fc from 'fast-check';
import { colors, typography, spacing } from '../theme';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Computes relative luminance from a hex color string per WCAG 2.1.
 * Formula: https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 */
function relativeLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const linearize = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

  const R = linearize(r);
  const G = linearize(g);
  const B = linearize(b);

  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

// ─── Constants for generators ────────────────────────────────────────────────

const semanticColorNames = ['primary', 'secondary', 'success', 'danger', 'warning', 'info'] as const;
const colorVariants = ['light', 'base', 'dark'] as const;
const modes = ['light', 'dark'] as const;

const typographyLevels = ['display', 'heading', 'title', 'body', 'caption', 'overline'] as const;
const adjacentPairs: [typeof typographyLevels[number], typeof typographyLevels[number]][] = [
  ['display', 'heading'],
  ['heading', 'title'],
  ['title', 'body'],
  ['body', 'caption'],
  ['caption', 'overline'],
];

const primaryScaleKeys = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900] as const;

const spacingKeys = ['xs', 'sm', 'md', 'base', 'lg', 'xl', '2xl', '3xl'] as const;

// ─── Property 1: Color palette completeness ──────────────────────────────────

describe('Feature: ui-style-improvements, Property 1: Color palette completeness', () => {
  /**
   * Validates: Requirements 1.1
   *
   * For any semantic color name (primary, secondary, success, danger, warning, info)
   * and for any variant (light, base, dark) and for any mode (light, dark),
   * the Color_Palette SHALL return a valid 6-digit hex color string matching /^#[0-9A-Fa-f]{6}$/.
   */
  it('should return a valid 6-digit hex color for any (semanticColor, variant, mode) tuple', () => {
    const hexPattern = /^#[0-9A-Fa-f]{6}$/;

    fc.assert(
      fc.property(
        fc.constantFrom(...semanticColorNames),
        fc.constantFrom(...colorVariants),
        fc.constantFrom(...modes),
        (colorName, variant, mode) => {
          const semantic = colors[mode].semantic;
          const colorGroup = semantic[colorName];
          const value = colorGroup[variant];

          expect(value).toMatch(hexPattern);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 6: Primary color progressive luminosity ────────────────────────

describe('Feature: ui-style-improvements, Property 6: Primary color progressive luminosity', () => {
  /**
   * Validates: Requirements 3.1
   *
   * For any two primary color scale variants where variant index A < variant index B
   * (e.g., 50 < 100 < 200 ... < 900), the relative luminance of variant A SHALL be
   * strictly greater than the relative luminance of variant B.
   *
   * In light mode, luminosity decreases from 50 (lightest) to 900 (darkest).
   * In dark mode, the scale is inverted: luminosity increases from 50 (darkest) to 900 (lightest).
   */
  it('should have monotonically decreasing luminance across light mode primary scale', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: primaryScaleKeys.length - 2 }),
        (indexA) => {
          const indexB = indexA + 1;
          const keyA = primaryScaleKeys[indexA]!;
          const keyB = primaryScaleKeys[indexB]!;

          const scale = colors.light.semantic.primary.scale;
          const luminanceA = relativeLuminance(scale[keyA]);
          const luminanceB = relativeLuminance(scale[keyB]);

          expect(luminanceA).toBeGreaterThan(luminanceB);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should have monotonically increasing luminance across dark mode primary scale', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: primaryScaleKeys.length - 2 }),
        (indexA) => {
          const indexB = indexA + 1;
          const keyA = primaryScaleKeys[indexA]!;
          const keyB = primaryScaleKeys[indexB]!;

          const scale = colors.dark.semantic.primary.scale;
          const luminanceA = relativeLuminance(scale[keyA]);
          const luminanceB = relativeLuminance(scale[keyB]);

          expect(luminanceA).toBeLessThan(luminanceB);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 7: Typography scale validity ───────────────────────────────────

describe('Feature: ui-style-improvements, Property 7: Typography scale validity', () => {
  /**
   * Validates: Requirements 1.2
   *
   * For any typography level:
   * (a) fontSize between 11 and 34 inclusive
   * (b) fontWeight one of '400','500','600','700'
   * (c) lineHeight/fontSize ratio between 1.2 and 1.6 inclusive
   */
  it('should have valid fontSize, fontWeight, and lineHeight ratio for any level', () => {
    const validWeights = ['400', '500', '600', '700'];

    fc.assert(
      fc.property(
        fc.constantFrom(...typographyLevels),
        (level) => {
          const entry = typography[level];

          // (a) fontSize between 11 and 34 inclusive
          expect(entry.fontSize).toBeGreaterThanOrEqual(11);
          expect(entry.fontSize).toBeLessThanOrEqual(34);

          // (b) fontWeight one of '400','500','600','700'
          expect(validWeights).toContain(entry.fontWeight);

          // (c) lineHeight/fontSize ratio between 1.2 and 1.6 inclusive
          const ratio = entry.lineHeight / entry.fontSize;
          expect(ratio).toBeGreaterThanOrEqual(1.2);
          expect(ratio).toBeLessThanOrEqual(1.6);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Validates: Requirements 1.2
   *
   * For any two adjacent levels (display > heading > title > body > caption > overline),
   * fontSize difference >= 2px.
   */
  it('should have fontSize difference >= 2px between adjacent levels', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...adjacentPairs),
        ([higher, lower]) => {
          const higherSize = typography[higher].fontSize;
          const lowerSize = typography[lower].fontSize;

          expect(higherSize - lowerSize).toBeGreaterThanOrEqual(2);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 8: Spacing scale multiples ─────────────────────────────────────

describe('Feature: ui-style-improvements, Property 8: Spacing scale multiples', () => {
  /**
   * Validates: Requirements 1.3
   *
   * For any value in the SpacingScale, the value SHALL be a positive multiple of 4.
   */
  it('should have all spacing values as positive multiples of 4', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...spacingKeys),
        (key) => {
          const value = spacing[key];

          // Value must be positive
          expect(value).toBeGreaterThan(0);

          // Value must be a multiple of 4
          expect(value % 4).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });
});


// ─── Property 2: Dark mode color selection ───────────────────────────────────

describe('Feature: ui-style-improvements, Property 2: Dark mode color selection', () => {
  /**
   * Validates: Requirements 2.1
   *
   * For any color token path, when the resolved scheme is 'dark', the value returned
   * SHALL equal the corresponding value in the dark mode palette, and when the resolved
   * scheme is 'light', it SHALL equal the light mode palette value.
   *
   * Since useThemeColors is a hook that depends on Zustand store, we verify the
   * underlying data contract: colors.light and colors.dark are distinct objects
   * with the correct structure and values for each mode.
   */
  const backgroundKeys = ['primary', 'secondary', 'tertiary'] as const;
  const textKeys = ['primary', 'secondary', 'tertiary', 'inverse'] as const;
  const borderKeys = ['default', 'subtle', 'strong'] as const;

  it('should return distinct color palettes for light and dark modes', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...modes),
        (mode) => {
          const palette = colors[mode];

          // Palette must be a valid object with expected groups
          expect(palette).toHaveProperty('background');
          expect(palette).toHaveProperty('text');
          expect(palette).toHaveProperty('border');
          expect(palette).toHaveProperty('semantic');
          expect(palette).toHaveProperty('surface');
          expect(palette).toHaveProperty('interactive');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should return mode-specific background colors for each resolved scheme', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...modes),
        fc.constantFrom(...backgroundKeys),
        (mode, key) => {
          const palette = colors[mode];
          const value = palette.background[key];

          // Value must be a non-empty string (hex or rgba)
          expect(typeof value).toBe('string');
          expect(value.length).toBeGreaterThan(0);

          // Light and dark must differ for the same key
          const otherMode = mode === 'light' ? 'dark' : 'light';
          expect(value).not.toBe(colors[otherMode].background[key]);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should return mode-specific text colors for each resolved scheme', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...modes),
        fc.constantFrom(...textKeys),
        (mode, key) => {
          const palette = colors[mode];
          const value = palette.text[key];

          expect(typeof value).toBe('string');
          expect(value.length).toBeGreaterThan(0);

          // Light and dark must differ for the same key
          const otherMode = mode === 'light' ? 'dark' : 'light';
          expect(value).not.toBe(colors[otherMode].text[key]);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should return mode-specific border colors for each resolved scheme', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...modes),
        fc.constantFrom(...borderKeys),
        (mode, key) => {
          const palette = colors[mode];
          const value = palette.border[key];

          expect(typeof value).toBe('string');
          expect(value.length).toBeGreaterThan(0);

          // Light and dark must differ for the same key
          const otherMode = mode === 'light' ? 'dark' : 'light';
          expect(value).not.toBe(colors[otherMode].border[key]);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 3: Dark mode luminance constraints ─────────────────────────────

describe('Feature: ui-style-improvements, Property 3: Dark mode luminance constraints', () => {
  /**
   * Validates: Requirements 2.2
   *
   * For any background color in the dark mode palette, the relative luminance
   * SHALL be ≤ 0.05. For any primary text color in the dark mode palette,
   * the relative luminance SHALL be ≥ 0.8.
   */
  const darkBackgrounds = [
    { key: 'primary', hex: colors.dark.background.primary },
    { key: 'secondary', hex: colors.dark.background.secondary },
    { key: 'tertiary', hex: colors.dark.background.tertiary },
  ] as const;

  it('should have dark mode background luminance ≤ 0.05 for all background colors', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...darkBackgrounds),
        ({ key: _key, hex }) => {
          const luminance = relativeLuminance(hex);
          expect(luminance).toBeLessThanOrEqual(0.05);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should have dark mode primary text luminance ≥ 0.8', () => {
    fc.assert(
      fc.property(
        fc.constant(colors.dark.text.primary),
        (textColor) => {
          const luminance = relativeLuminance(textColor);
          expect(luminance).toBeGreaterThanOrEqual(0.8);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 4: Shadow opacity reduction in dark mode ───────────────────────

import { shadows } from '../theme';

describe('Feature: ui-style-improvements, Property 4: Shadow opacity reduction in dark mode', () => {
  /**
   * Validates: Requirements 2.3
   *
   * For any shadow level (sm, md, lg), the dark mode shadowOpacity SHALL be
   * at most 50% of the corresponding light mode shadowOpacity.
   */
  const shadowLevels = ['sm', 'md', 'lg'] as const;

  it('should have dark shadowOpacity ≤ 50% of light shadowOpacity for each level', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...shadowLevels),
        (level) => {
          const lightOpacity = shadows.light[level].shadowOpacity;
          const darkOpacity = shadows.dark[level].shadowOpacity;

          // Dark opacity must be at most 50% of light opacity
          expect(darkOpacity).toBeLessThanOrEqual(lightOpacity * 0.5);

          // Both must be positive
          expect(lightOpacity).toBeGreaterThan(0);
          expect(darkOpacity).toBeGreaterThan(0);
        },
      ),
      { numRuns: 100 },
    );
  });
});


// ─── Helpers (Property 5) ────────────────────────────────────────────────────

/**
 * Computes WCAG 2.1 contrast ratio between two hex colors.
 * Formula: (L1 + 0.05) / (L2 + 0.05) where L1 is the lighter luminance.
 */
function contrastRatio(hex1: string, hex2: string): number {
  const lum1 = relativeLuminance(hex1);
  const lum2 = relativeLuminance(hex2);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

// ─── Property 5: WCAG contrast compliance ────────────────────────────────────

describe('Feature: ui-style-improvements, Property 5: WCAG contrast compliance', () => {
  /**
   * Validates: Requirements 2.5, 3.3
   *
   * For any text color and its corresponding background color in either light or dark mode,
   * the WCAG 2.1 contrast ratio SHALL be ≥ 4.5:1.
   * For any interactive/graphic element color against its background, the contrast ratio SHALL be ≥ 3:1.
   */

  const textBackgroundPairs: { text: string; bg: string; label: string }[] = [
    { text: 'text.primary', bg: 'background.primary', label: 'text.primary on background.primary' },
    { text: 'text.secondary', bg: 'background.primary', label: 'text.secondary on background.primary' },
    { text: 'text.primary', bg: 'surface.card', label: 'text.primary on surface.card' },
  ];

  const interactivePairs: { fg: string; bg: string; label: string }[] = [
    { fg: 'interactive.primary', bg: 'background.primary', label: 'interactive.primary on background.primary' },
    { fg: 'semantic.primary.base', bg: 'background.primary', label: 'semantic.primary.base on background.primary' },
  ];

  /**
   * Helper to resolve a dot-path color token from a ModeColors object.
   */
  function resolveColor(modeColors: typeof colors['light'], path: string): string {
    const parts = path.split('.');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let current: any = modeColors;
    for (const part of parts) {
      current = current[part];
    }
    return current as string;
  }

  it('should have ≥ 4.5:1 contrast ratio for text/background pairs in both modes', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...modes),
        fc.constantFrom(...textBackgroundPairs),
        (mode, pair) => {
          const modeColors = colors[mode];
          const textColor = resolveColor(modeColors, pair.text);
          const bgColor = resolveColor(modeColors, pair.bg);
          const ratio = contrastRatio(textColor, bgColor);

          expect(ratio).toBeGreaterThanOrEqual(4.5);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should have ≥ 3:1 contrast ratio for interactive elements on background in both modes', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...modes),
        fc.constantFrom(...interactivePairs),
        (mode, pair) => {
          const modeColors = colors[mode];
          const fgColor = resolveColor(modeColors, pair.fg);
          const bgColor = resolveColor(modeColors, pair.bg);
          const ratio = contrastRatio(fgColor, bgColor);

          expect(ratio).toBeGreaterThanOrEqual(3);
        },
      ),
      { numRuns: 100 },
    );
  });
});
