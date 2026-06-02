/**
 * Zustand store for theme/color scheme management
 *
 * Manages the user's theme preference (system, light, dark) and resolves
 * the actual color scheme based on the device's Appearance API.
 * Listens for system appearance changes and updates automatically.
 *
 * **Validates: Requirements 2.1, 2.4, 2.6**
 */
import { create } from 'zustand';
import { Appearance } from 'react-native';

/**
 * User's theme preference.
 * - 'system': follow the device's color scheme
 * - 'light': always use light mode
 * - 'dark': always use dark mode
 */
export type ThemePreference = 'system' | 'light' | 'dark';

/**
 * The resolved color scheme after applying the user's preference.
 * Always either 'light' or 'dark' (never null).
 */
export type ResolvedScheme = 'light' | 'dark';

/**
 * Theme store state and actions.
 */
interface ThemeState {
  /** User's theme preference */
  preference: ThemePreference;
  /** Resolved color scheme based on preference and system setting */
  resolvedScheme: ResolvedScheme;
  /** Update the user's theme preference */
  setPreference: (pref: ThemePreference) => void;
}

/**
 * Resolves the system color scheme, defaulting to 'light' if
 * Appearance.getColorScheme() returns null.
 */
function getSystemScheme(): ResolvedScheme {
  return Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
}

/**
 * Zustand store for theme management.
 *
 * Defaults to 'system' preference and resolves the scheme based on
 * the device's current appearance setting.
 */
export const useThemeStore = create<ThemeState>((set) => ({
  preference: 'system',
  resolvedScheme: getSystemScheme(),
  setPreference: (pref) => {
    const resolved: ResolvedScheme = pref === 'system' ? getSystemScheme() : pref;
    set({ preference: pref, resolvedScheme: resolved });
  },
}));

/**
 * Listener for system appearance changes.
 * When the user's preference is 'system', automatically updates
 * the resolved scheme to match the new system setting.
 */
Appearance.addChangeListener(({ colorScheme }) => {
  const state = useThemeStore.getState();
  if (state.preference === 'system') {
    useThemeStore.setState({
      resolvedScheme: colorScheme === 'dark' ? 'dark' : 'light',
    });
  }
});
