/**
 * Property-Based Test: Locale-Aware Formatting Consistency (Property 14)
 *
 * **Validates: Requirements 25.5, 25.6, 25.7**
 *
 * *For any* numeric value (currency amount or number) and supported locale
 * (pt-BR, en), the formatted string SHALL use the correct decimal separator
 * and grouping for that locale, and parsing the formatted string back SHALL
 * produce the original numeric value.
 */
import * as fc from 'fast-check';
import {
  formatCurrency,
  parseCurrency,
  getDecimalSeparator,
  getGroupingSeparator,
  SupportedLocale,
} from '../../../src/utils/formatCurrency';

describe('Property 14: Locale-Aware Formatting Consistency', () => {
  /**
   * Arbitrary for supported locales
   */
  const localeArb = fc.constantFrom<SupportedLocale>('pt-BR', 'en');

  /**
   * Arbitrary for valid currency amounts
   * Using reasonable financial amounts to avoid floating point precision issues
   */
  const currencyAmountArb = fc
    .double({
      min: -999999999.99,
      max: 999999999.99,
      noNaN: true,
      noDefaultInfinity: true,
    })
    .filter((n) => Number.isFinite(n))
    .map((n) => Math.round(n * 100) / 100); // Round to 2 decimal places

  /**
   * Arbitrary for positive currency amounts
   */
  const positiveCurrencyArb = fc
    .double({
      min: 0.01,
      max: 999999999.99,
      noNaN: true,
      noDefaultInfinity: true,
    })
    .filter((n) => Number.isFinite(n))
    .map((n) => Math.round(n * 100) / 100);

  /**
   * Arbitrary for negative currency amounts
   */
  const negativeCurrencyArb = fc
    .double({
      min: -999999999.99,
      max: -0.01,
      noNaN: true,
      noDefaultInfinity: true,
    })
    .filter((n) => Number.isFinite(n))
    .map((n) => Math.round(n * 100) / 100);

  describe('Currency Formatting Round-Trip', () => {
    it('should round-trip positive amounts for pt-BR locale', () => {
      /**
       * Property: For any positive amount, formatting with pt-BR locale and
       * parsing back should produce the original value
       */
      fc.assert(
        fc.property(positiveCurrencyArb, (amount) => {
          const formatted = formatCurrency(amount, { locale: 'pt-BR' });
          const parsed = parseCurrency(formatted, 'pt-BR');

          expect(parsed).toBeCloseTo(amount, 2);
        }),
        { numRuns: 100 }
      );
    });

    it('should round-trip positive amounts for en locale', () => {
      /**
       * Property: For any positive amount, formatting with en locale and
       * parsing back should produce the original value
       */
      fc.assert(
        fc.property(positiveCurrencyArb, (amount) => {
          const formatted = formatCurrency(amount, { locale: 'en' });
          const parsed = parseCurrency(formatted, 'en');

          expect(parsed).toBeCloseTo(amount, 2);
        }),
        { numRuns: 100 }
      );
    });

    it('should round-trip negative amounts for pt-BR locale', () => {
      /**
       * Property: For any negative amount, formatting with pt-BR locale and
       * parsing back should produce the original value
       */
      fc.assert(
        fc.property(negativeCurrencyArb, (amount) => {
          const formatted = formatCurrency(amount, { locale: 'pt-BR' });
          const parsed = parseCurrency(formatted, 'pt-BR');

          expect(parsed).toBeCloseTo(amount, 2);
        }),
        { numRuns: 100 }
      );
    });

    it('should round-trip negative amounts for en locale', () => {
      /**
       * Property: For any negative amount, formatting with en locale and
       * parsing back should produce the original value
       */
      fc.assert(
        fc.property(negativeCurrencyArb, (amount) => {
          const formatted = formatCurrency(amount, { locale: 'en' });
          const parsed = parseCurrency(formatted, 'en');

          expect(parsed).toBeCloseTo(amount, 2);
        }),
        { numRuns: 100 }
      );
    });

    it('should round-trip any amount for any locale', () => {
      /**
       * Property: For any amount and any supported locale, formatting and
       * parsing back should produce the original value
       */
      fc.assert(
        fc.property(currencyAmountArb, localeArb, (amount, locale) => {
          const formatted = formatCurrency(amount, { locale });
          const parsed = parseCurrency(formatted, locale);

          expect(parsed).toBeCloseTo(amount, 2);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Decimal Separator Consistency', () => {
    it('pt-BR should use comma as decimal separator', () => {
      /**
       * Property: pt-BR formatted amounts should use comma for decimals
       */
      fc.assert(
        fc.property(positiveCurrencyArb, (amount) => {
          // Only test amounts with decimal parts
          if (amount === Math.floor(amount)) return;

          const formatted = formatCurrency(amount, { locale: 'pt-BR', showSymbol: false });

          // Should contain comma for decimal
          expect(formatted).toContain(',');
          // Should not use period for decimal (but may use for grouping)
          const parts = formatted.split(',');
          expect(parts.length).toBe(2);
          expect(parts[1]).toMatch(/^\d{2}$/); // Two decimal digits after comma
        }),
        { numRuns: 100 }
      );
    });

    it('en should use period as decimal separator', () => {
      /**
       * Property: en formatted amounts should use period for decimals
       */
      fc.assert(
        fc.property(positiveCurrencyArb, (amount) => {
          // Only test amounts with decimal parts
          if (amount === Math.floor(amount)) return;

          const formatted = formatCurrency(amount, { locale: 'en', showSymbol: false });

          // Should contain period for decimal
          expect(formatted).toContain('.');
          // The last period should be followed by exactly 2 digits
          const lastDotIndex = formatted.lastIndexOf('.');
          const decimalPart = formatted.substring(lastDotIndex + 1);
          expect(decimalPart).toMatch(/^\d{2}$/);
        }),
        { numRuns: 100 }
      );
    });

    it('getDecimalSeparator should return correct separator', () => {
      /**
       * Property: getDecimalSeparator should return the separator used in formatting
       */
      expect(getDecimalSeparator('pt-BR')).toBe(',');
      expect(getDecimalSeparator('en')).toBe('.');
    });
  });

  describe('Grouping Separator Consistency', () => {
    it('pt-BR should use period as grouping separator', () => {
      /**
       * Property: pt-BR formatted large amounts should use period for grouping
       */
      fc.assert(
        fc.property(
          fc
            .double({ min: 1000, max: 999999999, noNaN: true })
            .map((n) => Math.round(n * 100) / 100),
          (amount) => {
            if (!Number.isFinite(amount)) return;

            const formatted = formatCurrency(amount, { locale: 'pt-BR', showSymbol: false });

            // Large amounts should have grouping separators (periods)
            // The format should be like "1.234.567,89"
            const parts = formatted.split(',');
            if (parts[0].length > 3) {
              expect(parts[0]).toContain('.');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('en should use comma as grouping separator', () => {
      /**
       * Property: en formatted large amounts should use comma for grouping
       */
      fc.assert(
        fc.property(
          fc
            .double({ min: 1000, max: 999999999, noNaN: true })
            .map((n) => Math.round(n * 100) / 100),
          (amount) => {
            if (!Number.isFinite(amount)) return;

            const formatted = formatCurrency(amount, { locale: 'en', showSymbol: false });

            // Large amounts should have grouping separators (commas)
            // The format should be like "1,234,567.89"
            const parts = formatted.split('.');
            if (parts[0].length > 3) {
              expect(parts[0]).toContain(',');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('getGroupingSeparator should return correct separator', () => {
      /**
       * Property: getGroupingSeparator should return the separator used in formatting
       */
      expect(getGroupingSeparator('pt-BR')).toBe('.');
      expect(getGroupingSeparator('en')).toBe(',');
    });
  });

  describe('Formatting Determinism', () => {
    it('formatting should be deterministic', () => {
      /**
       * Property: Formatting the same amount twice should produce identical strings
       */
      fc.assert(
        fc.property(currencyAmountArb, localeArb, (amount, locale) => {
          const formatted1 = formatCurrency(amount, { locale });
          const formatted2 = formatCurrency(amount, { locale });

          expect(formatted1).toBe(formatted2);
        }),
        { numRuns: 100 }
      );
    });

    it('parsing should be deterministic', () => {
      /**
       * Property: Parsing the same string twice should produce identical values
       */
      fc.assert(
        fc.property(currencyAmountArb, localeArb, (amount, locale) => {
          const formatted = formatCurrency(amount, { locale });
          const parsed1 = parseCurrency(formatted, locale);
          const parsed2 = parseCurrency(formatted, locale);

          expect(parsed1).toBe(parsed2);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Sign Preservation', () => {
    it('should preserve positive sign', () => {
      /**
       * Property: Positive amounts should remain positive after round-trip
       */
      fc.assert(
        fc.property(positiveCurrencyArb, localeArb, (amount, locale) => {
          const formatted = formatCurrency(amount, { locale });
          const parsed = parseCurrency(formatted, locale);

          expect(parsed).toBeGreaterThan(0);
        }),
        { numRuns: 100 }
      );
    });

    it('should preserve negative sign', () => {
      /**
       * Property: Negative amounts should remain negative after round-trip
       */
      fc.assert(
        fc.property(negativeCurrencyArb, localeArb, (amount, locale) => {
          const formatted = formatCurrency(amount, { locale });
          const parsed = parseCurrency(formatted, locale);

          expect(parsed).toBeLessThan(0);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Precision Preservation', () => {
    it('should preserve two decimal places', () => {
      /**
       * Property: Amounts with exactly 2 decimal places should be preserved
       */
      fc.assert(
        fc.property(
          fc.integer({ min: -99999999999, max: 99999999999 }),
          localeArb,
          (cents, locale) => {
            const amount = cents / 100; // Convert cents to currency

            const formatted = formatCurrency(amount, { locale });
            const parsed = parseCurrency(formatted, locale);

            expect(parsed).toBeCloseTo(amount, 2);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle amounts with no decimal part', () => {
      /**
       * Property: Whole number amounts should round-trip correctly
       */
      fc.assert(
        fc.property(
          fc.integer({ min: -999999999, max: 999999999 }),
          localeArb,
          (wholeAmount, locale) => {
            const formatted = formatCurrency(wholeAmount, { locale });
            const parsed = parseCurrency(formatted, locale);

            expect(parsed).toBeCloseTo(wholeAmount, 2);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero', () => {
      /**
       * Property: Zero should round-trip correctly for all locales
       */
      for (const locale of ['pt-BR', 'en'] as SupportedLocale[]) {
        const formatted = formatCurrency(0, { locale });
        const parsed = parseCurrency(formatted, locale);

        expect(parsed).toBe(0);
      }
    });

    it('should handle very small amounts', () => {
      /**
       * Property: Very small amounts (0.01) should round-trip correctly
       */
      fc.assert(
        fc.property(localeArb, (locale) => {
          const smallAmount = 0.01;
          const formatted = formatCurrency(smallAmount, { locale });
          const parsed = parseCurrency(formatted, locale);

          expect(parsed).toBeCloseTo(smallAmount, 2);
        }),
        { numRuns: 10 }
      );
    });

    it('should handle very large amounts', () => {
      /**
       * Property: Very large amounts should round-trip correctly
       */
      fc.assert(
        fc.property(localeArb, (locale) => {
          const largeAmount = 999999999.99;
          const formatted = formatCurrency(largeAmount, { locale });
          const parsed = parseCurrency(formatted, locale);

          expect(parsed).toBeCloseTo(largeAmount, 2);
        }),
        { numRuns: 10 }
      );
    });

    it('should handle amounts without symbol', () => {
      /**
       * Property: Amounts formatted without symbol should still round-trip
       */
      fc.assert(
        fc.property(currencyAmountArb, localeArb, (amount, locale) => {
          const formatted = formatCurrency(amount, { locale, showSymbol: false });
          const parsed = parseCurrency(formatted, locale);

          expect(parsed).toBeCloseTo(amount, 2);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Cross-Locale Consistency', () => {
    it('same amount should produce different formats for different locales', () => {
      /**
       * Property: The same amount formatted in different locales should
       * produce different strings (due to different separators)
       */
      fc.assert(
        fc.property(
          fc
            .double({ min: 1000.01, max: 999999.99, noNaN: true })
            .map((n) => Math.round(n * 100) / 100),
          (amount) => {
            if (!Number.isFinite(amount)) return;

            const ptBrFormatted = formatCurrency(amount, { locale: 'pt-BR', showSymbol: false });
            const enFormatted = formatCurrency(amount, { locale: 'en', showSymbol: false });

            // Formats should be different due to separator differences
            expect(ptBrFormatted).not.toBe(enFormatted);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('same amount should parse to same value regardless of locale used for formatting', () => {
      /**
       * Property: The numeric value should be preserved regardless of locale
       */
      fc.assert(
        fc.property(currencyAmountArb, (amount) => {
          const ptBrFormatted = formatCurrency(amount, { locale: 'pt-BR' });
          const enFormatted = formatCurrency(amount, { locale: 'en' });

          const ptBrParsed = parseCurrency(ptBrFormatted, 'pt-BR');
          const enParsed = parseCurrency(enFormatted, 'en');

          expect(ptBrParsed).toBeCloseTo(amount, 2);
          expect(enParsed).toBeCloseTo(amount, 2);
          expect(ptBrParsed).toBeCloseTo(enParsed, 2);
        }),
        { numRuns: 100 }
      );
    });
  });
});
