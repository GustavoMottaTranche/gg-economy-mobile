// Feature: future-plans-funds, Property 1: Savings Goal calculation correctness

/**
 * Property 1: Savings Goal calculation correctness
 *
 * For any valid combination of monthly income, fixed paid, fixed pending,
 * and variableSpendingOrGoal, the `calculateSavingsGoal` function SHALL return:
 *   max(0, monthlyIncome - fixedPaidExpenses - fixedPendingExpenses - variableSpendingOrGoal)
 *
 * The result is clamped to a minimum of 0 (savings goal cannot be negative).
 *
 * **Validates: Requirements 3.2, 3.3, 3.4, 3.5**
 */

import * as fc from 'fast-check';
import { calculateSavingsGoal } from '../services/funds/SavingsCalculationService';

describe('Property 1: Savings Goal calculation correctness', () => {
  describe('Result equals max(0, income - fixedPaid - fixedPending - variableSpendingOrGoal)', () => {
    it('should return max(0, monthlyIncome - fixedPaid - fixedPending - variableSpendingOrGoal)', () => {
      fc.assert(
        fc.property(
          fc.nat(), // monthlyIncome
          fc.nat(), // fixedPaidExpenses
          fc.nat(), // fixedPendingExpenses
          fc.nat(), // variableSpendingOrGoal
          (monthlyIncome, fixedPaidExpenses, fixedPendingExpenses, variableSpendingOrGoal) => {
            const result = calculateSavingsGoal({
              monthlyIncome,
              fixedPaidExpenses,
              fixedPendingExpenses,
              variableSpendingOrGoal,
            });

            const expected = Math.max(
              0,
              monthlyIncome - fixedPaidExpenses - fixedPendingExpenses - variableSpendingOrGoal
            );

            return result === expected;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Result is always >= 0', () => {
    it('should never return a negative value', () => {
      fc.assert(
        fc.property(
          fc.nat({ max: 1000 }),
          fc.nat({ max: 100000 }),
          fc.nat({ max: 100000 }),
          fc.nat({ max: 100000 }),
          (monthlyIncome, fixedPaidExpenses, fixedPendingExpenses, variableSpendingOrGoal) => {
            const result = calculateSavingsGoal({
              monthlyIncome,
              fixedPaidExpenses,
              fixedPendingExpenses,
              variableSpendingOrGoal,
            });

            return result >= 0;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('When income covers all expenses, result equals the raw subtraction', () => {
    it('should return the raw formula result when it is positive', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 100000, max: 10000000 }),
          fc.nat({ max: 10000 }),
          fc.nat({ max: 10000 }),
          fc.nat({ max: 10000 }),
          (monthlyIncome, fixedPaidExpenses, fixedPendingExpenses, variableSpendingOrGoal) => {
            const result = calculateSavingsGoal({
              monthlyIncome,
              fixedPaidExpenses,
              fixedPendingExpenses,
              variableSpendingOrGoal,
            });

            const expected =
              monthlyIncome - fixedPaidExpenses - fixedPendingExpenses - variableSpendingOrGoal;

            return result === expected;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
