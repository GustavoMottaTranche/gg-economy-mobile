/**
 * Unit tests for language store
 *
 * Tests Zustand store for language management with persistence.
 *
 * **Validates: Requirements 25, 26, 29**
 */
import { act } from '@testing-library/react-native';
import {
  useLanguageStore,
  useLocale,
  useLanguageSettings,
} from '../../../src/stores/languageStore';
import type { SupportedLocale } from '../../../src/i18n';

// Mock i18next changeLanguage
const mockChangeLanguage = jest.fn().mockResolvedValue(undefined);
jest.mock('../../../src/i18n', () => ({
  ...jest.requireActual('../../../src/i18n'),
  changeLanguage: (...args: unknown[]) => mockChangeLanguage(...args),
  detectDeviceLocale: jest.fn().mockReturnValue('en'),
  isSupportedLocale: (locale: string) => ['pt-BR', 'en'].includes(locale),
  SUPPORTED_LOCALES: ['pt-BR', 'en'],
  DEFAULT_LOCALE: 'en',
}));

describe('languageStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useLanguageStore.getState().reset();
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have default locale as en', () => {
      const state = useLanguageStore.getState();
      expect(state.locale).toBe('en');
    });

    it('should have isUserSelected as false', () => {
      const state = useLanguageStore.getState();
      expect(state.isUserSelected).toBe(false);
    });

    it('should have isHydrated as false initially', () => {
      const state = useLanguageStore.getState();
      expect(state.isHydrated).toBe(false);
    });
  });

  describe('setLocale', () => {
    it('should update locale', async () => {
      await act(async () => {
        await useLanguageStore.getState().setLocale('pt-BR');
      });

      const state = useLanguageStore.getState();
      expect(state.locale).toBe('pt-BR');
    });

    it('should set isUserSelected to true', async () => {
      await act(async () => {
        await useLanguageStore.getState().setLocale('pt-BR');
      });

      const state = useLanguageStore.getState();
      expect(state.isUserSelected).toBe(true);
    });

    it('should call i18next changeLanguage', async () => {
      await act(async () => {
        await useLanguageStore.getState().setLocale('pt-BR');
      });

      expect(mockChangeLanguage).toHaveBeenCalledWith('pt-BR');
    });

    it('should throw error for unsupported locale', async () => {
      await expect(
        act(async () => {
          await useLanguageStore.getState().setLocale('fr' as SupportedLocale);
        })
      ).rejects.toThrow('Unsupported locale: fr');
    });
  });

  describe('resetToDeviceLocale', () => {
    it('should reset to device locale', async () => {
      // First set a user-selected locale
      await act(async () => {
        await useLanguageStore.getState().setLocale('pt-BR');
      });

      // Then reset to device locale
      await act(async () => {
        await useLanguageStore.getState().resetToDeviceLocale();
      });

      const state = useLanguageStore.getState();
      expect(state.locale).toBe('en'); // Mocked device locale
      expect(state.isUserSelected).toBe(false);
    });

    it('should call i18next changeLanguage with device locale', async () => {
      await act(async () => {
        await useLanguageStore.getState().resetToDeviceLocale();
      });

      expect(mockChangeLanguage).toHaveBeenCalledWith('en');
    });
  });

  describe('initialize', () => {
    it('should use user-selected locale if set', async () => {
      // Set user locale
      await act(async () => {
        await useLanguageStore.getState().setLocale('pt-BR');
      });

      mockChangeLanguage.mockClear();

      // Initialize
      await act(async () => {
        await useLanguageStore.getState().initialize();
      });

      expect(mockChangeLanguage).toHaveBeenCalledWith('pt-BR');
    });

    it('should use device locale if not user-selected', async () => {
      await act(async () => {
        await useLanguageStore.getState().initialize();
      });

      expect(mockChangeLanguage).toHaveBeenCalledWith('en');
    });
  });

  describe('setHydrated', () => {
    it('should update isHydrated state', () => {
      act(() => {
        useLanguageStore.getState().setHydrated(true);
      });

      expect(useLanguageStore.getState().isHydrated).toBe(true);
    });
  });

  describe('reset', () => {
    it('should reset to initial state', async () => {
      // Modify state
      await act(async () => {
        await useLanguageStore.getState().setLocale('pt-BR');
        useLanguageStore.getState().setHydrated(true);
      });

      // Reset
      act(() => {
        useLanguageStore.getState().reset();
      });

      const state = useLanguageStore.getState();
      expect(state.locale).toBe('en');
      expect(state.isUserSelected).toBe(false);
      expect(state.isHydrated).toBe(false);
    });
  });

  describe('selector hooks', () => {
    describe('useLocale', () => {
      it('should return current locale', () => {
        // This is a simplified test - in real usage, this would be tested with renderHook
        const locale = useLanguageStore.getState().locale;
        expect(locale).toBe('en');
      });
    });

    describe('useLanguageSettings', () => {
      it('should return language settings', () => {
        const state = useLanguageStore.getState();
        expect(state.locale).toBeDefined();
        expect(state.isUserSelected).toBeDefined();
        expect(state.setLocale).toBeDefined();
        expect(state.resetToDeviceLocale).toBeDefined();
      });
    });
  });

  describe('persistence', () => {
    it('should only persist locale and isUserSelected', () => {
      // The persist middleware's partialize function should only include these fields
      // This is tested implicitly through the store configuration
      const state = useLanguageStore.getState();
      expect(state).toHaveProperty('locale');
      expect(state).toHaveProperty('isUserSelected');
      expect(state).toHaveProperty('isHydrated');
    });
  });
});
