/**
 * Property-Based Test: UI Localization (Property 7)
 *
 * **Validates: Requirements 7.1, 7.3**
 *
 * *For any* supported locale (pt-BR or en), all UI elements in the
 * Notification Settings Screen SHALL display correctly localized text,
 * including frequency option labels, time picker labels, and status messages.
 */
import * as fc from 'fast-check';

// Import locale files directly for testing
import ptBR from '../../src/i18n/locales/pt-BR.json';
import en from '../../src/i18n/locales/en.json';
import { SUPPORTED_LOCALES, SupportedLocale } from '../../src/i18n';

/**
 * Required notification-related translation keys for the Notification Settings Screen
 * These keys must exist and be non-empty in all supported locales
 */
const REQUIRED_NOTIFICATION_KEYS = [
  // Notification settings screen labels
  'notifications.settingsTitle',
  'notifications.settingsDescription',
  'notifications.enabled',
  'notifications.disabled',

  // Frequency option labels (Requirement 7.3)
  'notifications.frequency',
  'notifications.frequencyDaily',
  'notifications.frequencyEvery2Days',
  'notifications.frequencyEvery3Days',
  'notifications.frequencyWeekly',
  'notifications.frequencyDisabled',

  // Time picker labels
  'notifications.preferredTime',
  'notifications.selectTime',

  // Status messages
  'notifications.nextNotification',
  'notifications.permissionDenied',
  'notifications.openSettings',
  'notifications.permissionRequired',
  'notifications.permissionRequestMessage',

  // Notification content (for scheduled notifications)
  'notifications.title',
  'notifications.body',
] as const;

/**
 * Settings screen notification item keys
 */
const SETTINGS_NOTIFICATION_KEYS = [
  'settings.notifications',
  'settings.notificationsDescription',
] as const;

/**
 * All required keys for notification UI localization
 */
const ALL_REQUIRED_KEYS = [...REQUIRED_NOTIFICATION_KEYS, ...SETTINGS_NOTIFICATION_KEYS] as const;

type TranslationKey = (typeof ALL_REQUIRED_KEYS)[number];

/**
 * Locale resources map for direct access
 */
const localeResources: Record<SupportedLocale, Record<string, unknown>> = {
  'pt-BR': ptBR,
  en: en,
};

/**
 * Helper function to get a nested value from an object using dot notation
 * @param obj - The object to traverse
 * @param path - Dot-separated path (e.g., 'notifications.title')
 * @returns The value at the path or undefined
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const keys = path.split('.');
  let current: unknown = obj;

  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }

  return current;
}

/**
 * Helper function to check if a value is a non-empty string
 */
function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

