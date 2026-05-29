/**
 * Property-Based Tests for Manual Entry Duplicate Detection
 *
 * These tests verify that the DedupeEngine correctly detects potential duplicates
 * when a manual entry matches an existing transaction.
 *
 * Property 14: Manual Entry Duplicate Detection
 * For any manual entry that matches an existing transaction (same date, amount,
 * and similar description), the DedupeEngine MUST detect and warn about the
 * potential duplicate.
 *
 * **Validates: Requirements 15.10**
 */

import fc from 'fast-check';
import { DedupeEngine } from '../../services/import/DedupeEngine';
import type { RawTransaction, Transaction } from '../../types/transaction';

describe('Manual Entry Duplicate Detection Property Tests', () => {
  const engine = new DedupeEngine();

  // Generate valid dates using UTC to avoid timezone issues
  const validDateArbitrary = fc
    .integer({ min: 0, max: 5 * 365 }) // Days from 2020-01-01
    .map((days) => {
      const date = new Date(Date.UTC(2020, 0, 1));
      date.setUTCDate(date.getUTCDate() + days);
      return date;
    });

  // Generate valid descriptions
  const validDescriptionArbitrary = fc
    .array(
      fc.constantFrom(
        'a',
        'b',
        'c',
        'd',
        'e',
        'f',
        'g',
        'h',
        'i',
        'j',
        'k',
        'l',
        'm',
        'n',
        'o',
        'p',
        'q',
        'r',
        's',
        't',
        'u',
        'v',
        'w',
        'x',
        'y',
        'z',
        'A',
        'B',
        'C',
        'D',
        'E',
        'F',
        'G',
        'H',
        'I',
        'J',
        'K',
        'L',
        'M',
        'N',
        'O',
        'P',
        'Q',
        'R',
        'S',
        'T',
        'U',
        'V',
        'W',
        'X',
        'Y',
        'Z',
        '0',
        '1',
        '2',
        '3',
        '4',
        '5',
        '6',
        '7',
        '8',
        '9',
        ' ',
        '-',
        '/'
      ),
      { minLength: 5, maxLength: 50 }
    )
    .map((chars) => chars.join(''))
    .filter((s) => s.trim().length > 0)
    .map((s) => s.trim());

  // Generate valid amounts (rounded to 2 decimal places)
  const validAmountArbitrary = fc
    .double({
      min: -10000,
      max: 10000,
      noNaN: true,
      noDefaultInfinity: true,
    })
    .map((n) => Math.round(n * 100) / 100);

  // Generate a RawTransaction (manual entry format)
  const rawTransactionArbitrary = fc.record({
    date: validDateArbitrary,
    amount: validAmountArbitrary,
    description: validDescriptionArbitrary,
    sourceLineNumber: fc.integer({ min: 1, max: 1000 }),
  });

  /**
   * Helper to create a Transaction from RawTransaction (simulating existing DB transaction)
   */
  function createExistingTransaction(raw: RawTransaction): Transaction {
    const date = raw.date;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');

    return {
      id: `tx-${Math.random().toString(36).substring(7)}`,
      title: '',
      date: raw.date,
      amount: raw.amount,
      description: raw.description,
      categoryId: null,
      originId: null,
      batchId: null,
      referenceMonth: `${year}-${month}`,
      needsReview: false,
      isExcludedFromTotals: false,
      duplicateOf: null,
      installmentGroupId: null,
      recurringId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Feature: excel-multi-file-import, Property 14: Manual Entry Duplicate Detection
   *
   * For any manual entry that matches an existing transaction (same date, amount,
   * and similar description), the DedupeEngine MUST detect and warn about the
   * potential duplicate.
   *
   * **Validates: Requirements 15.10**
   */
  describe('Property 14: Manual Entry Duplicate Detection', () => {
    /**
     * Test: Exact match (same date, amount, description) should be detected as duplicate
     * **Validates: Requirement 15.10**
     */
    it('should detect duplicate when manual entry exactly matches existing transaction', () => {
      fc.assert(
        fc.property(rawTransactionArbitrary, (baseTx) => {
          // Create an existing transaction in the "database"
          const existingTransaction = createExistingTransaction(baseTx);

          // Create a manual entry with the same data
          const manualEntry: RawTransaction = {
            date: new Date(baseTx.date.getTime()), // Same date
            amount: baseTx.amount,
            description: baseTx.description,
          };

          // Check for duplicates
          const result = engine.findDuplicates([manualEntry], [existingTransaction], {
            confidenceThreshold: 0.5,
          });

          // Should detect as duplicate with high confidence
          expect(result.duplicates.length).toBe(1);
          expect(result.duplicates[0]!.confidence).toBeGreaterThanOrEqual(0.9);
          expect(result.uniqueTransactions.length).toBe(0);
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Test: Same date and amount with similar description should be detected
     * **Validates: Requirement 15.10**
     */
    it('should detect duplicate when date and amount match with similar description', () => {
      fc.assert(
        fc.property(
          validDateArbitrary,
          validAmountArbitrary,
          validDescriptionArbitrary,
          (date, amount, baseDescription) => {
            // Create existing transaction
            const existingTransaction = createExistingTransaction({
              date,
              amount,
              description: baseDescription,
            });

            // Create manual entry with slightly modified description (add prefix)
            const modifiedDescription =
              baseDescription.length > 10
                ? baseDescription.substring(0, baseDescription.length - 2) + 'xy'
                : baseDescription + ' mod';

            const manualEntry: RawTransaction = {
              date: new Date(date.getTime()),
              amount,
              description: modifiedDescription,
            };

            // Check for duplicates
            const result = engine.findDuplicates([manualEntry], [existingTransaction], {
              confidenceThreshold: 0.5,
            });

            // Should detect as potential duplicate (date + amount match)
            expect(result.duplicates.length).toBe(1);
            expect(result.duplicates[0]!.confidence).toBeGreaterThanOrEqual(0.5);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Test: Different date should NOT be detected as duplicate
     * **Validates: Requirement 15.10**
     */
    it('should NOT detect duplicate when dates are different', () => {
      fc.assert(
        fc.property(
          validDateArbitrary,
          validDateArbitrary,
          validAmountArbitrary,
          validDescriptionArbitrary,
          (date1, date2, amount, description) => {
            // Ensure dates are different (at least 1 day apart)
            const adjustedDate2 = new Date(date2.getTime());
            if (
              date1.getFullYear() === adjustedDate2.getFullYear() &&
              date1.getMonth() === adjustedDate2.getMonth() &&
              date1.getDate() === adjustedDate2.getDate()
            ) {
              adjustedDate2.setDate(adjustedDate2.getDate() + 1);
            }

            // Create existing transaction
            const existingTransaction = createExistingTransaction({
              date: date1,
              amount,
              description,
            });

            // Create manual entry with different date
            const manualEntry: RawTransaction = {
              date: adjustedDate2,
              amount,
              description,
            };

            // Check for duplicates
            const result = engine.findDuplicates([manualEntry], [existingTransaction], {
              confidenceThreshold: 0.5,
            });

            // Should NOT detect as duplicate (different date)
            expect(result.duplicates.length).toBe(0);
            expect(result.uniqueTransactions.length).toBe(1);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Test: Different amount should NOT be detected as duplicate
     * **Validates: Requirement 15.10**
     */
    it('should NOT detect duplicate when amounts are different', () => {
      fc.assert(
        fc.property(
          validDateArbitrary,
          validAmountArbitrary,
          validAmountArbitrary,
          validDescriptionArbitrary,
          (date, amount1, amount2, description) => {
            // Ensure amounts are different (at least 0.01 apart)
            const adjustedAmount2 = Math.abs(amount1 - amount2) < 0.01 ? amount2 + 1 : amount2;

            // Create existing transaction
            const existingTransaction = createExistingTransaction({
              date,
              amount: amount1,
              description,
            });

            // Create manual entry with different amount
            const manualEntry: RawTransaction = {
              date: new Date(date.getTime()),
              amount: adjustedAmount2,
              description,
            };

            // Check for duplicates
            const result = engine.findDuplicates([manualEntry], [existingTransaction], {
              confidenceThreshold: 0.5,
            });

            // Should NOT detect as duplicate (different amount)
            expect(result.duplicates.length).toBe(0);
            expect(result.uniqueTransactions.length).toBe(1);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Test: Completely different transaction should NOT be detected as duplicate
     * **Validates: Requirement 15.10**
     */
    it('should NOT detect duplicate when transaction is completely different', () => {
      fc.assert(
        fc.property(rawTransactionArbitrary, rawTransactionArbitrary, (tx1, tx2) => {
          // Ensure transactions are different
          const adjustedTx2: RawTransaction = {
            ...tx2,
            // Make amount significantly different
            amount: tx2.amount + 10000,
            // Make date different
            date: new Date(tx2.date.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days later
          };

          // Create existing transaction
          const existingTransaction = createExistingTransaction(tx1);

          // Check for duplicates
          const result = engine.findDuplicates([adjustedTx2], [existingTransaction], {
            confidenceThreshold: 0.5,
          });

          // Should NOT detect as duplicate
          expect(result.duplicates.length).toBe(0);
          expect(result.uniqueTransactions.length).toBe(1);
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Test: Multiple existing transactions - should find the best match
     * **Validates: Requirement 15.10**
     */
    it('should find the best matching duplicate among multiple existing transactions', () => {
      fc.assert(
        fc.property(
          rawTransactionArbitrary,
          fc.array(rawTransactionArbitrary, { minLength: 1, maxLength: 10 }),
          (targetTx, otherTxs) => {
            // Create existing transactions including an exact match
            const exactMatch = createExistingTransaction(targetTx);

            // Make other transactions different
            const otherExisting = otherTxs.map((tx, i) =>
              createExistingTransaction({
                ...tx,
                amount: tx.amount + (i + 1) * 1000, // Different amounts
                date: new Date(tx.date.getTime() + (i + 1) * 24 * 60 * 60 * 1000), // Different dates
              })
            );

            const allExisting = [exactMatch, ...otherExisting];

            // Create manual entry matching the target
            const manualEntry: RawTransaction = {
              date: new Date(targetTx.date.getTime()),
              amount: targetTx.amount,
              description: targetTx.description,
            };

            // Check for duplicates
            const result = engine.findDuplicates([manualEntry], allExisting, {
              confidenceThreshold: 0.5,
            });

            // Should detect the exact match as duplicate
            expect(result.duplicates.length).toBe(1);
            const existingTx = result.duplicates[0]!.existingTransaction;
            expect('id' in existingTx ? existingTx.id : undefined).toBe(exactMatch.id);
            expect(result.duplicates[0]!.confidence).toBeGreaterThanOrEqual(0.9);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Test: Empty existing transactions should not find duplicates
     * **Validates: Requirement 15.10**
     */
    it('should not find duplicates when no existing transactions', () => {
      fc.assert(
        fc.property(rawTransactionArbitrary, (manualEntry) => {
          // Check for duplicates against empty list
          const result = engine.findDuplicates([manualEntry as RawTransaction], [], {
            confidenceThreshold: 0.5,
          });

          // Should not find any duplicates
          expect(result.duplicates.length).toBe(0);
          expect(result.uniqueTransactions.length).toBe(1);
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Test: Duplicate detection returns correct match information
     * **Validates: Requirement 15.10**
     */
    it('should return correct duplicate match information', () => {
      fc.assert(
        fc.property(rawTransactionArbitrary, (baseTx) => {
          // Create existing transaction
          const existingTransaction = createExistingTransaction(baseTx);

          // Create manual entry with same data
          const manualEntry: RawTransaction = {
            date: new Date(baseTx.date.getTime()),
            amount: baseTx.amount,
            description: baseTx.description,
          };

          // Check for duplicates
          const result = engine.findDuplicates([manualEntry], [existingTransaction], {
            confidenceThreshold: 0.5,
          });

          // Verify duplicate result structure
          expect(result.duplicates.length).toBe(1);

          const duplicate = result.duplicates[0]!;
          expect(duplicate.newTransaction).toEqual(manualEntry);
          const existingTx = duplicate.existingTransaction;
          expect('id' in existingTx ? existingTx.id : undefined).toBe(existingTransaction.id);
          expect(duplicate.confidence).toBeGreaterThanOrEqual(0);
          expect(duplicate.confidence).toBeLessThanOrEqual(1);
          expect(['fitid', 'date_amount_description', 'date_amount']).toContain(
            duplicate.matchReason
          );
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Test: Confidence threshold is respected
     * **Validates: Requirement 15.10**
     */
    it('should respect confidence threshold when detecting duplicates', () => {
      fc.assert(
        fc.property(
          validDateArbitrary,
          validAmountArbitrary,
          validDescriptionArbitrary,
          fc.double({ min: 0.5, max: 0.99, noNaN: true }),
          (date, amount, description, _threshold) => {
            // Create existing transaction
            const existingTransaction = createExistingTransaction({
              date,
              amount,
              description,
            });

            // Create manual entry with same date and amount but very different description
            const manualEntry: RawTransaction = {
              date: new Date(date.getTime()),
              amount,
              description: 'completely different text xyz123',
            };

            // Check with high threshold
            const resultHighThreshold = engine.findDuplicates(
              [manualEntry],
              [existingTransaction],
              { confidenceThreshold: 0.95 }
            );

            // Check with low threshold
            const resultLowThreshold = engine.findDuplicates([manualEntry], [existingTransaction], {
              confidenceThreshold: 0.5,
            });

            // Low threshold should find more or equal duplicates than high threshold
            expect(resultLowThreshold.duplicates.length).toBeGreaterThanOrEqual(
              resultHighThreshold.duplicates.length
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Test: Same date and amount with completely different description
     * should still be detected with lower confidence
     * **Validates: Requirement 15.10**
     */
    it('should detect potential duplicate with same date/amount but different description', () => {
      fc.assert(
        fc.property(
          validDateArbitrary,
          validAmountArbitrary,
          validDescriptionArbitrary,
          validDescriptionArbitrary,
          (date, amount, desc1, desc2) => {
            // Ensure descriptions are different
            const differentDesc = desc1 === desc2 ? desc2 + ' different' : desc2;

            // Create existing transaction
            const existingTransaction = createExistingTransaction({
              date,
              amount,
              description: desc1,
            });

            // Create manual entry with same date/amount but different description
            const manualEntry: RawTransaction = {
              date: new Date(date.getTime()),
              amount,
              description: differentDesc,
            };

            // Check for duplicates with low threshold
            const result = engine.findDuplicates([manualEntry], [existingTransaction], {
              confidenceThreshold: 0.5,
            });

            // Should detect as potential duplicate (date + amount match)
            expect(result.duplicates.length).toBe(1);
            expect(result.duplicates[0]!.confidence).toBeGreaterThanOrEqual(0.5);
            // Match reason should be date_amount or date_amount_description
            expect(['date_amount', 'date_amount_description']).toContain(
              result.duplicates[0]!.matchReason
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Test: Total processed count is correct
     * **Validates: Requirement 15.10**
     */
    it('should report correct total processed count', () => {
      fc.assert(
        fc.property(
          fc.array(rawTransactionArbitrary, { minLength: 1, maxLength: 20 }),
          fc.array(rawTransactionArbitrary, { minLength: 0, maxLength: 20 }),
          (manualEntries, existingTxs) => {
            const existing = existingTxs.map(createExistingTransaction);

            const result = engine.findDuplicates(manualEntries as RawTransaction[], existing, {
              confidenceThreshold: 0.5,
            });

            // Total processed should equal number of manual entries
            expect(result.totalProcessed).toBe(manualEntries.length);

            // Unique + duplicates should equal total processed
            expect(result.uniqueTransactions.length + result.duplicates.length).toBe(
              result.totalProcessed
            );
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
