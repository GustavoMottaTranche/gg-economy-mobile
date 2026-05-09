/**
 * Property-Based Test: Notification Content Localization (Property 6)
 *
 * **Validates: Requirements 4.1, 4.2, 7.2**
 *
 * *For any* supported locale (pt-BR or en), the notification content
 * (title and body) SHALL be correctly localized to that locale,
 * containing the appropriate translated reminder text.
 */
import * as fc from 'fast-check';
import { getNotificationContent } from '../NotificationContent';
import type { SupportedLocale } from '../../../i18n';

/**
 * Expected translations for each supported locale
 */
const EXPECTED_TRANSLATIONS: Record<SupportedLocale, { title: string; body: string }> = {
  'pt-BR': {
    title: 'Atualize suas finanças',
    body: 'Hora de registrar suas transações recentes',
  },
  en: {
    title: 'Update your finances',
    body: 'Time to record your recent transactions',
  },
};

// Mock i18n to return the correct translations based on locale
jest.mock('i18next', () => ({
  t: jest.fn((key: string, options?: { lng?: string }) => {
    const locale = (options?.lng || 'en') as SupportedLocale;
    const translations: Record<SupportedLocale, Record<string, string>> = {
      'pt-BR': {
        'notifications.title': 'Atualize suas finanças',
        'notifications.body': 'Hora de registrar suas transações recentes',
      },
      en: {
        'notifications.title': 'Update your finances',
        'notifications.body': 'Time to record your recent transactions',
      },
    };
    return translations[locale]?.[key] || translations.en[key] || key;
  }),
}));