describe('Property 7: UI Localization', () => {
  /**
   * Arbitrary for supported locales
   */
  const localeArb = fc.constantFrom<SupportedLocale>(...SUPPORTED_LOCALES);

  /**
   * Arbitrary for required translation keys
   */
  const translationKeyArb = fc.constantFrom<TranslationKey>(...ALL_REQUIRED_KEYS);

  describe('Translation Key Existence and Non-Empty Values', () => {
    it('should have all required notification keys exist and be non-empty for any supported locale', () => {
      /**
       * Property: For any supported locale and any required notification translation key,
       * the translation SHALL exist and be a non-empty string.
       *
       * **Validates: Requirements 7.1, 7.3**
       */
      fc.assert(
        fc.property(localeArb, translationKeyArb, (locale, key) => {
          const translations = localeResources[locale];
          const value = getNestedValue(translations, key);

          // The translation must exist
          expect(value).toBeDefined();

          // The translation must be a non-empty string
          expect(isNonEmptyString(value)).toBe(true);

          // Additional check: value should not be just whitespace
          if (typeof value === 'string') {
            expect(value.trim().length).toBeGreaterThan(0);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('should have all frequency option labels exist and be non-empty for any supported locale', () => {
      /**
       * Property: For any supported locale, all frequency option labels
       * SHALL exist and be non-empty strings.
       *
       * **Validates: Requirement 7.3**
       */
      const frequencyKeys = [
        'notifications.frequencyDaily',
        'notifications.frequencyEvery2Days',
        'notifications.frequencyEvery3Days',
        'notifications.frequencyWeekly',
        'notifications.frequencyDisabled',
      ] as const;

      const frequencyKeyArb = fc.constantFrom(...frequencyKeys);

      fc.assert(
        fc.property(localeArb, frequencyKeyArb, (locale, key) => {
          const translations = localeResources[locale];
          const value = getNestedValue(translations, key);

          expect(value).toBeDefined();
          expect(isNonEmptyString(value)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('should have time picker labels exist and be non-empty for any supported locale', () => {
      /**
       * Property: For any supported locale, time picker labels
       * SHALL exist and be non-empty strings.
       *
       * **Validates: Requirement 7.1**
       */
      const timePickerKeys = ['notifications.preferredTime', 'notifications.selectTime'] as const;

      const timePickerKeyArb = fc.constantFrom(...timePickerKeys);

      fc.assert(
        fc.property(localeArb, timePickerKeyArb, (locale, key) => {
          const translations = localeResources[locale];
          const value = getNestedValue(translations, key);

          expect(value).toBeDefined();
          expect(isNonEmptyString(value)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('should have status messages exist and be non-empty for any supported locale', () => {
      /**
       * Property: For any supported locale, status messages
       * SHALL exist and be non-empty strings.
       *
       * **Validates: Requirement 7.1**
       */
      const statusMessageKeys = [
        'notifications.enabled',
        'notifications.disabled',
        'notifications.nextNotification',
        'notifications.permissionDenied',
        'notifications.permissionRequired',
        'notifications.permissionRequestMessage',
      ] as const;

      const statusMessageKeyArb = fc.constantFrom(...statusMessageKeys);

      fc.assert(
        fc.property(localeArb, statusMessageKeyArb, (locale, key) => {
          const translations = localeResources[locale];
          const value = getNestedValue(translations, key);

          expect(value).toBeDefined();
          expect(isNonEmptyString(value)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Translation Differentiation Between Locales', () => {
    it('should have different translations for different locales for any notification key', () => {
      /**
       * Property: For any required notification translation key,
       * the translations for pt-BR and en SHALL be different strings
       * (proving actual localization, not just key duplication).
       *
       * **Validates: Requirements 7.1, 7.3**
       */
      fc.assert(
        fc.property(translationKeyArb, (key) => {
          const ptBRValue = getNestedValue(localeResources['pt-BR'], key);
          const enValue = getNestedValue(localeResources['en'], key);

          // Both must exist
          expect(ptBRValue).toBeDefined();
          expect(enValue).toBeDefined();

          // Both must be strings
          expect(typeof ptBRValue).toBe('string');
          expect(typeof enValue).toBe('string');

          // They should be different (actual localization)
          expect(ptBRValue).not.toBe(enValue);
        }),
        { numRuns: 100 }
      );
    });

    it('should have different frequency labels between locales', () => {
      /**
       * Property: For any frequency option label,
       * the pt-BR and en translations SHALL be different.
       *
       * **Validates: Requirement 7.3**
       */
      const frequencyKeys = [
        'notifications.frequencyDaily',
        'notifications.frequencyEvery2Days',
        'notifications.frequencyEvery3Days',
        'notifications.frequencyWeekly',
        'notifications.frequencyDisabled',
      ] as const;

      const frequencyKeyArb = fc.constantFrom(...frequencyKeys);

      fc.assert(
        fc.property(frequencyKeyArb, (key) => {
          const ptBRValue = getNestedValue(localeResources['pt-BR'], key);
          const enValue = getNestedValue(localeResources['en'], key);

          expect(ptBRValue).not.toBe(enValue);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Translation Completeness', () => {
    it('should have the same set of notification keys in both locales', () => {
      /**
       * Property: For any required notification key that exists in one locale,
       * it SHALL also exist in the other locale.
       *
       * **Validates: Requirements 7.1, 7.3**
       */
      fc.assert(
        fc.property(translationKeyArb, (key) => {
          const ptBRValue = getNestedValue(localeResources['pt-BR'], key);
          const enValue = getNestedValue(localeResources['en'], key);

          // If one exists, both must exist
          const ptBRExists = ptBRValue !== undefined;
          const enExists = enValue !== undefined;

          expect(ptBRExists).toBe(enExists);

          // Both should exist for required keys
          expect(ptBRExists).toBe(true);
          expect(enExists).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('should have all required keys present in both locale files', () => {
      /**
       * Property: For any supported locale, all required notification keys
       * SHALL be present in the locale file.
       *
       * **Validates: Requirements 7.1, 7.3**
       */
      fc.assert(
        fc.property(localeArb, (locale) => {
          const translations = localeResources[locale];

          // Check all required keys exist
          for (const key of ALL_REQUIRED_KEYS) {
            const value = getNestedValue(translations, key);
            expect(value).toBeDefined();
            expect(isNonEmptyString(value)).toBe(true);
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Notification Content Localization', () => {
    it('should have localized notification title and body for any supported locale', () => {
      /**
       * Property: For any supported locale, the notification title and body
       * SHALL be correctly localized non-empty strings.
       *
       * **Validates: Requirements 7.1**
       */
      const notificationContentKeys = ['notifications.title', 'notifications.body'] as const;

      const contentKeyArb = fc.constantFrom(...notificationContentKeys);

      fc.assert(
        fc.property(localeArb, contentKeyArb, (locale, key) => {
          const translations = localeResources[locale];
          const value = getNestedValue(translations, key);

          expect(value).toBeDefined();
          expect(isNonEmptyString(value)).toBe(true);

          // Notification content should be meaningful (more than just a few characters)
          if (typeof value === 'string') {
            expect(value.length).toBeGreaterThan(5);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('should have different notification content between locales', () => {
      /**
       * Property: The notification title and body SHALL be different
       * between pt-BR and en locales.
       *
       * **Validates: Requirements 7.1**
       */
      const notificationContentKeys = ['notifications.title', 'notifications.body'] as const;

      const contentKeyArb = fc.constantFrom(...notificationContentKeys);

      fc.assert(
        fc.property(contentKeyArb, (key) => {
          const ptBRValue = getNestedValue(localeResources['pt-BR'], key);
          const enValue = getNestedValue(localeResources['en'], key);

          expect(ptBRValue).not.toBe(enValue);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Settings Screen Integration Localization', () => {
    it('should have localized settings screen notification item labels for any supported locale', () => {
      /**
       * Property: For any supported locale, the settings screen notification
       * item labels SHALL be correctly localized non-empty strings.
       *
       * **Validates: Requirement 7.1**
       */
      const settingsKeyArb = fc.constantFrom(...SETTINGS_NOTIFICATION_KEYS);

      fc.assert(
        fc.property(localeArb, settingsKeyArb, (locale, key) => {
          const translations = localeResources[locale];
          const value = getNestedValue(translations, key);

          expect(value).toBeDefined();
          expect(isNonEmptyString(value)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('should have different settings labels between locales', () => {
      /**
       * Property: The settings screen notification item labels SHALL be
       * different between pt-BR and en locales.
       *
       * **Validates: Requirement 7.1**
       */
      const settingsKeyArb = fc.constantFrom(...SETTINGS_NOTIFICATION_KEYS);

      fc.assert(
        fc.property(settingsKeyArb, (key) => {
          const ptBRValue = getNestedValue(localeResources['pt-BR'], key);
          const enValue = getNestedValue(localeResources['en'], key);

          expect(ptBRValue).not.toBe(enValue);
        }),
        { numRuns: 100 }
      );
    });
  });
});
