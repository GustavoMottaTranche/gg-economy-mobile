import type { CategoryGoal } from '../../types/goal';

/**
 * Repository interface for category goal data access.
 * Abstracts CRUD operations for variable expense budget goals,
 * enabling dependency injection and easier testing.
 */
export interface ICategoryGoalRepository {
  getByCategoryId(categoryId: string): Promise<CategoryGoal | null>;
  getAllForVariableCategories(): Promise<CategoryGoal[]>;
  upsert(categoryId: string, amountInCents: number): Promise<CategoryGoal>;
  delete(categoryId: string): Promise<void>;
}
