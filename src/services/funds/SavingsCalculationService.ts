/**
 * Savings Calculation Service
 *
 * Pure functions for computing savings goal and actual savings.
 * All monetary amounts are in cents (integers).
 *
 * - Savings Goal: projected amount available to save for the month
 * - Actual Savings: realized savings based on paid income vs paid expenses
 * - Remaining Distributable: savings goal minus total fund allocations
 *
 * @module SavingsCalculationService
 */

/**
 * Input for calculating the projected savings goal.
 */
export interface SavingsCalculationInput {
  monthlyIncome: number; // cents
  fixedPaidExpenses: number; // cents (paid fixed expenses, excludes fund-linked)
  fixedPendingExpenses: number; // cents (pending fixed expenses, excludes fund-linked)
  variableSpendingOrGoal: number; // cents: max(generalVariableGoal, totalVariableSpent)
}

/**
 * Calculates the projected savings goal for the month.
 *
 * Formula: max(0, monthlyIncome - fixedPaid - fixedPending - max(variableGoal, variableSpent))
 *
 * Uses the worst case for variable: if you spent more than the goal, uses actual spending.
 * If you spent less, uses the goal (because you expect to spend up to it).
 *
 * The result is clamped to a minimum of 0 (savings goal cannot be negative).
 *
 * @param input - The savings calculation input values
 * @returns The projected savings goal in cents (minimum 0)
 */
export function calculateSavingsGoal(input: SavingsCalculationInput): number {
  const { monthlyIncome, fixedPaidExpenses, fixedPendingExpenses, variableSpendingOrGoal } = input;

  return Math.max(
    0,
    monthlyIncome - fixedPaidExpenses - fixedPendingExpenses - variableSpendingOrGoal
  );
}

/**
 * Input for calculating actual realized savings.
 */
export interface ActualSavingsInput {
  monthlyIncome: number; // cents (configured monthly income for the month)
  totalPaidExpenses: number; // cents (all paid expenses excluding fund-linked)
}

/**
 * Calculates the actual realized savings.
 *
 * Formula: monthlyIncome - totalPaidExpenses
 *
 * The result can be negative, indicating paid expenses exceed monthly income.
 *
 * @param input - The actual savings input values
 * @returns The actual savings in cents
 */
export function calculateActualSavings(input: ActualSavingsInput): number {
  return input.monthlyIncome - input.totalPaidExpenses;
}

/**
 * Calculates the remaining distributable amount after fund allocations.
 *
 * Formula: savingsGoal - totalAllocations
 *
 * The result can be negative, indicating over-allocation.
 *
 * @param savingsGoal - The projected savings goal in cents
 * @param totalAllocations - The sum of all fund allocations for the month in cents
 * @returns The remaining distributable amount in cents
 */
export function calculateRemainingDistributable(
  savingsGoal: number,
  totalAllocations: number
): number {
  return savingsGoal - totalAllocations;
}
