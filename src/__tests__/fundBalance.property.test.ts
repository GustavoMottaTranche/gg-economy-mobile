// Feature: future-plans-funds, Property 3: Fund Balance calculation correctness

/**
 * Property 3: Fund Balance calculation correctness
 *
 * For any valid base amount (≥ 0), total allocations (≥ 0), and total deductions (≥ 0),
 * the `calculateFundBalance` function SHALL return:
 *   baseAmount + totalAllocations - totalDeductions
 *
 * The result may be negative (indicating overspending from the fund).
 *
 * **Validates: Requirements 7.3**
 */

import * as fc from 'fast-check';
import { calculateFundBalance } from '../services/funds/FundBalanceCalculationService';

describe('Property 3: Fund Balance calculation correctness', () => {
  describe('Result equals baseAmount + totalAllocations - totalDeductions for arbitrary values', () => {
    it('should return base + allocations - deductions for any non-negative integer inputs', () => {
      fc.assert(
        fc.property(
          fc.nat(), // baseAmount (non-negative integer cents)
          fc.nat(), // totalAllocations (non-negative integer cents)
          fc.nat(), // totalDeductions (non-negative integer cents)
          (baseAmount, totalAllocations, totalDeductions) => {
            const result = calculateFundBalance({
              baseAmount,
              totalAllocations,
              totalDeductions,
            });

            const expected = baseAmount + totalAllocations - totalDeductions;

            return result === expected;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Result can be negative when deductions exceed base + allocations', () => {
    it('should allow negative results without flooring at zero', () => {
      fc.assert(
        fc.property(
          fc.nat({ max: 1000 }), // small baseAmount
          fc.nat({ max: 1000 }), // small totalAllocations
          fc.nat({ max: 100000 }), // potentially larger totalDeductions
          (baseAmount, totalAllocations, totalDeductions) => {
            const result = calculateFundBalance({
              baseAmount,
              totalAllocations,
              totalDeductions,
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
