/**
 * Property-Based Test: Amount Parsing with Decimal Separators (Property 11)
 *
 * For any numeric amount string using either period or comma as decimal separator,
 * the Import_Service SHALL correctly parse the value to a numeric type with the
 * correct sign (positive for income, negative for expense).
 *
 * **Validates: Requirements 13.5**
 *
 * @module AmountParsingDecimalSeparators.test
 */

import * as fc from 'fast-check';
import { CsvParser } from '../../../../src/services/import/CsvParser';

describe('Property 11: Amount Parsing with Decimal Separators', () => {
  const parser = new CsvParser();

  /**
   * Arbitrary for generating valid numeric amounts
   */
  const amountArb = fc
    .double({
      min: -1000000,
      max: 1000000,
      noNaN: true,
      noDefaultInfinity: true,
    })
    .map((n) => Math.round(n * 100) / 100); // Round to 2 decimal places

  /**
   * Arbitrary for positive amounts (income)
   */
  const positiveAmountArb = fc
    .double({
      min: 0.01,
      max: 1000000,
      noNaN: true,
      noDefaultInfinity: true,
    })
    .map((n) => Math.round(n * 100) / 100);

  /**
   * Arbitrary for negative amounts (expense)
   */
  const negativeAmountArb = fc
    .double({
      min: -1000000,
      max: -0.01,
      noNaN: true,
      noDefaultInfinity: true,
    })
    .map((n) => Math.round(n * 100) / 100);

  /**
   * Arbitrary for locale
   */
  const localeArb: fc.Arbitrary<'pt-BR' | 'en'> = fc.constantFrom('pt-BR', 'en');

  /**
   * Formats an amount as a string with period decimal separator (en style)
   */
  function formatAmountEn(amount: number, includeThousandSeparator: boolean = false): string {
    const absAmount = Math.abs(amount);
    const sign = amount < 0 ? '-' : '';

    if (includeThousandSeparator && absAmount >= 1000) {
      const parts = absAmount.toFixed(2).split('.');
      parts[0] = parts[0]!.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      return sign + parts.join('.');
    }

    return sign + absAmount.toFixed(2);
  }

  /**
   * Formats an amount as a string with comma decimal separator (pt-BR style)
   */
  function formatAmountPtBr(amount: number, includeThousandSeparator: boolean = false): string {
    const absAmount = Math.abs(amount);
    const sign = amount < 0 ? '-' : '';

    if (includeThousandSeparator && absAmount >= 1000) {
      const parts = absAmount.toFixed(2).split('.');
      parts[0] = parts[0]!.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      return sign + parts.join(',');
    }

    return sign + absAmount.toFixed(2).replace('.', ',');
  }

  /**
   * Helper to compare amounts with tolerance for floating point
   */
  function amountsEqual(a1: number, a2: number): boolean {
    return Math.abs(a1 - a2) < 0.01;
  }

  describe('Period Decimal Separator (en style)', () => {
    it('should parse amounts with period decimal separator', () => {
      fc.assert(
        fc.property(amountArb, (amount) => {
          const amountStr = formatAmountEn(amount);
          const parsed = parser.parseAmount(amountStr, 'en');

          expect(amountsEqual(parsed, amount)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('should parse amounts with thousand separators (en style: 1,234.56)', () => {
      fc.assert(
        fc.property(
          fc
            .double({ min: 1000, max: 1000000, noNaN: true, noDefaultInfinity: true })
            .map((n) => Math.round(n * 100) / 100),
          (amount) => {
            const amountStr = formatAmountEn(amount, true);
            const parsed = parser.parseAmount(amountStr, 'en');

            expect(amountsEqual(parsed, amount)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve sign for positive amounts (income)', () => {
      fc.assert(
        fc.property(positiveAmountArb, (amount) => {
          const amountStr = formatAmountEn(amount);
          const parsed = parser.parseAmount(amountStr, 'en');

          expect(parsed).toBeGreaterThan(0);
          expect(amountsEqual(parsed, amount)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('should preserve sign for negative amounts (expense)', () => {
      fc.assert(
        fc.property(negativeAmountArb, (amount) => {
          const amountStr = formatAmountEn(amount);
          const parsed = parser.parseAmount(amountStr, 'en');

          expect(parsed).toBeLessThan(0);
          expect(amountsEqual(parsed, amount)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Comma Decimal Separator (pt-BR style)', () => {
    it('should parse amounts with comma decimal separator', () => {
      fc.assert(
        fc.property(amountArb, (amount) => {
          const amountStr = formatAmountPtBr(amount);
          const parsed = parser.parseAmount(amountStr, 'pt-BR');

          expect(amountsEqual(parsed, amount)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('should parse amounts with thousand separators (pt-BR style: 1.234,56)', () => {
      fc.assert(
        fc.property(
          fc
            .double({ min: 1000, max: 1000000, noNaN: true, noDefaultInfinity: true })
            .map((n) => Math.round(n * 100) / 100),
          (amount) => {
            const amountStr = formatAmountPtBr(amount, true);
            const parsed = parser.parseAmount(amountStr, 'pt-BR');

            expect(amountsEqual(parsed, amount)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve sign for positive amounts (income)', () => {
      fc.assert(
        fc.property(positiveAmountArb, (amount) => {
          const amountStr = formatAmountPtBr(amount);
          const parsed = parser.parseAmount(amountStr, 'pt-BR');

          expect(parsed).toBeGreaterThan(0);
          expect(amountsEqual(parsed, amount)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('should preserve sign for negative amounts (expense)', () => {
      fc.assert(
        fc.property(negativeAmountArb, (amount) => {
          const amountStr = formatAmountPtBr(amount);
          const parsed = parser.parseAmount(amountStr, 'pt-BR');

          expect(parsed).toBeLessThan(0);
          expect(amountsEqual(parsed, amount)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Negative Amount Formats', () => {
    it('should parse negative amounts with minus sign prefix', () => {
      fc.assert(
        fc.property(positiveAmountArb, localeArb, (amount, locale) => {
          const amountStr =
            locale === 'en' ? `-${formatAmountEn(amount)}` : `-${formatAmountPtBr(amount)}`;
          const parsed = parser.parseAmount(amountStr, locale);

          expect(parsed).toBeLessThan(0);
          expect(amountsEqual(parsed, -amount)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('should parse negative amounts in parentheses format', () => {
      fc.assert(
        fc.property(positiveAmountArb, localeArb, (amount, locale) => {
          const formattedAmount =
            locale === 'en' ? formatAmountEn(amount) : formatAmountPtBr(amount);
          const amountStr = `(${formattedAmount})`;
          const parsed = parser.parseAmount(amountStr, locale);

          expect(parsed).toBeLessThan(0);
          expect(amountsEqual(parsed, -amount)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Currency Symbols', () => {
    it('should parse amounts with R$ currency symbol', () => {
      fc.assert(
        fc.property(amountArb, (amount) => {
          const formattedAmount = formatAmountPtBr(Math.abs(amount));
          const sign = amount < 0 ? '-' : '';
          const amountStr = `${sign}R$ ${formattedAmount}`;
          const parsed = parser.parseAmount(amountStr, 'pt-BR');

          expect(amountsEqual(parsed, amount)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('should parse amounts with $ currency symbol', () => {
      fc.assert(
        fc.property(amountArb, (amount) => {
          const formattedAmount = formatAmountEn(Math.abs(amount));
          const sign = amount < 0 ? '-' : '';
          const amountStr = `${sign}$${formattedAmount}`;
          const parsed = parser.parseAmount(amountStr, 'en');

          expect(amountsEqual(parsed, amount)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('should parse amounts with € currency symbol', () => {
      fc.assert(
        fc.property(amountArb, (amount) => {
          const formattedAmount = formatAmountEn(Math.abs(amount));
          const sign = amount < 0 ? '-' : '';
          const amountStr = `${sign}€${formattedAmount}`;
          const parsed = parser.parseAmount(amountStr, 'en');

          expect(amountsEqual(parsed, amount)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Integer Amounts', () => {
    it('should parse integer amounts without decimal part', () => {
      fc.assert(
        fc.property(fc.integer({ min: -1000000, max: 1000000 }), localeArb, (amount, locale) => {
          const amountStr = amount.toString();
          const parsed = parser.parseAmount(amountStr, locale);

          expect(parsed).toBe(amount);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Decimal Separator Auto-Detection', () => {
    it('should auto-detect period as decimal separator when no locale specified', () => {
      fc.assert(
        fc.property(amountArb, (amount) => {
          const amountStr = formatAmountEn(amount);
          const parsed = parser.parseAmount(amountStr);

          expect(amountsEqual(parsed, amount)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('should detect decimal separator from position (last separator followed by 2 digits)', () => {
      fc.assert(
        fc.property(
          fc
            .double({ min: 1000, max: 100000, noNaN: true, noDefaultInfinity: true })
            .map((n) => Math.round(n * 100) / 100),
          (amount) => {
            // Format with thousand separator and decimal
            const enFormat = formatAmountEn(amount, true); // 1,234.56
            const ptBrFormat = formatAmountPtBr(amount, true); // 1.234,56

            const parsedEn = parser.parseAmount(enFormat, 'en');
            const parsedPtBr = parser.parseAmount(ptBrFormat, 'pt-BR');

            expect(amountsEqual(parsedEn, amount)).toBe(true);
            expect(amountsEqual(parsedPtBr, amount)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero amounts', () => {
      fc.assert(
        fc.property(localeArb, (locale) => {
          const amountStr = locale === 'en' ? '0.00' : '0,00';
          const parsed = parser.parseAmount(amountStr, locale);

          expect(parsed).toBe(0);
        }),
        { numRuns: 10 }
      );
    });

    it('should handle very small amounts', () => {
      fc.assert(
        fc.property(
          fc
            .double({ min: 0.01, max: 0.99, noNaN: true, noDefaultInfinity: true })
            .map((n) => Math.round(n * 100) / 100),
          localeArb,
          (amount, locale) => {
            const amountStr = locale === 'en' ? formatAmountEn(amount) : formatAmountPtBr(amount);
            const parsed = parser.parseAmount(amountStr, locale);

            expect(amountsEqual(parsed, amount)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle amounts with whitespace', () => {
      fc.assert(
        fc.property(amountArb, localeArb, (amount, locale) => {
          const formattedAmount =
            locale === 'en' ? formatAmountEn(amount) : formatAmountPtBr(amount);
          const amountStr = `  ${formattedAmount}  `;
          const parsed = parser.parseAmount(amountStr, locale);

          expect(amountsEqual(parsed, amount)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('should return NaN for empty strings', () => {
      expect(parser.parseAmount('')).toBeNaN();
      expect(parser.parseAmount('   ')).toBeNaN();
    });

    it('should return NaN for non-numeric strings', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }).filter((s) => {
            // Filter out strings that could be parsed as numbers
            const cleaned = s.replace(/[R$€£¥\s,.\-()]/g, '');
            return isNaN(parseFloat(cleaned));
          }),
          (invalidStr) => {
            const parsed = parser.parseAmount(invalidStr);
            expect(parsed).toBeNaN();
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Full CSV Integration', () => {
    it('should correctly parse amounts in CSV with en locale', () => {
      fc.assert(
        fc.property(fc.array(amountArb, { minLength: 1, maxLength: 20 }), (amounts) => {
          const rows = amounts.map((amount, i) => {
            const date = `2024-01-${((i % 28) + 1).toString().padStart(2, '0')}`;
            const amountStr = formatAmountEn(amount);
            return `${date},${amountStr},Transaction ${i + 1}`;
          });

          const csv = ['date,amount,description', ...rows].join('\n');
          const result = parser.parse(csv, { locale: 'en' });

          expect(result.transactions.length).toBe(amounts.length);

          for (let i = 0; i < amounts.length; i++) {
            expect(amountsEqual(result.transactions[i]!.amount, amounts[i]!)).toBe(true);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('should correctly parse amounts in CSV with pt-BR locale', () => {
      fc.assert(
        fc.property(fc.array(amountArb, { minLength: 1, maxLength: 20 }), (amounts) => {
          const rows = amounts.map((amount, i) => {
            const date = `2024-01-${((i % 28) + 1).toString().padStart(2, '0')}`;
            const amountStr = formatAmountPtBr(amount);
            return `${date};"${amountStr}";Transaction ${i + 1}`;
          });

          const csv = ['date;amount;description', ...rows].join('\n');
          const result = parser.parse(csv, { locale: 'pt-BR', delimiter: ';' });

          expect(result.transactions.length).toBe(amounts.length);

          for (let i = 0; i < amounts.length; i++) {
            expect(amountsEqual(result.transactions[i]!.amount, amounts[i]!)).toBe(true);
          }
        }),
        { numRuns: 100 }
      );
    });
  });
});
