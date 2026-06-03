/**
 * Expected Future Spending Calculation Service
 *
 * Pure function that computes expected future variable spending
 * based on category goals and actual spending. For each category
 * with a configured goal, calculates max(0, goal - actualSpending).
 * Categories without goals are excluded entirely.
 *
 * All amounts are in cents (integers).
 *
 * @module ExpectedFutureSpending
 */

/**
 * Represents a category's spending and optional goal for calculation purposes.
 */
export interface CategorySpendingWithGoal {
  categoryId: string;
  actualSpending: number; // cents
  goal: number | null; // cents, null = no goal configured
}

/**
 * Calculates expected future spending.
 *
 * For each category with a goal: contributes max(0, goal - actualSpending).
 * Categories without goals (goal === null) contribute nothing.
 * The result is always >= 0.
 *
 * @param categories - Array of categories with their actual spending and optional goals
 * @returns The total expected future spending in cents (always >= 0)
 */
export function calculateExpectedFutureSpending(categories: CategorySpendingWithGoal[]): number {
  let total = 0;

  for (const category of categories) {
    if (category.goal === null) {
      continue;
    }

    const remaining = category.goal - category.actualSpending;
    total += Math.max(0, remaining);
  }

  return total;
}
