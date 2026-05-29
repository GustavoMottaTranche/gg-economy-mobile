/**
 * Property-Based Test: Date Formatting Round-Trip (Property 6)
 *
 * **Validates: Requirements 25.5, 32.6**
 *
 * *For any* valid date and locale combination, formatting the date to a
 * locale-specific string and then parsing that string back SHALL produce
 * a date equivalent to the original.
 */
import * as fc from 'fast-check';
import { formatDate, parseDate, DateFormat } from '../../../src/utils/formatDate';
import { SupportedLocale } from '../../../src/utils/formatCurrency';

describe('Property 6: Date Formatting Round-Trip', () => {
  /**
   * Helper to check if two dates represent the same day
   */
  function isSameDay(date1: Date, date2: Date): boolean {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  }

  /**
   * Arbitrary for valid dates within a reasonable range
   * Note: parseDate validates years between 1900-2100, so we use 1901 as min
   * to avoid edge cases with year 1900
   */
  const validDateArb = fc.date({
    min: new Date('1901-01-01'),
    max: new Date('2099-12-31'),
    noInvalidDate: true,
  });

  /**
   * Arbitrary for supported locales
   */
  const localeArb = fc.constantFrom<SupportedLocale>('pt-BR', 'en');

  /**
   * Arbitrary for date formats
   */
  const formatArb = fc.constantFrom<DateFormat>('DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD');

  describe('Round-Trip with Explicit Format', () => {
    it('should round-trip dates with DD/MM/YYYY format', () => {
      /**
       * Property: For any valid date, formatting with DD/MM/YYYY and parsing back
       * should produce the same date (day, month, year)
       */
      fc.assert(
        fc.property(validDateArb, (originalDate) => {
          // Skip invalid dates
          if (isNaN(originalDate.getTime())) return;

          const formatted = formatDate(originalDate, { format: 'DD/MM/YYYY' });
          const parsed = parseDate(formatted, { format: 'DD/MM/YYYY' });

          expect(parsed).not.toBeNull();
          expect(isSameDay(originalDate, parsed!)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('should round-trip dates with MM/DD/YYYY format', () => {
      /**
       * Property: For any valid date, formatting with MM/DD/YYYY and parsing back
       * should produce the same date (day, month, year)
       */
      fc.assert(
        fc.property(validDateArb, (originalDate) => {
          if (isNaN(originalDate.getTime())) return;

          const formatted = formatDate(originalDate, { format: 'MM/DD/YYYY' });
          const parsed = parseDate(formatted, { format: 'MM/DD/YYYY' });

          expect(parsed).not.toBeNull();
          expect(isSameDay(originalDate, parsed!)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('should round-trip dates with YYYY-MM-DD format', () => {
      /**
       * Property: For any valid date, formatting with YYYY-MM-DD (ISO) and parsing back
       * should produce the same date (day, month, year)
       */
      fc.assert(
        fc.property(validDateArb, (originalDate) => {
          if (isNaN(originalDate.getTime())) return;

          const formatted = formatDate(originalDate, { format: 'YYYY-MM-DD' });
          const parsed = parseDate(formatted, { format: 'YYYY-MM-DD' });

          expect(parsed).not.toBeNull();
          expect(isSameDay(originalDate, parsed!)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Round-Trip with Locale Defaults', () => {
    it('should round-trip dates with pt-BR locale', () => {
      /**
       * Property: For any valid date, formatting with pt-BR locale (DD/MM/YYYY)
       * and parsing back should produce the same date
       */
      fc.assert(
        fc.property(validDateArb, (originalDate) => {
          if (isNaN(originalDate.getTime())) return;

          const formatted = formatDate(originalDate, { locale: 'pt-BR' });
          const parsed = parseDate(formatted, { locale: 'pt-BR' });

          expect(parsed).not.toBeNull();
          expect(isSameDay(originalDate, parsed!)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('should round-trip dates with en locale', () => {
      /**
       * Property: For any valid date, formatting with en locale (MM/DD/YYYY)
       * and parsing back should produce the same date
       */
      fc.assert(
        fc.property(validDateArb, (originalDate) => {
          if (isNaN(originalDate.getTime())) return;

          const formatted = formatDate(originalDate, { locale: 'en' });
          const parsed = parseDate(formatted, { locale: 'en' });

          expect(parsed).not.toBeNull();
          expect(isSameDay(originalDate, parsed!)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Round-Trip with Any Format and Locale Combination', () => {
    it('should round-trip dates with any format', () => {
      /**
       * Property: For any valid date and any supported format,
       * formatting and parsing back should produce the same date
       */
      fc.assert(
        fc.property(validDateArb, formatArb, (originalDate, format) => {
          if (isNaN(originalDate.getTime())) return;

          const formatted = formatDate(originalDate, { format });
          const parsed = parseDate(formatted, { format });

          expect(parsed).not.toBeNull();
          expect(isSameDay(originalDate, parsed!)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('should round-trip dates with any locale', () => {
      /**
       * Property: For any valid date and any supported locale,
       * formatting and parsing back should produce the same date
       */
      fc.assert(
        fc.property(validDateArb, localeArb, (originalDate, locale) => {
          if (isNaN(originalDate.getTime())) return;

          const formatted = formatDate(originalDate, { locale });
          const parsed = parseDate(formatted, { locale });

          expect(parsed).not.toBeNull();
          expect(isSameDay(originalDate, parsed!)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Format Consistency', () => {
    it('should produce consistent format output', () => {
      /**
       * Property: Formatting the same date twice should produce identical strings
       */
      fc.assert(
        fc.property(validDateArb, formatArb, (date, format) => {
          if (isNaN(date.getTime())) return;

          const formatted1 = formatDate(date, { format });
          const formatted2 = formatDate(date, { format });

          expect(formatted1).toBe(formatted2);
        }),
        { numRuns: 100 }
      );
    });

    it('should produce deterministic parsing results', () => {
      /**
       * Property: Parsing the same string twice should produce identical dates
       */
      fc.assert(
        fc.property(validDateArb, formatArb, (date, format) => {
          if (isNaN(date.getTime())) return;

          const formatted = formatDate(date, { format });
          const parsed1 = parseDate(formatted, { format });
          const parsed2 = parseDate(formatted, { format });

          expect(parsed1).not.toBeNull();
          expect(parsed2).not.toBeNull();
          expect(parsed1!.getTime()).toBe(parsed2!.getTime());
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle leap year dates', () => {
      /**
       * Property: Leap year dates (Feb 29) should round-trip correctly
       */
      const leapYearDates = [
        new Date(2000, 1, 29), // Feb 29, 2000
        new Date(2004, 1, 29), // Feb 29, 2004
        new Date(2020, 1, 29), // Feb 29, 2020
        new Date(2024, 1, 29), // Feb 29, 2024
      ];

      for (const date of leapYearDates) {
        for (const format of ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'] as DateFormat[]) {
          const formatted = formatDate(date, { format });
          const parsed = parseDate(formatted, { format });

          expect(parsed).not.toBeNull();
          expect(isSameDay(date, parsed!)).toBe(true);
        }
      }
    });

    it('should handle month boundaries', () => {
      /**
       * Property: First and last days of months should round-trip correctly
       */
      fc.assert(
        fc.property(
          fc.record({
            year: fc.integer({ min: 2000, max: 2050 }),
            month: fc.integer({ min: 0, max: 11 }),
            isFirst: fc.boolean(),
          }),
          formatArb,
          ({ year, month, isFirst }, format) => {
            // Create first or last day of month
            const date = isFirst ? new Date(year, month, 1) : new Date(year, month + 1, 0); // Last day of month

            const formatted = formatDate(date, { format });
            const parsed = parseDate(formatted, { format });

            expect(parsed).not.toBeNull();
            expect(isSameDay(date, parsed!)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle year boundaries', () => {
      /**
       * Property: First and last days of years should round-trip correctly
       */
      fc.assert(
        fc.property(fc.integer({ min: 1950, max: 2050 }), formatArb, (year, format) => {
          const firstDay = new Date(year, 0, 1);
          const lastDay = new Date(year, 11, 31);

          for (const date of [firstDay, lastDay]) {
            const formatted = formatDate(date, { format });
            const parsed = parseDate(formatted, { format });

            expect(parsed).not.toBeNull();
            expect(isSameDay(date, parsed!)).toBe(true);
          }
        }),
        { numRuns: 50 }
      );
    });
  });

  describe('Format String Validation', () => {
    it('should produce correctly formatted strings for DD/MM/YYYY', () => {
      /**
       * Property: DD/MM/YYYY format should produce strings matching pattern XX/XX/XXXX
       */
      fc.assert(
        fc.property(validDateArb, (date) => {
          if (isNaN(date.getTime())) return;

          const formatted = formatDate(date, { format: 'DD/MM/YYYY' });

          expect(formatted).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
        }),
        { numRuns: 100 }
      );
    });

    it('should produce correctly formatted strings for MM/DD/YYYY', () => {
      /**
       * Property: MM/DD/YYYY format should produce strings matching pattern XX/XX/XXXX
       */
      fc.assert(
        fc.property(validDateArb, (date) => {
          if (isNaN(date.getTime())) return;

          const formatted = formatDate(date, { format: 'MM/DD/YYYY' });

          expect(formatted).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
        }),
        { numRuns: 100 }
      );
    });

    it('should produce correctly formatted strings for YYYY-MM-DD', () => {
      /**
       * Property: YYYY-MM-DD format should produce strings matching ISO pattern
       */
      fc.assert(
        fc.property(validDateArb, (date) => {
          if (isNaN(date.getTime())) return;

          const formatted = formatDate(date, { format: 'YYYY-MM-DD' });

          expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Component Preservation', () => {
    it('should preserve year component', () => {
      /**
       * Property: The year component should be preserved through round-trip
       */
      fc.assert(
        fc.property(validDateArb, formatArb, (date, format) => {
          if (isNaN(date.getTime())) return;

          const formatted = formatDate(date, { format });
          const parsed = parseDate(formatted, { format });

          expect(parsed).not.toBeNull();
          expect(parsed!.getFullYear()).toBe(date.getFullYear());
        }),
        { numRuns: 100 }
      );
    });

    it('should preserve month component', () => {
      /**
       * Property: The month component should be preserved through round-trip
       */
      fc.assert(
        fc.property(validDateArb, formatArb, (date, format) => {
          if (isNaN(date.getTime())) return;

          const formatted = formatDate(date, { format });
          const parsed = parseDate(formatted, { format });

          expect(parsed).not.toBeNull();
          expect(parsed!.getMonth()).toBe(date.getMonth());
        }),
        { numRuns: 100 }
      );
    });

    it('should preserve day component', () => {
      /**
       * Property: The day component should be preserved through round-trip
       */
      fc.assert(
        fc.property(validDateArb, formatArb, (date, format) => {
          if (isNaN(date.getTime())) return;

          const formatted = formatDate(date, { format });
          const parsed = parseDate(formatted, { format });

          expect(parsed).not.toBeNull();
          expect(parsed!.getDate()).toBe(date.getDate());
        }),
        { numRuns: 100 }
      );
    });
  });
});
