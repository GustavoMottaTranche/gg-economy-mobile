/**
 * Unit tests for i18n configuration
 *
 * Tests i18next configuration, language detection, and language switching.
 *
 * **Validates: Requirements 25, 26, 29**
 */
import {
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  LOCALE_DISPLAY_NAMES,
  detectDeviceLocale,
  isSupportedLocale,
} from '../../../src/i18n';

// Mock expo-localization
const mockGetLocales = jest.fn();
jest.mock('expo-localization', () => ({
  getLocales: () => mockGetLocales(),
}));

describe('i18n configuration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('SUPPORTED_LOCALES', () => {
    it('should include pt-BR and en', () => {
      expect(SUPPORTED_LOCALES).toContain('pt-BR');
      expect(SUPPORTED_LOCALES).toContain('en');
    });

    it('should have exactly 2 supported locales', () => {
      expect(SUPPORTED_LOCALES).toHaveLength(2);
    });
  });

  describe('DEFAULT_LOCALE', () => {
    it('should be en', () => {
      expect(DEFAULT_LOCALE).toBe('en');
    });

    it('should be a supported locale', () => {
      expect(SUPPORTED_LOCALES).toContain(DEFAULT_LOCALE);
    });
  });

  describe('LOCALE_DISPLAY_NAMES', () => {
    it('should have display names for all supported locales', () => {
      SUPPORTED_LOCALES.forEach((locale) => {
        expect(LOCALE_DISPLAY_NAMES[locale]).toBeDefined();
        expect(typeof LOCALE_DISPLAY_NAMES[locale]).toBe('string');
        expect(LOCALE_DISPLAY_NAMES[locale].length).toBeGreaterThan(0);
      });
    });

    it('should have correct display names', () => {
      expect(LOCALE_DISPLAY_NAMES['pt-BR']).toBe('Português (Brasil)');
      expect(LOCALE_DISPLAY_NAMES['en']).toBe('English');
    });
  });

  describe('isSupportedLocale', () => {
    it('should return true for supported locales', () => {
      expect(isSupportedLocale('pt-BR')).toBe(true);
      expect(isSupportedLocale('en')).toBe(true);
    });

    it('should return false for unsupported locales', () => {
      expect(isSupportedLocale('fr')).toBe(false);
      expect(isSupportedLocale('es')).toBe(false);
      expect(isSupportedLocale('de')).toBe(false);
      expect(isSupportedLocale('')).toBe(false);
      expect(isSupportedLocale('invalid')).toBe(false);
    });

    it('should return false for partial matches', () => {
      expect(isSupportedLocale('pt')).toBe(false);
      expect(isSupportedLocale('en-US')).toBe(false);
      expect(isSupportedLocale('en-GB')).toBe(false);
    });
  });

  describe('detectDeviceLocale', () => {
    it('should return pt-BR when device locale is pt-BR', () => {
      mockGetLocales.mockReturnValue([{ languageCode: 'pt', regionCode: 'BR' }]);
      expect(detectDeviceLocale()).toBe('pt-BR');
    });

    it('should return pt-BR when device language is pt (any region)', () => {
      mockGetLocales.mockReturnValue([{ languageCode: 'pt', regionCode: 'PT' }]);
      expect(detectDeviceLocale()).toBe('pt-BR');
    });

    it('should return en when device locale is en-US', () => {
      mockGetLocales.mockReturnValue([{ languageCode: 'en', regionCode: 'US' }]);
      expect(detectDeviceLocale()).toBe('en');
    });

    it('should return en when device locale is en-GB', () => {
      mockGetLocales.mockReturnValue([{ languageCode: 'en', regionCode: 'GB' }]);
      expect(detectDeviceLocale()).toBe('en');
    });

    it('should return en when device language is en (no region)', () => {
      mockGetLocales.mockReturnValue([{ languageCode: 'en', regionCode: null }]);
      expect(detectDeviceLocale()).toBe('en');
    });

    it('should return default locale for unsupported languages', () => {
      mockGetLocales.mockReturnValue([{ languageCode: 'fr', regionCode: 'FR' }]);
      expect(detectDeviceLocale()).toBe(DEFAULT_LOCALE);
    });

    it('should return default locale when no locales available', () => {
      mockGetLocales.mockReturnValue([]);
      expect(detectDeviceLocale()).toBe(DEFAULT_LOCALE);
    });

    it('should return default locale when getLocales returns null', () => {
      mockGetLocales.mockReturnValue(null);
      expect(detectDeviceLocale()).toBe(DEFAULT_LOCALE);
    });

    it('should return default locale when getLocales throws', () => {
      mockGetLocales.mockImplementation(() => {
        throw new Error('Localization error');
      });
      expect(detectDeviceLocale()).toBe(DEFAULT_LOCALE);
    });

    it('should use first locale from array', () => {
      mockGetLocales.mockReturnValue([
        { languageCode: 'pt', regionCode: 'BR' },
        { languageCode: 'en', regionCode: 'US' },
      ]);
      expect(detectDeviceLocale()).toBe('pt-BR');
    });
  });
});
