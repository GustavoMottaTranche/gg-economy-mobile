/**
 * Property-Based Test: Dedupe Engine Idempotence (Property 3)
 *
 * For any set of transactions, running the dedupe operation twice SHALL produce
 * the same result as running it once. Formally: `dedupe(dedupe(transactions)) === dedupe(transactions)`.
 *
 * **Validates: Requirements 15.6, 32.4**
 *
 * @module DedupeEngineIdempotence.test
 */

import * as fc from 'fast-check';
import { DedupeEngine } from '../../../../src/services/import/DedupeEngine';
import { RawTransaction } from '../../../../src/types/transaction';

describe('Property 3: Dedupe Engine Idempotence', () => {
  const engine = new DedupeEngine();

  /**
   * Arbitrary for generating valid transaction dates
   * Constrained to reasonable date range for financial transactions
   */
  const dateArb = fc
    .integer({ min: 0, max: 3652 }) // Days from 2020-01-01 to 2030-01-01
    .map((days) => {
      const date = new Date('2020-01-01');
      date.setDate(date.getDate() + days);
      return date;
    })
    .filter((d) => !isNaN(d.getTime()));

  /**
   * Arbitrary for generating valid transaction amounts
   * Includes positive (income) and negative (expense) values
   * Rounded to 2 decimal places to avoid floating point issues
   */
  const amountArb = fc
    .double({
      min: -10000,
      max: 10000,
      noNaN: true,
      noDefaultInfinity: true,
    })
    .map((n) => Math.round(n * 100) / 100);

  /**
   * Arbitrary for generating valid transaction descriptions
   * Excludes characters that would cause issues
   */
  const descriptionArb = fc
    .string({ minLength: 1, maxLength: 100 })
    .filter((s) => s.trim() !== '')
    .map((s) => s.trim());

  /**
   * Arbitrary for generating optional FITID
   */
  const fitIdArb = fc.option(
    fc.string({ minLength: 5, maxLength: 20 }).filter((s) => s.trim() !== ''),
    { nil: undefined }
  );

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
   * Arbitrary for generating an array of transactions
   * May contain duplicates (same date, amount, description or FITID)
   */
  const transactionsArb = fc.array(transactionArb, { minLength: 1, maxLength: 30 });

  /**
   * Arbitrary for generating transactions with intentional duplicates
   * This ensures we test the dedupe logic with actual duplicates
   */
  const transactionsWithDuplicatesArb = fc
    .tuple(transactionsArb, fc.integer({ min: 0, max: 5 }))
    .map(([transactions, duplicateCount]) => {
      if (transactions.length === 0) return transactions;

      const result = [...transactions];
      for (let i = 0; i < duplicateCount && transactions.length > 0; i++) {
        // Pick a random transaction to duplicate
        const sourceIndex = Math.floor(Math.random() * transactions.length);
        const source = transactions[sourceIndex]!;

        // Create a duplicate (same date, amount, description)
        result.push({
          date: new Date(source.date),
          amount: source.amount,
          description: source.description,
          fitId: source.fitId,
        });
      }
      return result;
    });

  /**
   * Helper to compare two transaction arrays for equivalence
   */
  function transactionArraysEquivalent(arr1: RawTransaction[], arr2: RawTransaction[]): boolean {
    if (arr1.length !== arr2.length) {
      return false;
    }

    // Sort both arrays for comparison
    const sorted1 = [...arr1].sort((a, b) => {
      const dateCompare = a.date.getTime() - b.date.getTime();
      if (dateCompare !== 0) return dateCompare;
      const amountCompare = a.amount - b.amount;
      if (amountCompare !== 0) return amountCompare;
      return a.description.localeCompare(b.description);
    });

    const sorted2 = [...arr2].sort((a, b) => {
      const dateCompare = a.date.getTime() - b.date.getTime();
      if (dateCompare !== 0) return dateCompare;
      const amountCompare = a.amount - b.amount;
      if (amountCompare !== 0) return amountCompare;
      return a.description.localeCompare(b.description);
    });

    for (let i = 0; i < sorted1.length; i++) {
      const t1 = sorted1[i]!;
      const t2 = sorted2[i]!;

      if (
        t1.date.getTime() !== t2.date.getTime() ||
        Math.abs(t1.amount - t2.amount) >= 0.01 ||
        t1.description !== t2.description
      ) {
        return false;
      }
    }

    return true;
  }

  describe('Idempotence Property', () => {
    it('dedupe(dedupe(x)) === dedupe(x) for any set of transactions', () => {
      fc.assert(
        fc.property(transactionsWithDuplicatesArb, (transactions) => {
          // First dedupe
          const result1 = engine.dedupeIdempotent(transactions);

          // Second dedupe on the unique transactions from first run
          const result2 = engine.dedupeIdempotent(result1.uniqueTransactions);

          // The unique transactions should be the same
          expect(result2.uniqueTransactions.length).toBe(result1.uniqueTransactions.length);

          // No new duplicates should be found in the second run
          expect(result2.duplicates.length).toBe(0);

          // The transactions should be equivalent
          expect(
            transactionArraysEquivalent(result1.uniqueTransactions, result2.uniqueTransactions)
          ).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('multiple dedupe runs produce stable results', () => {
      fc.assert(
        fc.property(transactionsWithDuplicatesArb, (transactions) => {
          // Run dedupe multiple times
          const result1 = engine.dedupeIdempotent(transactions);
          const result2 = engine.dedupeIdempotent(result1.uniqueTransactions);
          const result3 = engine.dedupeIdempotent(result2.uniqueTransactions);
          const result4 = engine.dedupeIdempotent(result3.uniqueTransactions);

          // All subsequent runs should produce the same result
          expect(result2.uniqueTransactions.length).toBe(result1.uniqueTransactions.length);
          expect(result3.uniqueTransactions.length).toBe(result2.uniqueTransactions.length);
          expect(result4.uniqueTransactions.length).toBe(result3.uniqueTransactions.length);

          // No duplicates should be found after the first run
          expect(result2.duplicates.length).toBe(0);
          expect(result3.duplicates.length).toBe(0);
          expect(result4.duplicates.length).toBe(0);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('FITID-based Idempotence', () => {
    /**
     * Arbitrary for transactions with FITIDs (simulating OFX imports)
     */
    const transactionsWithFitIdArb = fc
      .array(
        fc.record({
          date: dateArb,
          amount: amountArb,
          description: descriptionArb,
          fitId: fc.string({ minLength: 5, maxLength: 20 }).filter((s) => s.trim() !== ''),
        }),
        { minLength: 1, maxLength: 20 }
      )
      .chain((transactions) => {
        // Add some duplicates with same FITID
        return fc.integer({ min: 0, max: 3 }).map((duplicateCount) => {
          const result = [...transactions];
          for (let i = 0; i < duplicateCount && transactions.length > 0; i++) {
            const sourceIndex = Math.floor(Math.random() * transactions.length);
            const source = transactions[sourceIndex]!;
            result.push({
              date: new Date(source.date),
              amount: source.amount,
              description: 'Different description but same FITID',
              fitId: source.fitId,
            });
          }
          return result;
        });
      });

    it('FITID-based dedupe is idempotent', () => {
      fc.assert(
        fc.property(transactionsWithFitIdArb, (transactions) => {
          const result1 = engine.dedupeIdempotent(transactions);
          const result2 = engine.dedupeIdempotent(result1.uniqueTransactions);

          // Same number of unique transactions
          expect(result2.uniqueTransactions.length).toBe(result1.uniqueTransactions.length);

          // No new duplicates
          expect(result2.duplicates.length).toBe(0);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Confidence Threshold Idempotence', () => {
    /**
     * Arbitrary for confidence thresholds
     */
    const thresholdArb = fc.double({ min: 0.1, max: 0.99, noNaN: true });

    it('idempotence holds for any confidence threshold', () => {
      fc.assert(
        fc.property(transactionsWithDuplicatesArb, thresholdArb, (transactions, threshold) => {
          const options = { confidenceThreshold: threshold };

          const result1 = engine.dedupeIdempotent(transactions, options);
          const result2 = engine.dedupeIdempotent(result1.uniqueTransactions, options);

          // Same number of unique transactions
          expect(result2.uniqueTransactions.length).toBe(result1.uniqueTransactions.length);

          // No new duplicates
          expect(result2.duplicates.length).toBe(0);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Order Independence', () => {
    it('dedupe result count is independent of input order', () => {
      fc.assert(
        fc.property(transactionsWithDuplicatesArb, (transactions) => {
          // Original order
          const result1 = engine.dedupeIdempotent(transactions);

          // Reversed order
          const reversed = [...transactions].reverse();
          const result2 = engine.dedupeIdempotent(reversed);

          // Should have same number of unique transactions
          // (though the specific transactions kept may differ)
          expect(result1.uniqueTransactions.length).toBe(result2.uniqueTransactions.length);
          expect(result1.duplicates.length).toBe(result2.duplicates.length);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Subset Property', () => {
    it('unique transactions are always a subset of input', () => {
      fc.assert(
        fc.property(transactionsWithDuplicatesArb, (transactions) => {
          const result = engine.dedupeIdempotent(transactions);

          // Number of unique + duplicates should equal total
          expect(result.uniqueTransactions.length + result.duplicates.length).toBe(
            transactions.length
          );

          // Unique count should be <= input count
          expect(result.uniqueTransactions.length).toBeLessThanOrEqual(transactions.length);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Empty Input', () => {
    it('empty input produces empty output', () => {
      const result = engine.dedupeIdempotent([]);

      expect(result.uniqueTransactions).toHaveLength(0);
      expect(result.duplicates).toHaveLength(0);
      expect(result.totalProcessed).toBe(0);
    });

    it('single transaction is always unique', () => {
      fc.assert(
        fc.property(transactionArb, (transaction) => {
          const result = engine.dedupeIdempotent([transaction]);

          expect(result.uniqueTransactions).toHaveLength(1);
          expect(result.duplicates).toHaveLength(0);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Exact Duplicates', () => {
    it('exact duplicates are always detected', () => {
      fc.assert(
        fc.property(transactionArb, fc.integer({ min: 2, max: 10 }), (transaction, count) => {
          // Create array of exact duplicates
          const transactions = Array(count)
            .fill(null)
            .map(() => ({
              date: new Date(transaction.date),
              amount: transaction.amount,
              description: transaction.description,
              fitId: transaction.fitId,
            }));

          const result = engine.dedupeIdempotent(transactions);

          // Should have exactly 1 unique transaction
          expect(result.uniqueTransactions).toHaveLength(1);

          // Should have count-1 duplicates
          expect(result.duplicates).toHaveLength(count - 1);
        }),
        { numRuns: 100 }
      );
    });
  });
});
