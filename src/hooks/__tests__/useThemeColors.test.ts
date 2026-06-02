/**
 * useThemeColors and useThemeStyles Hook Tests
 *
 * Tests for the theme hooks that provide mode-aware colors and
 * unified style tokens to components.
 *
 * **Validates: Requirements 2.1, 2.3, 2.4, 10.5, 10.6, 10.7**
 */
import { renderHook, act } from '@testing-library/react-native';

// Mock react-native Appearance API
jest.mock('react-native', () => ({
  Appearance: {
    getColorScheme: jest.fn(() => 'light'),
    addChangeListener: jest.fn(() => ({ remove: jest.fn() })),
  },
}));

import { useThemeColors } from '../useThemeColors';
import { useThemeStyles } from '../useThemeStyles';
import { useThemeStore } from '../../stores/themeStore';
import { colors, shadows, TRANSACTION_COLORS } from '../../constants/theme';
import { getToken } from '../../utils/getToken';

describe('useThemeColors', () => {
  beforeEach(() => {
    // Reset store to default state
    useThemeStore.setState({ preference: 'system', resolvedScheme: 'light' });
  });

  it('should return light colors when resolvedScheme is light', () => {
    const { result } = renderHook(() => useThemeColors());

    expect(result.current).toBe(colors.light);
    expect(result.current.background.primary).toBe('#FFFFFF');
  });

  it('should return dark colors when resolvedScheme is dark', () => {
    act(() => {
      useThemeStore.setState({ resolvedScheme: 'dark' });
    });

    const { result } = renderHook(() => useThemeColors());

    expect(result.current).toBe(colors.dark);
    expect(result.current.background.primary).toBe('#000000');
  });

  it('should update when resolvedScheme changes', () => {
    const { result } = renderHook(() => useThemeColors());

    expect(result.current).toBe(colors.light);

    act(() => {
      useThemeStore.setState({ resolvedScheme: 'dark' });
    });

    expect(result.current).toBe(colors.dark);
  });
});

describe('useThemeStyles', () => {
  beforeEach(() => {
    useThemeStore.setState({ preference: 'system', resolvedScheme: 'light' });
  });

  it('should return colors matching the resolved scheme', () => {
    const { result } = renderHook(() => useThemeStyles());

    expect(result.current.colors).toBe(colors.light);
  });

  it('should return typography scale', () => {
    const { result } = renderHook(() => useThemeStyles());

    expect(result.current.typography).toBeDefined();
    expect(result.current.typography.body.fontSize).toBe(16);
    expect(result.current.typography.display.fontSize).toBe(34);
  });

  it('should return spacing scale', () => {
    const { result } = renderHook(() => useThemeStyles());

    expect(result.current.spacing).toBeDefined();
    expect(result.current.spacing.base).toBe(16);
    expect(result.current.spacing.xs).toBe(4);
  });

  it('should return borderRadius constants', () => {
    const { result } = renderHook(() => useThemeStyles());

    expect(result.current.borderRadius).toBeDefined();
    expect(result.current.borderRadius.sm).toBe(8);
    expect(result.current.borderRadius.lg).toBe(16);
  });

  it('should return light shadows when resolvedScheme is light', () => {
    const { result } = renderHook(() => useThemeStyles());

    expect(result.current.shadows).toBe(shadows.light);
    expect(result.current.shadows.sm.elevation).toBe(2);
  });

  it('should return dark shadows when resolvedScheme is dark', () => {
    act(() => {
      useThemeStore.setState({ resolvedScheme: 'dark' });
    });

    const { result } = renderHook(() => useThemeStyles());

    expect(result.current.shadows).toBe(shadows.dark);
    expect(result.current.shadows.sm.elevation).toBe(0);
  });

  it('should update shadows when theme changes from light to dark', () => {
    const { result } = renderHook(() => useThemeStyles());

    expect(result.current.shadows).toBe(shadows.light);

    act(() => {
      useThemeStore.setState({ resolvedScheme: 'dark' });
    });

    expect(result.current.shadows).toBe(shadows.dark);
  });
});

// ─── getToken Fallback Behavior ──────────────────────────────────────────────

describe('getToken fallback behavior', () => {
  /**
   * Validates: Requirements 10.6
   *
   * Tests that the getToken utility correctly returns fallback values
   * for missing tokens and logs warnings in development mode.
   */

  const tokenObj = {
    primary: '#3B82F6',
    secondary: '#6B7280',
    base: 16,
  };

  it('returns the token value when key exists', () => {
    expect(getToken(tokenObj, 'primary', '#000000')).toBe('#3B82F6');
    expect(getToken(tokenObj, 'base', 0)).toBe(16);
  });

  it('returns the fallback when key does not exist', () => {
    expect(getToken(tokenObj, 'nonexistent', '#FFFFFF')).toBe('#FFFFFF');
    expect(getToken(tokenObj, 'missing', 24)).toBe(24);
  });

  it('logs a console.warn in __DEV__ mode for missing tokens', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    getToken(tokenObj, 'unknown', '#000');

    expect(warnSpy).toHaveBeenCalledWith('[Theme] Token "unknown" not found, using fallback');

    warnSpy.mockRestore();
  });

  it('does not warn when the key exists', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    getToken(tokenObj, 'primary', '#000');

    expect(warnSpy).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it('works with nested theme color objects as token sources', () => {
    const bgTokens = colors.light.background as unknown as Record<string, string>;
    expect(getToken(bgTokens, 'primary', '#000')).toBe('#FFFFFF');
    expect(getToken(bgTokens, 'nonexistent', '#CCCCCC')).toBe('#CCCCCC');
  });
});

