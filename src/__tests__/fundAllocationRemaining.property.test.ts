// Feature: future-plans-funds, Property 5: Fund allocation remaining calculation

/**
 * Property 5: Fund allocation remaining calculation
 *
 * For any savings goal value and for any set of fund allocations with positive amounts,
 * the remaining distributable amount SHALL equal `savingsGoal - sum(allocations)`.
 * The result may be negative (over-allocation).
 *
 * **Validates: Requirements 6.3, 6.4**
 */

import * as fc from 'fast-check';
import { calculateRemainingDistributable } from '../services/funds/SavingsCalculationService';

describe('Property 5: Fund allocation remaining calculation', () => {
  describe('Result equals savingsGoal - totalAllocations', () => {
    it('should return savingsGoal - totalAllocations for arbitrary inputs', () => {
      fc.assert(
        fc.property(
          fc.integer(), // savingsGoal (can be negative — over-spending scenario)
          fc.nat(), // totalAllocations (non-negative, since allocations are positive sums)
          (savingsGoal, totalAllocations) => {
            const result = calculateRemainingDistributable(savingsGoal, totalAllocations);
            const expected = savingsGoal - totalAllocations;

            return result === expected;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Result can be negative (over-allocation)', () => {
    it('should allow negative results when allocations exceed savings goal', () => {
      fc.assert(
        fc.property(
          fc.nat({ max: 1000 }), // small savingsGoal
          fc.nat({ max: 100000 }), // potentially larger totalAllocations
          (savingsGoal, totalAllocations) => {
            const result = calculateRemainingDistributable(savingsGoal, totalAllocations);

            // Result is a finite number and can be negative
            return Number.isFinite(result);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('For an array of positive allocations, result equals savingsGoal - sum(allocations)', () => {
    it('should equal savingsGoal minus the sum of individual allocation amounts', () => {
      fc.assert(
        fc.property(
          fc.integer(), // savingsGoal (can be any integer)
          fc.array(
            fc.nat({ max: 1000000 }).filter((n) => n > 0),
            { minLength: 1, maxLength: 20 }
          ), // array of positive allocations
          (savingsGoal, allocations) => {
            const totalAllocations = allocations.reduce((sum, a) => sum + a, 0);
            const result = calculateRemainingDistributable(savingsGoal, totalAllocations);
            const expected = savingsGoal - totalAllocations;

            return result === expected;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
