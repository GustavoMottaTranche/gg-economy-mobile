/**
 * Fund Balance Calculation Service
 *
 * Pure functions for computing total fund balance and filtering deductions
 * by the reference month constraint.
 * All monetary amounts are in cents (integers).
 *
 * - Fund Balance: base amount + allocations - deductions
 * - Reference Month Constraint: only transactions with referenceMonth <= currentMonth count
 *
 * @module FundBalanceCalculationService
 */

/**
 * Input for calculating the total fund balance.
 */
export interface FundBalanceInput {
  baseAmount: number; // cents, from fund_balances table
  totalAllocations: number; // sum of all fund_allocations for this fund
  totalDeductions: number; // sum of linked transactions where referenceMonth <= currentMonth
}

/**
 * Calculates the total fund balance.
 *
 * Formula: baseAmount + totalAllocations - totalDeductions
 *
 * The result can be negative, indicating overspending from the fund.
 *
 * @param input - The fund balance calculation input values
 * @returns The total fund balance in cents
 */
export function calculateFundBalance(input: FundBalanceInput): number {
  return input.baseAmount + input.totalAllocations - input.totalDeductions;
}

/**
 * A transaction with a reference month for filtering purposes.
 */
export interface TransactionWithMonth {
  amount: number; // cents
  referenceMonth: string; // YYYY-MM format
}

/**
 * Filters linked transactions to only include those with referenceMonth <= currentMonth.
 *
 * Month comparison is string-based (YYYY-MM format sorts correctly lexicographically).
 * This enforces the Reference Month Constraint: only current or past transactions
 * count toward fund balance deductions.
 *
 * @param transactions - Array of transactions with reference months
 * @param currentMonth - The current month in YYYY-MM format
 * @returns Filtered array containing only transactions where referenceMonth <= currentMonth
 */
export function filterDeductionsByMonth(
  transactions: TransactionWithMonth[],
  currentMonth: string
): TransactionWithMonth[] {
  return transactions.filter((t) => t.referenceMonth <= currentMonth);
}
