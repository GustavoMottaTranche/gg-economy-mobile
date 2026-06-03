/**
 * Goal Types
 *
 * Type definitions for variable expense budget goals.
 */

/**
 * Represents a persisted category goal
 */
export interface CategoryGoal {
  id: string;
  categoryId: string;
  amount: number; // in cents, always > 0
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

/**
 * Result of a goal amount validation
 */
export interface GoalValidationResult {
  valid: boolean;
  amountInCents?: number;
  error?: string; // i18n key
}
