/**
 * Category Goal Repository Implementation
 *
 * Implements ICategoryGoalRepository interface using Drizzle ORM queries.
 * Provides data access for variable expense budget goals including
 * CRUD operations with upsert (INSERT OR REPLACE) pattern.
 *
 * @module CategoryGoalRepository
 */

import { eq, sql } from 'drizzle-orm';
import { randomUUID } from 'expo-crypto';
import { getDb } from '../db/client';
import { categoryGoals, categories, type CategoryGoalRecord } from '../db/schema';
import type { CategoryGoal } from '../types/goal';
import type { ICategoryGoalRepository } from './interfaces/ICategoryGoalRepository';

/**
 * Convert a database record to a CategoryGoal domain type.
 */
function toCategoryGoal(record: CategoryGoalRecord): CategoryGoal {
  return {
    id: record.id,
    categoryId: record.categoryId,
    amount: record.amount,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

/**
 * Repository implementation for category goal data access.
 * Uses Drizzle ORM for type-safe database operations.
 */
export class CategoryGoalRepository implements ICategoryGoalRepository {
  /**
   * Get a category goal by its category ID.
   * Returns null if no goal is configured for the category.
   */
  async getByCategoryId(categoryId: string): Promise<CategoryGoal | null> {
    const db = getDb();
    const results = await db
      .select()
      .from(categoryGoals)
      .where(eq(categoryGoals.categoryId, categoryId))
      .limit(1);

    const first = results[0];
    return first ? toCategoryGoal(first) : null;
  }

  /**
   * Get all category goals for variable expense categories.
   * Joins with categories table to filter by expense_group = 'variable'.
   */
  async getAllForVariableCategories(): Promise<CategoryGoal[]> {
    const db = getDb();
    const results = await db
      .select({
        id: categoryGoals.id,
        categoryId: categoryGoals.categoryId,
        amount: categoryGoals.amount,
        createdAt: categoryGoals.createdAt,
        updatedAt: categoryGoals.updatedAt,
      })
      .from(categoryGoals)
      .innerJoin(categories, eq(categoryGoals.categoryId, categories.id))
      .where(eq(categories.expenseGroup, 'variable'));

    return results.map(toCategoryGoal);
  }

  /**
   * Insert or replace a category goal.
   * Uses INSERT OR REPLACE pattern via Drizzle's onConflictDoUpdate.
   * Generates a new UUID for the id on insert, updates `updated_at` on conflict.
   */
  async upsert(categoryId: string, amountInCents: number): Promise<CategoryGoal> {
    const db = getDb();
    const now = new Date().toISOString();
    const id = randomUUID();

    await db
      .insert(categoryGoals)
      .values({
        id,
        categoryId,
        amount: amountInCents,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: categoryGoals.categoryId,
        set: {
          amount: sql`excluded.amount`,
          updatedAt: sql`excluded.updated_at`,
        },
      });

    // Fetch the resulting record (may have existing id if it was an update)
    const result = await this.getByCategoryId(categoryId);
    return result!;
  }

  /**
   * Delete a category goal by its category ID.
   * Removes the row entirely — absence indicates no goal configured.
   */
  async delete(categoryId: string): Promise<void> {
    const db = getDb();
    await db.delete(categoryGoals).where(eq(categoryGoals.categoryId, categoryId));
  }
}

/**
 * Singleton instance of CategoryGoalRepository for use throughout the application.
 * Services should accept ICategoryGoalRepository through constructor injection,
 * defaulting to this instance for production use.
 */
export const categoryGoalRepository = new CategoryGoalRepository();
