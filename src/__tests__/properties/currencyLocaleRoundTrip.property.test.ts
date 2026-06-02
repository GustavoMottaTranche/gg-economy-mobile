import fc from 'fast-check';

/**
 * Property 8: Currency Locale Round-Trip
 *
 * For any numeric value representing an amount, formatting it as a currency string
 * using the current locale's decimal separator and then parsing it back SHALL produce
 * the original numeric value (within floating-point precision of 1 cent).
 *
 * **Validates: Requirements 5.7, 9.3**
 */

// --- Functions under test (extracted from FilterPanel.tsx) ---

/**
 * Get the decimal separator for the given locale
 */
function getDecimalSeparator(locale: 'pt-BR' | 'en'): string {
  return locale === 'pt-BR' ? ',' : '.';
}

/**
 * Format a cents value to a display string with locale-appropriate decimal separator
 */
function formatAmountForDisplay(cents: number | null, locale: 'pt-BR' | 'en'): string {
  if (cents === null) return '';
  const value = cents / 100;
  const separator = getDecimalSeparator(locale);
  const formatted = value.toFixed(2);
  return separator === ',' ? formatted.replace('.', ',') : formatted;
}

/**
 * Parse a locale-aware amount string to cents (integer)
 * Returns null if the string is empty or invalid
 */
function parseAmountToCents(text: string, locale: 'pt-BR' | 'en'): number | null {
  if (!text.trim()) return null;
  const separator = getDecimalSeparator(locale);
  // Normalize to standard decimal point
  const normalized = separator === ',' ? text.replace(',', '.') : text;
  const value = parseFloat(normalized);
  if (isNaN(value) || value < 0) return null;
  return Math.round(value * 100);
}

// --- Arbitraries ---

/** Generates a non-negative integer representing cents (0 to 99,999,99 = $99,999.99) */
const centsArb = fc.integer({ min: 0, max: 9999999 });

/** Generates a locale */
const localeArb = fc.constantFrom<'pt-BR' | 'en'>('pt-BR', 'en');

// --- Property Tests ---

describe('Property 8: Currency Locale Round-Trip', () => {
  it('formatting cents and parsing back produces the original value within 1 cent tolerance', () => {
    fc.assert(
      fc.property(centsArb, localeArb, (cents, locale) => {
        const formatted = formatAmountForDisplay(cents, locale);
        const parsedBack = parseAmountToCents(formatted, locale);

        // parsedBack should not be null for valid non-negative cents
        expect(parsedBack).not.toBeNull();

        // The round-trip should produce the original value within 1 cent tolerance
        expect(Math.abs(parsedBack! - cents)).toBeLessThanOrEqual(1);
      }),
      { numRuns: 100 }
    );
  });

  it('round-trip is exact for values that are exact multiples of 1 cent', () => {
    fc.assert(
      fc.property(centsArb, localeArb, (cents, locale) => {
        const formatted = formatAmountForDisplay(cents, locale);
        const parsedBack = parseAmountToCents(formatted, locale);

        // Since we start with integer cents, format to 2 decimal places,
        // and parse back, the result should be exactly equal
        expect(parsedBack).toBe(cents);
      }),
      { numRuns: 100 }
    );
  });

  it('pt-BR locale uses comma as decimal separator in formatted output', () => {
    fc.assert(
      fc.property(centsArb, (cents) => {
        const formatted = formatAmountForDisplay(cents, 'pt-BR');

        // Should contain a comma as decimal separator (not a dot)
        expect(formatted).toContain(',');
        expect(formatted).not.toContain('.');
      }),
      { numRuns: 100 }
    );
  });

  it('en locale uses dot as decimal separator in formatted output', () => {
    fc.assert(
      fc.property(centsArb, (cents) => {
        const formatted = formatAmountForDisplay(cents, 'en');

        // Should contain a dot as decimal separator (not a comma)
        expect(formatted).toContain('.');
        expect(formatted).not.toContain(',');
      }),
      { numRuns: 100 }
    );
  });

  it('formatted output always has exactly 2 decimal places', () => {
    fc.assert(
      fc.property(centsArb, localeArb, (cents, locale) => {
        const formatted = formatAmountForDisplay(cents, locale);
        const separator = getDecimalSeparator(locale);
        const parts = formatted.split(separator);

        // Should have exactly 2 parts (integer and decimal)
        expect(parts.length).toBe(2);
        // Decimal part should have exactly 2 digits
        expect(parts[1]!.length).toBe(2);
      }),
      { numRuns: 100 }
    );
  });

  it('null input produces empty string and empty string parses to null', () => {
    fc.assert(
      fc.property(localeArb, (locale) => {
        // null cents → empty string
        const formatted = formatAmountForDisplay(null, locale);
        expect(formatted).toBe('');

        // empty string → null cents
        const parsed = parseAmountToCents('', locale);
        expect(parsed).toBeNull();
      }),
      { numRuns: 100 }
    );
  });

  it('round-trip preserves value for both locales on the same input', () => {
    fc.assert(
      fc.property(centsArb, (cents) => {
        // Format and parse in pt-BR
        const formattedPtBR = formatAmountForDisplay(cents, 'pt-BR');
        const parsedPtBR = parseAmountToCents(formattedPtBR, 'pt-BR');

        // Format and parse in en
        const formattedEn = formatAmountForDisplay(cents, 'en');
        const parsedEn = parseAmountToCents(formattedEn, 'en');

        // Both should produce the same original value
        expect(parsedPtBR).toBe(cents);
        expect(parsedEn).toBe(cents);
      }),
      { numRuns: 100 }
    );
  });
});
