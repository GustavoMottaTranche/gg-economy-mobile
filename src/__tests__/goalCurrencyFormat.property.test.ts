// Feature: variable-expense-goals, Property 8: Currency formatting produces valid locale output

/**
 * Property 8: Currency formatting produces valid locale output
 *
 * For any valid goal amount (positive number) and for any supported locale,
 * `formatCurrencyLocale` SHALL produce a non-empty string containing the
 * locale-appropriate currency symbol and decimal representation.
 *
 * **Validates: Requirements 3.2, 4.2, 10.7**
 */

import * as fc from 'fast-check';
import { formatCurrencyLocale, getCurrencySymbol } from '../i18n';
import type { SupportedLocale } from '../i18n';

const locales: SupportedLocale[] = ['pt-BR', 'en'];

describe('Property 8: Currency formatting produces valid locale output', () => {
  it('should return a non-empty string for any positive amount and supported locale', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.01, max: 999999999.99, noNaN: true, noDefaultInfinity: true }),
        fc.constantFrom(...locales),
        (amount, locale) => {
          const result = formatCurrencyLocale(amount, locale);
          return typeof result === 'string' && result.length > 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should contain the locale-appropriate currency symbol', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.01, max: 999999999.99, noNaN: true, noDefaultInfinity: true }),
        fc.constantFrom(...locales),
        (amount, locale) => {
          const result = formatCurrencyLocale(amount, locale);
          const symbol = getCurrencySymbol(locale);
          return result.includes(symbol);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should contain a decimal separator appropriate to the locale', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.01, max: 999999999.99, noNaN: true, noDefaultInfinity: true }),
        fc.constantFrom(...locales),
        (amount, locale) => {
          const result = formatCurrencyLocale(amount, locale);
          // pt-BR uses comma as decimal separator, en uses period
          const decimalSeparator = locale === 'pt-BR' ? ',' : '.';
          return result.includes(decimalSeparator);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should produce a string with exactly 2 decimal places', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.01, max: 999999999.99, noNaN: true, noDefaultInfinity: true }),
        fc.constantFrom(...locales),
        (amount, locale) => {
          const result = formatCurrencyLocale(amount, locale);
          const decimalSeparator = locale === 'pt-BR' ? ',' : '.';
          const parts = result.split(decimalSeparator);
          const lastPart = parts[parts.length - 1];
          // The fractional part should be exactly 2 digits
          return /^\d{2}$/.test(lastPart);
        }
      ),
      { numRuns: 100 }
    );
  });
});
