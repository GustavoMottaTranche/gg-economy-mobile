/**
 * i18next configuration with expo-localization for language detection
 *
 * Configures i18next with:
 * - Device language detection via expo-localization
 * - Fallback to English if device language is not supported
 * - Support for pt-BR and en locales
 * - Integration with react-i18next for React components
 *
 * **Validates: Requirements 25, 26**
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

import ptBR from './locales/pt-BR.json';
import en from './locales/en.json';

/**
 * Supported locales in the application
 */
export const SUPPORTED_LOCALES = ['pt-BR', 'en'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

/**
 * Default/fallback locale
 */
export const DEFAULT_LOCALE: SupportedLocale = 'en';

/**
 * Language display names for UI
 */
export const LOCALE_DISPLAY_NAMES: Record<SupportedLocale, string> = {
  'pt-BR': 'Português (Brasil)',
  en: 'English',
};

/**
 * Resources for i18next
 */
const resources = {
  'pt-BR': { translation: ptBR },
  pt: { translation: ptBR },
  en: { translation: en },
};

/**
 * Detects the device locale and returns a supported locale
 *
 * @returns The detected supported locale or the default locale
 */
export function detectDeviceLocale(): SupportedLocale {
  try {
    const locales = Localization.getLocales();

    if (!locales || locales.length === 0) {
      return DEFAULT_LOCALE;
    }

    // Get the first locale from the device
    const deviceLocale = locales[0];
    const languageCode = deviceLocale.languageCode;
    const regionCode = deviceLocale.regionCode;

    // Check for exact match (e.g., pt-BR)
    if (regionCode) {
      const fullLocale = `${languageCode}-${regionCode}` as SupportedLocale;
      if (SUPPORTED_LOCALES.includes(fullLocale)) {
        return fullLocale;
      }
    }

    // Check for language-only match (e.g., pt -> pt-BR)
    if (languageCode === 'pt') {
      return 'pt-BR';
    }

    if (languageCode === 'en') {
      return 'en';
    }

    return DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}

/**
 * Checks if a locale string is a supported locale
 *
 * @param locale - Locale string to check
 * @returns True if the locale is supported
 */
export function isSupportedLocale(locale: string): locale is SupportedLocale {
  return SUPPORTED_LOCALES.includes(locale as SupportedLocale);
}

/**
 * Initialize i18next with the detected or provided locale
 *
 * @param initialLocale - Optional initial locale to use instead of device detection
 * @returns Promise that resolves when i18next is initialized
 */
export async function initializeI18n(initialLocale?: SupportedLocale): Promise<void> {
  const locale = initialLocale ?? detectDeviceLocale();

  await i18n.use(initReactI18next).init({
    resources,
    lng: locale,
    fallbackLng: DEFAULT_LOCALE,

    interpolation: {
      escapeValue: false, // React already escapes values
    },

    // React-i18next specific options
    react: {
      useSuspense: false, // Disable suspense for better compatibility
    },

    // Disable debug in production
    debug: __DEV__,
  });
}

/**
 * Change the current language
 *
 * @param locale - New locale to use
 * @returns Promise that resolves when language is changed
 */
export async function changeLanguage(locale: SupportedLocale): Promise<void> {
  if (!isSupportedLocale(locale)) {
    throw new Error(`Unsupported locale: ${locale}`);
  }

  await i18n.changeLanguage(locale);
}

/**
 * Get the current language
 *
 * @returns Current locale
 */
export function getCurrentLocale(): SupportedLocale {
  const currentLng = i18n.language;
  return isSupportedLocale(currentLng) ? currentLng : DEFAULT_LOCALE;
}

/**
 * Check if i18next is initialized
 *
 * @returns True if i18next is initialized
 */
export function isI18nInitialized(): boolean {
  return i18n.isInitialized;
}

// Export the i18n instance for direct access if needed
export { i18n };

// Re-export useTranslation hook for convenience
export { useTranslation } from 'react-i18next';

// Re-export formatters for convenience
export * from './formatters';