describe('Property 6: Notification Content Localization', () => {
  /**
   * Supported locales in the application
   */
  const SUPPORTED_LOCALES: SupportedLocale[] = ['pt-BR', 'en'];

  /**
   * Arbitrary for supported locale
   */
  const arbitrarySupportedLocale = fc.constantFrom<SupportedLocale>(...SUPPORTED_LOCALES);

  /**
   * Financial keywords that should NOT appear in notification content
   * (notifications should be simple reminders without financial data)
   */
  const FINANCIAL_KEYWORDS = [
    'R$',
    '$',
    '€',
    '£',
    'balance',
    'saldo',
    'total',
    'income',
    'receita',
    'expense',
    'despesa',
    'spent',
    'gasto',
    'earned',
    'ganho',
    'summary',
    'resumo',
    '0.00',
    '1.00',
    '100.00',
  ];

  describe('Non-Empty Localized Strings', () => {
    it('should return non-empty title for any supported locale', () => {
      /**
       * Property: For any supported locale, getNotificationContent
       * should return a non-empty title string
       */
      fc.assert(
        fc.property(arbitrarySupportedLocale, (locale) => {
          const content = getNotificationContent(locale);

          expect(content.title).toBeDefined();
          expect(typeof content.title).toBe('string');
          expect(content.title.length).toBeGreaterThan(0);
          expect(content.title.trim().length).toBeGreaterThan(0);
        }),
        { numRuns: 100 }
      );
    });

    it('should return non-empty body for any supported locale', () => {
      /**
       * Property: For any supported locale, getNotificationContent
       * should return a non-empty body string
       */
      fc.assert(
        fc.property(arbitrarySupportedLocale, (locale) => {
          const content = getNotificationContent(locale);

          expect(content.body).toBeDefined();
          expect(typeof content.body).toBe('string');
          expect(content.body.length).toBeGreaterThan(0);
          expect(content.body.trim().length).toBeGreaterThan(0);
        }),
        { numRuns: 100 }
      );
    });

    it('should return both title and body as non-empty strings for any supported locale', () => {
      /**
       * Property: For any supported locale, getNotificationContent
       * should return an object with both title and body as non-empty strings
       */
      fc.assert(
        fc.property(arbitrarySupportedLocale, (locale) => {
          const content = getNotificationContent(locale);

          // Verify structure
          expect(content).toHaveProperty('title');
          expect(content).toHaveProperty('body');

          // Verify both are non-empty strings
          expect(typeof content.title).toBe('string');
          expect(typeof content.body).toBe('string');
          expect(content.title.trim()).not.toBe('');
          expect(content.body.trim()).not.toBe('');
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Different Locales Return Different Content', () => {
    it('should return different title for different locales', () => {
      /**
       * Property: For any two different supported locales,
       * the notification titles should be different
       */
      fc.assert(
        fc.property(arbitrarySupportedLocale, arbitrarySupportedLocale, (locale1, locale2) => {
          // Only test when locales are different
          if (locale1 === locale2) return;

          const content1 = getNotificationContent(locale1);
          const content2 = getNotificationContent(locale2);

          expect(content1.title).not.toBe(content2.title);
        }),
        { numRuns: 100 }
      );
    });

    it('should return different body for different locales', () => {
      /**
       * Property: For any two different supported locales,
       * the notification bodies should be different
       */
      fc.assert(
        fc.property(arbitrarySupportedLocale, arbitrarySupportedLocale, (locale1, locale2) => {
          // Only test when locales are different
          if (locale1 === locale2) return;

          const content1 = getNotificationContent(locale1);
          const content2 = getNotificationContent(locale2);

          expect(content1.body).not.toBe(content2.body);
        }),
        { numRuns: 100 }
      );
    });

    it('should return completely different content for en vs pt-BR', () => {
      /**
       * Property: English and Portuguese content should be completely different
       */
      const enContent = getNotificationContent('en');
      const ptBRContent = getNotificationContent('pt-BR');

      // Titles should be different
      expect(enContent.title).not.toBe(ptBRContent.title);

      // Bodies should be different
      expect(enContent.body).not.toBe(ptBRContent.body);

      // Verify they are the expected translations
      expect(enContent.title).toBe(EXPECTED_TRANSLATIONS.en.title);
      expect(ptBRContent.title).toBe(EXPECTED_TRANSLATIONS['pt-BR'].title);
      expect(enContent.body).toBe(EXPECTED_TRANSLATIONS.en.body);
      expect(ptBRContent.body).toBe(EXPECTED_TRANSLATIONS['pt-BR'].body);
    });
  });

  describe('No Financial Data in Content', () => {
    it('should not contain financial keywords in title for any supported locale', () => {
      /**
       * Property: For any supported locale, the notification title
       * should not contain any financial data or summaries
       */
      fc.assert(
        fc.property(arbitrarySupportedLocale, (locale) => {
          const content = getNotificationContent(locale);
          const titleLower = content.title.toLowerCase();

          for (const keyword of FINANCIAL_KEYWORDS) {
            expect(titleLower).not.toContain(keyword.toLowerCase());
          }
        }),
        { numRuns: 100 }
      );
    });

    it('should not contain financial keywords in body for any supported locale', () => {
      /**
       * Property: For any supported locale, the notification body
       * should not contain any financial data or summaries
       */
      fc.assert(
        fc.property(arbitrarySupportedLocale, (locale) => {
          const content = getNotificationContent(locale);
          const bodyLower = content.body.toLowerCase();

          for (const keyword of FINANCIAL_KEYWORDS) {
            expect(bodyLower).not.toContain(keyword.toLowerCase());
          }
        }),
        { numRuns: 100 }
      );
    });

    it('should not contain currency symbols in content for any supported locale', () => {
      /**
       * Property: For any supported locale, the notification content
       * should not contain any currency symbols
       */
      const currencySymbols = ['R$', '$', '€', '£', '¥', '₹', '₽'];

      fc.assert(
        fc.property(arbitrarySupportedLocale, (locale) => {
          const content = getNotificationContent(locale);

          for (const symbol of currencySymbols) {
            expect(content.title).not.toContain(symbol);
            expect(content.body).not.toContain(symbol);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('should not contain numeric amounts in content for any supported locale', () => {
      /**
       * Property: For any supported locale, the notification content
       * should not contain numeric amounts (patterns like 123.45 or 1,234.56)
       */
      const numericAmountPattern = /\d+[.,]\d{2}/;

      fc.assert(
        fc.property(arbitrarySupportedLocale, (locale) => {
          const content = getNotificationContent(locale);

          expect(content.title).not.toMatch(numericAmountPattern);
          expect(content.body).not.toMatch(numericAmountPattern);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Content Consistency', () => {
    it('should return consistent content for the same locale across multiple calls', () => {
      /**
       * Property: For any supported locale, calling getNotificationContent
       * multiple times should return the same content
       */
      fc.assert(
        fc.property(arbitrarySupportedLocale, (locale) => {
          const content1 = getNotificationContent(locale);
          const content2 = getNotificationContent(locale);
          const content3 = getNotificationContent(locale);

          expect(content1.title).toBe(content2.title);
          expect(content1.title).toBe(content3.title);
          expect(content1.body).toBe(content2.body);
          expect(content1.body).toBe(content3.body);
        }),
        { numRuns: 100 }
      );
    });

    it('should return content that is a simple reminder message', () => {
      /**
       * Property: For any supported locale, the content should be
       * a simple reminder message (reasonable length, no complex data)
       */
      fc.assert(
        fc.property(arbitrarySupportedLocale, (locale) => {
          const content = getNotificationContent(locale);

          // Title should be reasonably short (typical notification title length)
          expect(content.title.length).toBeLessThan(100);
          expect(content.title.length).toBeGreaterThan(5);

          // Body should be reasonably short (typical notification body length)
          expect(content.body.length).toBeLessThan(200);
          expect(content.body.length).toBeGreaterThan(10);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Combined Property: Complete Localization Verification', () => {
    it('should satisfy all localization properties for any supported locale', () => {
      /**
       * Combined Property: For any supported locale, the notification content must:
       * 1. Have non-empty title and body
       * 2. Not contain financial data
       * 3. Be consistent across calls
       * 4. Be a simple reminder message
       */
      fc.assert(
        fc.property(arbitrarySupportedLocale, (locale) => {
          const content = getNotificationContent(locale);

          // Property 1: Non-empty strings
          expect(content.title.trim().length).toBeGreaterThan(0);
          expect(content.body.trim().length).toBeGreaterThan(0);

          // Property 2: No financial data
          const combinedContent = (content.title + ' ' + content.body).toLowerCase();
          for (const keyword of FINANCIAL_KEYWORDS) {
            expect(combinedContent).not.toContain(keyword.toLowerCase());
          }

          // Property 3: Consistency
          const content2 = getNotificationContent(locale);
          expect(content.title).toBe(content2.title);
          expect(content.body).toBe(content2.body);

          // Property 4: Simple reminder (reasonable length)
          expect(content.title.length).toBeLessThan(100);
          expect(content.body.length).toBeLessThan(200);
        }),
        { numRuns: 100 }
      );
    });
  });
});
