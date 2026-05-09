/**
 * Zustand store for language/locale management
 *
 * Manages the current language setting with persistence to AsyncStorage.
 * Integrates with i18next for language switching.
 *
 * **Validates: Requirements 25, 26**
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  type SupportedLocale,
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  detectDeviceLocale,
  changeLanguage,
  isSupportedLocale,
} from '../i18n';

/**
 * Language store state
 */
interface LanguageStoreState {
  /** Current locale */
  locale: SupportedLocale;
  /** Whether the locale was explicitly set by the user (vs auto-detected) */
  isUserSelected: boolean;
  /** Whether the store has been hydrated from persistence */
  isHydrated: boolean;
}

/**
 * Language store actions
 */
interface LanguageStoreActions {
  /**
   * Set the current locale
   * @param locale - New locale to set
   */
  setLocale: (locale: SupportedLocale) => Promise<void>;

  /**
   * Reset to device-detected locale
   */
  resetToDeviceLocale: () => Promise<void>;

  /**
   * Initialize the store (called on app start)
   * Syncs the persisted locale with i18next
   */
  initialize: () => Promise<void>;

  /**
   * Mark the store as hydrated
   */
  setHydrated: (hydrated: boolean) => void;

  /**
   * Reset the store (useful for testing)
   */
  reset: () => void;
}

type LanguageStore = LanguageStoreState & LanguageStoreActions;

/**
 * Initial state
 */
const initialState: LanguageStoreState = {
  locale: DEFAULT_LOCALE,
  isUserSelected: false,
  isHydrated: false,
};

/**
 * Zustand store for language management with persistence
 */
export const useLanguageStore = create<LanguageStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      setLocale: async (locale: SupportedLocale) => {
        if (!isSupportedLocale(locale)) {
          throw new Error(`Unsupported locale: ${locale}`);
        }

        // Update i18next
        await changeLanguage(locale);

        // Update store
        set({
          locale,
          isUserSelected: true,
        });
      },

      resetToDeviceLocale: async () => {
        const deviceLocale = detectDeviceLocale();

        // Update i18next
        await changeLanguage(deviceLocale);

        // Update store
        set({
          locale: deviceLocale,
          isUserSelected: false,
        });
      },

      initialize: async () => {
        const state = get();

        // If user has selected a locale, use it
        // Otherwise, detect from device
        const localeToUse = state.isUserSelected ? state.locale : detectDeviceLocale();

        // Sync with i18next
        await changeLanguage(localeToUse);

        // Update store if needed
        if (localeToUse !== state.locale) {
          set({ locale: localeToUse });
        }
      },

      setHydrated: (hydrated: boolean) => {
        set({ isHydrated: hydrated });
      },

      reset: () => {
        set(initialState);
      },
    }),
    {
      name: 'gg-economy-language-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        // Only persist these fields
        locale: state.locale,
        isUserSelected: state.isUserSelected,
      }),
      onRehydrateStorage: () => (state) => {
        // Mark as hydrated when rehydration completes
        state?.setHydrated(true);
      },
    }
  )
);

/**
 * Hook to get the current locale
 */
export function useLocale(): SupportedLocale {
  return useLanguageStore((state) => state.locale);
}

/**
 * Hook to get language management functions
 */
export function useLanguageSettings() {
  const locale = useLanguageStore((state) => state.locale);
  const isUserSelected = useLanguageStore((state) => state.isUserSelected);
  const setLocale = useLanguageStore((state) => state.setLocale);
  const resetToDeviceLocale = useLanguageStore((state) => state.resetToDeviceLocale);

  return {
    locale,
    isUserSelected,
    setLocale,
    resetToDeviceLocale,
    supportedLocales: SUPPORTED_LOCALES,
  };
}

/**
 * Hook to check if the store is ready (hydrated)
 */
export function useLanguageStoreReady(): boolean {
  return useLanguageStore((state) => state.isHydrated);
}

/**
 * Get the current locale synchronously (for non-React contexts)
 */
export function getCurrentLocaleSync(): SupportedLocale {
  return useLanguageStore.getState().locale;
}

/**
 * Set the locale synchronously (for non-React contexts)
 */
export async function setLocaleSync(locale: SupportedLocale): Promise<void> {
  await useLanguageStore.getState().setLocale(locale);
}
