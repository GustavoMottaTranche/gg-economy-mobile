/**
 * Property-Based Test: CSV Parsing Round-Trip (Property 1)
 *
 * For any valid CSV content representing financial transactions, parsing the CSV
 * to transaction objects, then formatting those objects back to CSV, then parsing
 * again SHALL produce transaction data equivalent to the first parse result.
 *
 * **Validates: Requirements 13.8, 32.2**
 *
 * @module CsvParsingRoundTrip.test
 */

import * as fc from 'fast-check';
import { CsvParser, CsvDelimiter } from '../../../../src/services/import/CsvParser';
import { RawTransaction } from '../../../../src/types/transaction';
import { DateFormat } from '../../../../src/utils/formatDate';

describe('Property 1: CSV Parsing Round-Trip', () => {
  const parser = new CsvParser();

  /**
   * Arbitrary for generating valid transaction dates
   * Constrained to reasonable date range for financial transactions
   * Uses integer-based generation to avoid NaN dates
   */
  const dateArb = fc
    .integer({ min: 0, max: 3652 }) // Days from 2020-01-01 to 2030-01-01
    .map((days) => {
      const date = new Date('2020-01-01');
      date.setDate(date.getDate() + days);
      return date;
    })
    .filter((d) => !isNaN(d.getTime())); // Extra safety filter

  /**
   * Arbitrary for generating valid transaction amounts
   * Includes positive (income) and negative (expense) values
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
   * Arbitrary for generating valid transaction descriptions
   * Excludes characters that would break CSV parsing
   */
  const descriptionArb = fc
    .string({ minLength: 1, maxLength: 200 })
    .filter((s) => {
      // Exclude empty strings and strings with only whitespace
      if (s.trim() === '') return false;
      // Exclude strings that would break CSV parsing
      if (s.includes('\n') || s.includes('\r')) return false;
      return true;
    })
    .map((s) => s.trim());

  /**
   * Arbitrary for generating a single valid transaction
   */
  const transactionArb: fc.Arbitrary<RawTransaction> = fc.record({
    date: dateArb,
    amount: amountArb,
    description: descriptionArb,
  });

  /**
   * Arbitrary for generating an array of valid transactions
   */
  const transactionsArb = fc.array(transactionArb, { minLength: 1, maxLength: 50 });

  /**
   * Arbitrary for CSV delimiters
   */
  const delimiterArb: fc.Arbitrary<CsvDelimiter> = fc.constantFrom(',', ';', '\t');

  /**
   * Arbitrary for date formats
   */
  const dateFormatArb: fc.Arbitrary<DateFormat> = fc.constantFrom(
    'YYYY-MM-DD',
    'DD/MM/YYYY',
    'MM/DD/YYYY'
  );

  /**
   * Helper to compare two dates (ignoring time component)
   */
  function datesEqual(d1: Date, d2: Date): boolean {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  }

  /**
   * Helper to compare two amounts (with tolerance for floating point)
   */
  function amountsEqual(a1: number, a2: number): boolean {
    return Math.abs(a1 - a2) < 0.01;
  }

  /**
   * Helper to compare two transactions
   */
  function transactionsEqual(t1: RawTransaction, t2: RawTransaction): boolean {
    return (
      datesEqual(t1.date, t2.date) &&
      amountsEqual(t1.amount, t2.amount) &&
      t1.description === t2.description
    );
  }

  it('should satisfy round-trip property: parse → format → parse produces equivalent data', () => {
    fc.assert(
      fc.property(
        transactionsArb,
        delimiterArb,
        dateFormatArb,
        (transactions, delimiter, dateFormat) => {
          // Step 1: Format transactions to CSV
          const csv1 = parser.formatToCsv(transactions, {
            delimiter,
            dateFormat,
            includeHeader: true,
          });

          // Step 2: Parse the CSV
          const result1 = parser.parse(csv1, { delimiter, dateFormat });

          // Verify first parse succeeded
          expect(result1.errors).toHaveLength(0);
          expect(result1.transactions).toHaveLength(transactions.length);

          // Step 3: Format parsed transactions back to CSV
          const csv2 = parser.formatToCsv(result1.transactions, {
            delimiter,
            dateFormat,
            includeHeader: true,
          });

          // Step 4: Parse again
          const result2 = parser.parse(csv2, { delimiter, dateFormat });

          // Verify second parse succeeded
          expect(result2.errors).toHaveLength(0);
          expect(result2.transactions).toHaveLength(result1.transactions.length);

          // Step 5: Verify equivalence
          for (let i = 0; i < result1.transactions.length; i++) {
            const t1 = result1.transactions[i];
            const t2 = result2.transactions[i];

            if (t1 && t2) {
              expect(transactionsEqual(t1, t2)).toBe(true);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve transaction count through round-trip', () => {
    fc.assert(
      fc.property(transactionsArb, (transactions) => {
        const csv = parser.formatToCsv(transactions);
        const result = parser.parse(csv);

        expect(result.transactions.length).toBe(transactions.length);
      }),
      { numRuns: 100 }
    );
  });

  it('should preserve date values through round-trip', () => {
    fc.assert(
      fc.property(transactionsArb, dateFormatArb, (transactions, dateFormat) => {
        const csv = parser.formatToCsv(transactions, { dateFormat });
        const result = parser.parse(csv, { dateFormat });

        for (let i = 0; i < transactions.length; i++) {
          expect(datesEqual(transactions[i]!.date, result.transactions[i]!.date)).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should preserve amount values through round-trip', () => {
    fc.assert(
      fc.property(transactionsArb, (transactions) => {
        const csv = parser.formatToCsv(transactions);
        const result = parser.parse(csv);

        for (let i = 0; i < transactions.length; i++) {
          expect(amountsEqual(transactions[i]!.amount, result.transactions[i]!.amount)).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should preserve description values through round-trip', () => {
    fc.assert(
      fc.property(transactionsArb, (transactions) => {
        const csv = parser.formatToCsv(transactions);
        const result = parser.parse(csv);

        for (let i = 0; i < transactions.length; i++) {
          expect(result.transactions[i]!.description).toBe(transactions[i]!.description);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should handle descriptions with special characters through round-trip', () => {
    // Generate descriptions with characters that need escaping
    const specialDescriptionArb = fc
      .string({ minLength: 1, maxLength: 100 })
      .filter((s) => s.trim() !== '' && !s.includes('\n') && !s.includes('\r'))
      .map((s) => s.trim());

    const specialTransactionArb = fc.record({
      date: dateArb,
      amount: amountArb,
      description: specialDescriptionArb,
    });

    fc.assert(
      fc.property(
        fc.array(specialTransactionArb, { minLength: 1, maxLength: 20 }),
        (transactions) => {
          const csv = parser.formatToCsv(transactions);
          const result = parser.parse(csv);

          expect(result.transactions.length).toBe(transactions.length);

          for (let i = 0; i < transactions.length; i++) {
            expect(result.transactions[i]!.description).toBe(transactions[i]!.description);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should produce idempotent results: multiple round-trips produce same result', () => {
    fc.assert(
      fc.property(transactionsArb, (transactions) => {
        // First round-trip
        const csv1 = parser.formatToCsv(transactions);
        const result1 = parser.parse(csv1);

        // Second round-trip
        const csv2 = parser.formatToCsv(result1.transactions);
        const result2 = parser.parse(csv2);

        // Third round-trip
        const csv3 = parser.formatToCsv(result2.transactions);
        const result3 = parser.parse(csv3);

        // Results should be equivalent
        expect(result2.transactions.length).toBe(result1.transactions.length);
        expect(result3.transactions.length).toBe(result2.transactions.length);

        for (let i = 0; i < result1.transactions.length; i++) {
          expect(transactionsEqual(result1.transactions[i]!, result2.transactions[i]!)).toBe(true);
          expect(transactionsEqual(result2.transactions[i]!, result3.transactions[i]!)).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });
});
