// Feature: variable-expense-goals, Property 5: i18n keys completeness

/**
 * Property 5: i18n keys completeness
 *
 * For any required budget-goals translation key and for any supported locale (pt-BR, en),
 * the translation SHALL be a non-empty string. Additionally, the suggestion explanatory text
 * SHALL be at most 150 characters in all locales.
 *
 * **Validates: Requirements 8.1, 5.4, 1.6**
 */

import * as fc from 'fast-check';
import ptBR from '../i18n/locales/pt-BR.json';
import en from '../i18n/locales/en.json';

const locales = { 'pt-BR': ptBR, en: en } as const;
type LocaleKey = keyof typeof locales;

const supportedLocales: LocaleKey[] = ['pt-BR', 'en'];

/**
 * All required i18n keys for the budget goals feature.
 * These correspond to requirements 8.1, 5.4, and 1.6.
 */
const requiredGoalKeys = [
  'goals.settingsMenuItem',
  'goals.settingsMenuDescription',
  'goals.screenTitle',
  'goals.generalGoalLabel',
  'goals.categoryGoalLabel',
  'goals.suggestionIndicator',
  'goals.expectedSpendingLabel',
  'goals.explanatoryText',
  'goals.inputPlaceholder',
  'goals.saved',
  'goals.removed',
  'goals.validation.tooLow',
  'goals.validation.tooHigh',
  'goals.validation.invalidFormat',
] as const;

/**
 * Keys that contain explanatory text which must be ≤ 150 characters.
 * Per Requirement 5.4: explanatory text stating goals are suggestions.
 */
const explanatoryTextKeys = ['goals.explanatoryText'] as const;

/**
 * Resolves a dot-notation key against a locale JSON object.
 */
function resolveKey(obj: Record<string, unknown>, key: string): string | undefined {
  const parts = key.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === 'string' ? current : undefined;
}

describe('Property 5: i18n keys completeness', () => {
  describe('All required keys resolve to non-empty strings in both locales', () => {
    it('should resolve every required goal key to a non-empty string for any locale', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...requiredGoalKeys),
          fc.constantFrom(...supportedLocales),
          (key, locale) => {
            const localeData = locales[locale];
            const value = resolveKey(localeData as unknown as Record<string, unknown>, key);
            return typeof value === 'string' && value.trim().length > 0;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Explanatory text is at most 150 characters in all locales', () => {
    it('should have explanatory text ≤ 150 characters for any locale', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...explanatoryTextKeys),
          fc.constantFrom(...supportedLocales),
          (key, locale) => {
            const localeData = locales[locale];
            const value = resolveKey(localeData as unknown as Record<string, unknown>, key);
            return typeof value === 'string' && value.length <= 150;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Key consistency across locales', () => {
    it('should have the same set of goal keys present in both locales', () => {
      fc.assert(
        fc.property(fc.constantFrom(...requiredGoalKeys), (key) => {
          const ptValue = resolveKey(ptBR as unknown as Record<string, unknown>, key);
          const enValue = resolveKey(en as unknown as Record<string, unknown>, key);
          return (
            typeof ptValue === 'string' &&
            ptValue.trim().length > 0 &&
            typeof enValue === 'string' &&
            enValue.trim().length > 0
          );
        }),
        { numRuns: 100 }
      );
    });
  });
});
