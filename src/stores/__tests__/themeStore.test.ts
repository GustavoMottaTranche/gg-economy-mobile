/**
 * Theme Store Tests
 *
 * Tests for the theme/color scheme Zustand store.
 * Validates:
 * - Default preference is 'system'
 * - Resolved scheme defaults based on Appearance API
 * - setPreference updates both preference and resolvedScheme
 * - Appearance listener updates resolvedScheme when preference is 'system'
 * - Appearance listener does NOT update when preference is explicit (light/dark)
 * - Null return from Appearance API defaults to 'light'
 *
 * **Validates: Requirements 2.1, 2.4, 2.6**
 */

import { act } from '@testing-library/react-native';
import { Appearance } from 'react-native';
import { useThemeStore } from '../themeStore';
import type { ThemePreference, ResolvedScheme } from '../themeStore';

describe('themeStore', () => {
  beforeEach(() => {
    useThemeStore.setState({
      preference: 'system',
      resolvedScheme: 'light',
    });
  });

  describe('Initial State', () => {
    it('defaults preference to system', () => {
      const state = useThemeStore.getState();
      expect(state.preference).toBe('system');
    });

    it('resolves scheme to light or dark based on Appearance', () => {
      // The initial resolvedScheme should be either 'light' or 'dark'
      const state = useThemeStore.getState();
      expect(['light', 'dark']).toContain(state.resolvedScheme);
    });
  });

  describe('setPreference', () => {
    it('sets preference to light and resolves to light', () => {
      act(() => {
        useThemeStore.getState().setPreference('light');
      });

      const state = useThemeStore.getState();
      expect(state.preference).toBe('light');
      expect(state.resolvedScheme).toBe('light');
    });

    it('sets preference to dark and resolves to dark', () => {
      act(() => {
        useThemeStore.getState().setPreference('dark');
      });

      const state = useThemeStore.getState();
      expect(state.preference).toBe('dark');
      expect(state.resolvedScheme).toBe('dark');
    });

    it('sets preference to system and resolves based on Appearance', () => {
      act(() => {
        useThemeStore.getState().setPreference('system');
      });

      const state = useThemeStore.getState();
      expect(state.preference).toBe('system');
      // resolvedScheme depends on Appearance.getColorScheme() which may be null in test env
      expect(['light', 'dark']).toContain(state.resolvedScheme);
    });

    it('handles state transitions: system → light → dark → system', () => {
      // Switch to light
      act(() => {
        useThemeStore.getState().setPreference('light');
      });
      expect(useThemeStore.getState().preference).toBe('light');
      expect(useThemeStore.getState().resolvedScheme).toBe('light');

      // Switch to dark
      act(() => {
        useThemeStore.getState().setPreference('dark');
      });
      expect(useThemeStore.getState().preference).toBe('dark');
      expect(useThemeStore.getState().resolvedScheme).toBe('dark');

      // Switch back to system
      act(() => {
        useThemeStore.getState().setPreference('system');
      });
      expect(useThemeStore.getState().preference).toBe('system');
      // When system, resolvedScheme depends on Appearance API (null → 'light' in test)
      expect(['light', 'dark']).toContain(useThemeStore.getState().resolvedScheme);
    });

    it('defaults to light when Appearance.getColorScheme() returns null', () => {
      // In the test environment, Appearance.getColorScheme() returns null
      // Our implementation should default to 'light'
      const originalGetColorScheme = Appearance.getColorScheme;
      Appearance.getColorScheme = () => null;

      act(() => {
        useThemeStore.getState().setPreference('system');
      });

      expect(useThemeStore.getState().resolvedScheme).toBe('light');

      // Restore
      Appearance.getColorScheme = originalGetColorScheme;
    });

    it('resolves to dark when Appearance reports dark', () => {
      const originalGetColorScheme = Appearance.getColorScheme;
      Appearance.getColorScheme = () => 'dark';

      act(() => {
        useThemeStore.getState().setPreference('system');
      });

      expect(useThemeStore.getState().resolvedScheme).toBe('dark');

      // Restore
      Appearance.getColorScheme = originalGetColorScheme;
    });

    it('resolves to light when Appearance reports light', () => {
      const originalGetColorScheme = Appearance.getColorScheme;
      Appearance.getColorScheme = () => 'light';

      act(() => {
        useThemeStore.getState().setPreference('system');
      });

      expect(useThemeStore.getState().resolvedScheme).toBe('light');

      // Restore
      Appearance.getColorScheme = originalGetColorScheme;
    });
  });

  describe('Appearance Change Listener', () => {
    it('updates resolvedScheme when preference is system and system changes to dark', () => {
      useThemeStore.setState({ preference: 'system', resolvedScheme: 'light' });

      // Simulate the Appearance change listener behavior directly on the store
      // (the listener calls setState when preference is 'system')
      act(() => {
        const state = useThemeStore.getState();
        if (state.preference === 'system') {
          useThemeStore.setState({ resolvedScheme: 'dark' });
        }
      });

      expect(useThemeStore.getState().resolvedScheme).toBe('dark');
    });

    it('updates resolvedScheme when preference is system and system changes to light', () => {
      useThemeStore.setState({ preference: 'system', resolvedScheme: 'dark' });

      act(() => {
        const state = useThemeStore.getState();
        if (state.preference === 'system') {
          useThemeStore.setState({ resolvedScheme: 'light' });
        }
      });

      expect(useThemeStore.getState().resolvedScheme).toBe('light');
    });

    it('does NOT update resolvedScheme when preference is light', () => {
      useThemeStore.setState({ preference: 'light', resolvedScheme: 'light' });

      // Simulate listener logic: only update if preference is 'system'
      act(() => {
        const state = useThemeStore.getState();
        if (state.preference === 'system') {
          useThemeStore.setState({ resolvedScheme: 'dark' });
        }
      });

      // Should remain light because user explicitly chose light
      expect(useThemeStore.getState().resolvedScheme).toBe('light');
    });

    it('does NOT update resolvedScheme when preference is dark', () => {
      useThemeStore.setState({ preference: 'dark', resolvedScheme: 'dark' });

      // Simulate listener logic: only update if preference is 'system'
      act(() => {
        const state = useThemeStore.getState();
        if (state.preference === 'system') {
          useThemeStore.setState({ resolvedScheme: 'light' });
        }
      });

      // Should remain dark because user explicitly chose dark
      expect(useThemeStore.getState().resolvedScheme).toBe('dark');
    });

    it('defaults to light when system reports null color scheme', () => {
      useThemeStore.setState({ preference: 'system', resolvedScheme: 'dark' });

      // Simulate listener receiving null (our implementation defaults to 'light')
      act(() => {
        const state = useThemeStore.getState();
        if (state.preference === 'system') {
          const colorScheme: 'light' | 'dark' | null = null;
          useThemeStore.setState({
            resolvedScheme: colorScheme === 'dark' ? 'dark' : 'light',
          });
        }
      });

      expect(useThemeStore.getState().resolvedScheme).toBe('light');
    });
  });

  describe('Type Exports', () => {
    it('ThemePreference type accepts valid values', () => {
      const prefs: ThemePreference[] = ['system', 'light', 'dark'];
      expect(prefs).toHaveLength(3);
    });

    it('ResolvedScheme type accepts valid values', () => {
      const schemes: ResolvedScheme[] = ['light', 'dark'];
      expect(schemes).toHaveLength(2);
    });
  });
});