// ─── TRANSACTION_COLORS Backward Compatibility ───────────────────────────────

describe('TRANSACTION_COLORS backward compatibility', () => {
  /**
   * Validates: Requirements 10.7
   *
   * Tests that the legacy TRANSACTION_COLORS export is preserved and
   * maintains its expected structure and values for backward compatibility
   * with existing components.
   */

  it('exports TRANSACTION_COLORS as a defined object', () => {
    expect(TRANSACTION_COLORS).toBeDefined();
    expect(typeof TRANSACTION_COLORS).toBe('object');
  });

  it('contains income color scheme with text, background, and border', () => {
    expect(TRANSACTION_COLORS.income).toBeDefined();
    expect(TRANSACTION_COLORS.income.text).toBeDefined();
    expect(TRANSACTION_COLORS.income.background).toBeDefined();
    expect(TRANSACTION_COLORS.income.border).toBeDefined();
  });

  it('contains expense color scheme with text, background, and border', () => {
    expect(TRANSACTION_COLORS.expense).toBeDefined();
    expect(TRANSACTION_COLORS.expense.text).toBeDefined();
    expect(TRANSACTION_COLORS.expense.background).toBeDefined();
    expect(TRANSACTION_COLORS.expense.border).toBeDefined();
  });

  it('contains neutral color scheme with text, background, and border', () => {
    expect(TRANSACTION_COLORS.neutral).toBeDefined();
    expect(TRANSACTION_COLORS.neutral.text).toBeDefined();
    expect(TRANSACTION_COLORS.neutral.background).toBeDefined();
    expect(TRANSACTION_COLORS.neutral.border).toBeDefined();
  });

  it('contains selected color scheme with border and background', () => {
    expect(TRANSACTION_COLORS.selected).toBeDefined();
    expect(TRANSACTION_COLORS.selected.border).toBeDefined();
    expect(TRANSACTION_COLORS.selected.background).toBeDefined();
  });

  it('contains excluded color scheme with text and background', () => {
    expect(TRANSACTION_COLORS.excluded).toBeDefined();
    expect(TRANSACTION_COLORS.excluded.text).toBeDefined();
    expect(TRANSACTION_COLORS.excluded.background).toBeDefined();
  });

  it('income colors use green tones (success semantic)', () => {
    // Income text should be a dark green
    expect(TRANSACTION_COLORS.income.text).toBe('#166534');
    // Income background should be a light green
    expect(TRANSACTION_COLORS.income.background).toBe('#dcfce7');
  });

  it('expense colors use red tones (danger semantic)', () => {
    // Expense text should be a dark red
    expect(TRANSACTION_COLORS.expense.text).toBe('#991b1b');
    // Expense background should be a light red
    expect(TRANSACTION_COLORS.expense.background).toBe('#fee2e2');
  });

  it('all color values are valid hex strings', () => {
    const hexPattern = /^#[0-9a-fA-F]{6}$/;

    // Check all income colors
    expect(TRANSACTION_COLORS.income.text).toMatch(hexPattern);
    expect(TRANSACTION_COLORS.income.background).toMatch(hexPattern);
    expect(TRANSACTION_COLORS.income.border).toMatch(hexPattern);

    // Check all expense colors
    expect(TRANSACTION_COLORS.expense.text).toMatch(hexPattern);
    expect(TRANSACTION_COLORS.expense.background).toMatch(hexPattern);
    expect(TRANSACTION_COLORS.expense.border).toMatch(hexPattern);

    // Check neutral colors
    expect(TRANSACTION_COLORS.neutral.text).toMatch(hexPattern);
    expect(TRANSACTION_COLORS.neutral.background).toMatch(hexPattern);
    expect(TRANSACTION_COLORS.neutral.border).toMatch(hexPattern);

    // Check selected colors
    expect(TRANSACTION_COLORS.selected.border).toMatch(hexPattern);
    expect(TRANSACTION_COLORS.selected.background).toMatch(hexPattern);

    // Check excluded colors
    expect(TRANSACTION_COLORS.excluded.text).toMatch(hexPattern);
    expect(TRANSACTION_COLORS.excluded.background).toMatch(hexPattern);
  });

  it('TRANSACTION_COLORS structure is stable and complete', () => {
    // Verify the object has all expected keys (structural stability)
    const keys = Object.keys(TRANSACTION_COLORS);
    expect(keys).toContain('income');
    expect(keys).toContain('expense');
    expect(keys).toContain('neutral');
    expect(keys).toContain('selected');
    expect(keys).toContain('excluded');
    expect(keys).toHaveLength(5);
  });

  it('income colors align with semantic success colors from the theme', () => {
    // Verify backward compatibility: income colors should match the light mode success semantic
    // (case-insensitive comparison since TRANSACTION_COLORS uses lowercase hex)
    expect(TRANSACTION_COLORS.income.background.toLowerCase()).toBe(
      colors.light.semantic.success.light.toLowerCase()
    );
    expect(TRANSACTION_COLORS.income.text.toLowerCase()).toBe(
      colors.light.semantic.success.dark.toLowerCase()
    );
  });

  it('expense colors align with semantic danger colors from the theme', () => {
    // Verify backward compatibility: expense colors should match the light mode danger semantic
    expect(TRANSACTION_COLORS.expense.background.toLowerCase()).toBe(
      colors.light.semantic.danger.light.toLowerCase()
    );
    expect(TRANSACTION_COLORS.expense.text.toLowerCase()).toBe(
      colors.light.semantic.danger.dark.toLowerCase()
    );
  });
});
