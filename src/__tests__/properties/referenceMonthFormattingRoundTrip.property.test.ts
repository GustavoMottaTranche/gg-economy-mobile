import fc from 'fast-check';
import { getMonthName } from '../../i18n/formatters';

/**
 * Feature: category-detail-screen
 * Property 6: Reference month formatting round-trip
 *
 * For any valid YYYY-MM string, the formatted month label SHALL contain a
 * recognizable month name (from the locale's month names) and the correct
 * 4-digit year.
 *
 * **Validates: Requirements 2.3, 7.4**
 */

// --- Function under test (extracted from app/category/[id].tsx) ---

/**
 * Formats a YYYY-MM string into a readable month label (e.g., "Janeiro 2025").
 */
function formatReferenceMonth(monthStr: string, locale: 'pt-BR' | 'en'): string {
  const [year, month] = monthStr.split('-').map(Number);
  if (!year || !month) return monthStr;

  const monthName = getMonthName(month - 1, locale, 'long');
  const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  return `${capitalizedMonth} ${year}`;
}

// --- Helpers ---

/**
 * Get all valid long month names for a given locale using getMonthName.
 */
function getAllMonthNames(locale: 'pt-BR' | 'en'): string[] {
  return Array.from({ length: 12 }, (_, i) => {
    const name = getMonthName(i, locale, 'long');
    return name.charAt(0).toUpperCase() + name.slice(1);
  });
}

// --- Arbitraries ---

/** Generates a valid year between 2020 and 2030 */
const yearArb = fc.integer({ min: 2020, max: 2030 });

/** Generates a valid month between 1 and 12 */
const monthArb = fc.integer({ min: 1, max: 12 });

/** Generates a valid YYYY-MM string */
const referenceMonthArb = fc
  .tuple(yearArb, monthArb)
  .map(([year, month]) => `${year}-${String(month).padStart(2, '0')}`);

/** Generates a locale */
const localeArb = fc.constantFrom<'pt-BR' | 'en'>('pt-BR', 'en');

// --- Property Tests ---

describe('Feature: category-detail-screen, Property 6: Reference month formatting round-trip', () => {
  it('formatted label contains a recognizable month name from the locale', () => {
    fc.assert(
      fc.property(referenceMonthArb, localeArb, (monthStr, locale) => {
        const formatted = formatReferenceMonth(monthStr, locale);
        const validMonthNames = getAllMonthNames(locale);

        // The formatted string should contain one of the valid month names
        const containsMonthName = validMonthNames.some((name) => formatted.includes(name));
        expect(containsMonthName).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('formatted label contains the correct 4-digit year', () => {
    fc.assert(
      fc.property(referenceMonthArb, localeArb, (monthStr, locale) => {
        const formatted = formatReferenceMonth(monthStr, locale);
        const [yearStr] = monthStr.split('-');

        // The formatted string should contain the 4-digit year
        expect(formatted).toContain(yearStr);
      }),
      { numRuns: 100 }
    );
  });

  it('formatted label contains the correct month name for the given month index', () => {
    fc.assert(
      fc.property(yearArb, monthArb, localeArb, (year, month, locale) => {
        const monthStr = `${year}-${String(month).padStart(2, '0')}`;
        const formatted = formatReferenceMonth(monthStr, locale);

        // Get the expected month name for this specific month
        const expectedMonthName = getMonthName(month - 1, locale, 'long');
        const capitalizedExpected =
          expectedMonthName.charAt(0).toUpperCase() + expectedMonthName.slice(1);

        expect(formatted).toContain(capitalizedExpected);
      }),
      { numRuns: 100 }
    );
  });

  it('formatted output matches the pattern "MonthName Year"', () => {
    fc.assert(
      fc.property(referenceMonthArb, localeArb, (monthStr, locale) => {
        const formatted = formatReferenceMonth(monthStr, locale);

        // Should match pattern: one or more word characters/spaces followed by a 4-digit year
        const pattern = /^[A-Za-zÀ-ÿ]+\s\d{4}$/;
        expect(formatted).toMatch(pattern);
      }),
      { numRuns: 100 }
    );
  });

  it('formatting is deterministic - same input always produces same output', () => {
    fc.assert(
      fc.property(referenceMonthArb, localeArb, (monthStr, locale) => {
        const formatted1 = formatReferenceMonth(monthStr, locale);
        const formatted2 = formatReferenceMonth(monthStr, locale);

        expect(formatted1).toBe(formatted2);
      }),
      { numRuns: 100 }
    );
  });
});
