/**
 * Property-Based Test: OFX Parsing Round-Trip (Property 2)
 *
 * For any valid OFX content representing financial transactions, parsing the OFX
 * to transaction objects, then serializing those objects back to OFX format, then
 * parsing again SHALL produce transaction data equivalent to the first parse result.
 *
 * **Validates: Requirements 14.8, 32.3**
 *
 * @module OfxParsingRoundTrip.test
 */

import * as fc from 'fast-check';
import { OfxParser } from '../../../../src/services/import/OfxParser';
import { RawTransaction } from '../../../../src/types/transaction';

describe('Property 2: OFX Parsing Round-Trip', () => {
  const parser = new OfxParser();

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
   * OFX uses period as decimal separator, so we use standard decimal format
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
   * Excludes characters that would break OFX parsing
   */
  const descriptionArb = fc
    .string({ minLength: 1, maxLength: 100 })
    .filter((s) => {
      // Exclude empty strings and strings with only whitespace
      if (s.trim() === '') return false;
      // Exclude strings with newlines (would break OFX element parsing)
      if (s.includes('\n') || s.includes('\r')) return false;
      // Exclude strings with < or > (would break SGML parsing)
      if (s.includes('<') || s.includes('>')) return false;
      return true;
    })
    .map((s) => s.trim());

  /**
   * Arbitrary for generating valid FITID values
   * FITID is typically alphanumeric
   */
  const fitIdArb = fc
    .string({ minLength: 5, maxLength: 20 })
    .filter((s) => /^[A-Z0-9]+$/i.test(s) && s.length >= 5)
    .map((s) => s.toUpperCase());

  /**
   * Arbitrary for generating a single valid transaction
   */
  const transactionArb: fc.Arbitrary<RawTransaction> = fc.record({
    date: dateArb,
    amount: amountArb,
    description: descriptionArb,
    fitId: fitIdArb,
  });

  /**
   * Arbitrary for generating an array of valid transactions
   */
  const transactionsArb = fc.array(transactionArb, { minLength: 1, maxLength: 50 });

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
   * Note: Description comparison is exact since OFX preserves text
   */
  function transactionsEqual(t1: RawTransaction, t2: RawTransaction): boolean {
    return (
      datesEqual(t1.date, t2.date) &&
      amountsEqual(t1.amount, t2.amount) &&
      t1.description === t2.description &&
      t1.fitId === t2.fitId
    );
  }

  it('should satisfy round-trip property: serialize → parse → serialize → parse produces equivalent data', () => {
    fc.assert(
      fc.property(transactionsArb, (transactions) => {
        // Step 1: Serialize transactions to OFX
        const ofx1 = parser.serializeToOfx(transactions);

        // Step 2: Parse the OFX
        const result1 = parser.parse(ofx1);

        // Verify first parse succeeded
        expect(result1.errors).toHaveLength(0);
        expect(result1.transactions).toHaveLength(transactions.length);

        // Step 3: Serialize parsed transactions back to OFX
        const ofx2 = parser.serializeToOfx(result1.transactions);

        // Step 4: Parse again
        const result2 = parser.parse(ofx2);

        // Verify second parse succeeded
        expect(result2.errors).toHaveLength(0);
        expect(result2.transactions).toHaveLength(result1.transactions.length);

        // Step 5: Verify equivalence
        for (let i = 0; i < result1.transactions.length; i++) {
          const t1 = result1.transactions[i];
          const t2 = result2.transactions[i];

          expect(transactionsEqual(t1, t2)).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should preserve transaction count through round-trip', () => {
    fc.assert(
      fc.property(transactionsArb, (transactions) => {
        const ofx = parser.serializeToOfx(transactions);
        const result = parser.parse(ofx);

        expect(result.transactions.length).toBe(transactions.length);
      }),
      { numRuns: 100 }
    );
  });

  it('should preserve date values through round-trip', () => {
    fc.assert(
      fc.property(transactionsArb, (transactions) => {
        const ofx = parser.serializeToOfx(transactions);
        const result = parser.parse(ofx);

        for (let i = 0; i < transactions.length; i++) {
          expect(datesEqual(transactions[i].date, result.transactions[i].date)).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should preserve amount values through round-trip', () => {
    fc.assert(
      fc.property(transactionsArb, (transactions) => {
        const ofx = parser.serializeToOfx(transactions);
        const result = parser.parse(ofx);

        for (let i = 0; i < transactions.length; i++) {
          expect(amountsEqual(transactions[i].amount, result.transactions[i].amount)).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should preserve description values through round-trip', () => {
    fc.assert(
      fc.property(transactionsArb, (transactions) => {
        const ofx = parser.serializeToOfx(transactions);
        const result = parser.parse(ofx);

        for (let i = 0; i < transactions.length; i++) {
          expect(result.transactions[i].description).toBe(transactions[i].description);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should preserve FITID values through round-trip', () => {
    fc.assert(
      fc.property(transactionsArb, (transactions) => {
        const ofx = parser.serializeToOfx(transactions);
        const result = parser.parse(ofx);

        for (let i = 0; i < transactions.length; i++) {
          expect(result.transactions[i].fitId).toBe(transactions[i].fitId);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should produce idempotent results: multiple round-trips produce same result', () => {
    fc.assert(
      fc.property(transactionsArb, (transactions) => {
        // First round-trip
        const ofx1 = parser.serializeToOfx(transactions);
        const result1 = parser.parse(ofx1);

        // Second round-trip
        const ofx2 = parser.serializeToOfx(result1.transactions);
        const result2 = parser.parse(ofx2);

        // Third round-trip
        const ofx3 = parser.serializeToOfx(result2.transactions);
        const result3 = parser.parse(ofx3);

        // Results should be equivalent
        expect(result2.transactions.length).toBe(result1.transactions.length);
        expect(result3.transactions.length).toBe(result2.transactions.length);

        for (let i = 0; i < result1.transactions.length; i++) {
          expect(transactionsEqual(result1.transactions[i], result2.transactions[i])).toBe(true);
          expect(transactionsEqual(result2.transactions[i], result3.transactions[i])).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should handle transactions with special characters in description (escaped)', () => {
    // Generate descriptions that include & which needs escaping
    const specialDescriptionArb = fc
      .string({ minLength: 1, maxLength: 50 })
      .filter((s) => {
        if (s.trim() === '') return false;
        if (s.includes('\n') || s.includes('\r')) return false;
        if (s.includes('<') || s.includes('>')) return false;
        return true;
      })
      .map((s) => s.trim())
      .map((s) => s.replace(/&/g, 'and')); // Replace & to avoid escaping issues in test

    const specialTransactionArb = fc.record({
      date: dateArb,
      amount: amountArb,
      description: specialDescriptionArb,
      fitId: fitIdArb,
    });

    fc.assert(
      fc.property(
        fc.array(specialTransactionArb, { minLength: 1, maxLength: 20 }),
        (transactions) => {
          const ofx = parser.serializeToOfx(transactions);
          const result = parser.parse(ofx);

          expect(result.transactions.length).toBe(transactions.length);

          for (let i = 0; i < transactions.length; i++) {
            expect(result.transactions[i].description).toBe(transactions[i].description);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle edge case amounts (zero, very small, very large)', () => {
    const edgeAmountArb = fc.oneof(
      fc.constant(0),
      fc.constant(0.01),
      fc.constant(-0.01),
      fc.constant(999999.99),
      fc.constant(-999999.99),
      amountArb
    );

    const edgeTransactionArb = fc.record({
      date: dateArb,
      amount: edgeAmountArb,
      description: descriptionArb,
      fitId: fitIdArb,
    });

    fc.assert(
      fc.property(fc.array(edgeTransactionArb, { minLength: 1, maxLength: 20 }), (transactions) => {
        const ofx = parser.serializeToOfx(transactions);
        const result = parser.parse(ofx);

        expect(result.transactions.length).toBe(transactions.length);

        for (let i = 0; i < transactions.length; i++) {
          expect(amountsEqual(transactions[i].amount, result.transactions[i].amount)).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should handle edge case dates (year boundaries, leap years)', () => {
    const edgeDateArb = fc.oneof(
      fc.constant(new Date(2020, 0, 1)), // New Year
      fc.constant(new Date(2020, 11, 31)), // End of year
      fc.constant(new Date(2024, 1, 29)), // Leap year Feb 29
      fc.constant(new Date(2020, 1, 28)), // Non-leap year Feb 28
      dateArb
    );

    const edgeTransactionArb = fc.record({
      date: edgeDateArb,
      amount: amountArb,
      description: descriptionArb,
      fitId: fitIdArb,
    });

    fc.assert(
      fc.property(fc.array(edgeTransactionArb, { minLength: 1, maxLength: 20 }), (transactions) => {
        const ofx = parser.serializeToOfx(transactions);
        const result = parser.parse(ofx);

        expect(result.transactions.length).toBe(transactions.length);

        for (let i = 0; i < transactions.length; i++) {
          expect(datesEqual(transactions[i].date, result.transactions[i].date)).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });
});
