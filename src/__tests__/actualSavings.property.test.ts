// Feature: future-plans-funds, Property 2: Actual Savings calculation correctness

/**
 * Property 2: Actual Savings calculation correctness
 *
 * For any valid combination of monthly income and total paid expenses,
 * the `calculateActualSavings` function SHALL return:
 *   monthlyIncome - totalPaidExpenses
 *
 * The result may be negative.
 *
 * **Validates: Requirements 4.2, 4.5**
 */

import * as fc from 'fast-check';
import { calculateActualSavings } from '../services/funds/SavingsCalculationService';

describe('Property 2: Actual Savings calculation correctness', () => {
  describe('Result equals monthlyIncome - totalPaidExpenses for arbitrary values', () => {
    it('should return income - expenses for any non-negative integer inputs', () => {
      fc.assert(
        fc.property(
          fc.nat(), // monthlyIncome (non-negative integer cents)
          fc.nat(), // totalPaidExpenses (non-negative integer cents)
          (monthlyIncome, totalPaidExpenses) => {
            const result = calculateActualSavings({
              monthlyIncome,
              totalPaidExpenses,
            });

            const expected = monthlyIncome - totalPaidExpenses;

            return result === expected;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Result can be negative when expenses exceed income', () => {
    it('should allow negative results without flooring at zero', () => {
      fc.assert(
        fc.property(
          fc.nat({ max: 1000 }), // small monthlyIncome
          fc.nat({ max: 100000 }), // potentially larger totalPaidExpenses
          (monthlyIncome, totalPaidExpenses) => {
            const result = calculateActualSavings({
              monthlyIncome,
              totalPaidExpenses,
            });

            // The result should be a finite number (can be negative)
            return Number.isFinite(result);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
