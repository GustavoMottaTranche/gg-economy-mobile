// Feature: future-plans-funds, Property 4: Reference Month Constraint filtering

/**
 * Property 4: Reference Month Constraint filtering
 *
 * For any set of linked transactions with various reference months and for any
 * current month value, the `filterDeductionsByMonth` function SHALL include only
 * transactions where referenceMonth <= currentMonth and SHALL exclude transactions
 * where referenceMonth > currentMonth.
 *
 * **Validates: Requirements 9.1, 9.4**
 */

import * as fc from 'fast-check';
import {
  filterDeductionsByMonth,
  TransactionWithMonth,
} from '../services/funds/FundBalanceCalculationService';

/**
 * Generates a valid YYYY-MM string with year in [2020, 2099] and month in [01, 12].
 */
const arbReferenceMonth = fc
  .record({
    year: fc.integer({ min: 2020, max: 2099 }),
    month: fc.integer({ min: 1, max: 12 }),
  })
  .map(({ year, month }) => `${year}-${String(month).padStart(2, '0')}`);

/**
 * Generates a TransactionWithMonth with a random amount and a valid referenceMonth.
 */
const arbTransactionWithMonth: fc.Arbitrary<TransactionWithMonth> = fc.record({
  amount: fc.nat(),
  referenceMonth: arbReferenceMonth,
});

describe('Property 4: Reference Month Constraint filtering', () => {
  describe('All returned transactions have referenceMonth <= currentMonth', () => {
    it('should only include transactions with referenceMonth <= currentMonth', () => {
      fc.assert(
        fc.property(
          fc.array(arbTransactionWithMonth),
          arbReferenceMonth,
          (transactions, currentMonth) => {
            const result = filterDeductionsByMonth(transactions, currentMonth);

            return result.every((t) => t.referenceMonth <= currentMonth);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('No transaction with referenceMonth > currentMonth is returned', () => {
    it('should exclude all transactions with referenceMonth > currentMonth', () => {
      fc.assert(
        fc.property(
          fc.array(arbTransactionWithMonth),
          arbReferenceMonth,
          (transactions, currentMonth) => {
            const result = filterDeductionsByMonth(transactions, currentMonth);

            return result.every((t) => !(t.referenceMonth > currentMonth));
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('All transactions from input with referenceMonth <= currentMonth are present in the result', () => {
    it('should retain every input transaction where referenceMonth <= currentMonth', () => {
      fc.assert(
        fc.property(
          fc.array(arbTransactionWithMonth),
          arbReferenceMonth,
          (transactions, currentMonth) => {
            const result = filterDeductionsByMonth(transactions, currentMonth);

            const expectedFromInput = transactions.filter((t) => t.referenceMonth <= currentMonth);

            return (
              result.length === expectedFromInput.length &&
              expectedFromInput.every((t, i) => result[i] === t)
            );
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
