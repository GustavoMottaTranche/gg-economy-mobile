/**
 * Category query functions using Drizzle ORM
 *
 * Provides CRUD operations for categories including default categories seeding.
 */
import { eq, and, desc, sql } from 'drizzle-orm';
import { randomUUID } from 'expo-crypto';
import { getDb, withTransaction } from '../client';
import { categories, transactions, type CategoryRecord, type NewCategoryRecord } from '../schema';
import type { CreateCategoryDTO, UpdateCategoryDTO, CategoryType } from '../../types';

/**
 * Default categories to seed on first app launch
 */
export const DEFAULT_CATEGORIES: Array<{
  name: string;
  type: CategoryType;
  icon: string;
  color: string;
}> = [
  { name: 'Food', type: 'expense', icon: 'restaurant', color: '#FF6B6B' },
  { name: 'Transport', type: 'expense', icon: 'car', color: '#4ECDC4' },
  { name: 'Salary', type: 'income', icon: 'wallet', color: '#45B7D1' },
  { name: 'Bills', type: 'expense', icon: 'receipt', color: '#96CEB4' },
  { name: 'Entertainment', type: 'expense', icon: 'film', color: '#DDA0DD' },
  { name: 'Health', type: 'expense', icon: 'heart', color: '#FF69B4' },
  { name: 'Shopping', type: 'expense', icon: 'shopping-bag', color: '#FFD93D' },
  { name: 'Other', type: 'expense', icon: 'more-horizontal', color: '#808080' },
];

/**
 * Convert a database record to a Category with proper date types
 */
function toCategory(record: CategoryRecord) {
  return {
    ...record,
    createdAt: new Date(record.createdAt),
  };
}

/**
 * Get all categories
 */
export async function getAllCategories() {
  const db = getDb();
  const results = await db.select().from(categories).orderBy(categories.name);
  return results.map(toCategory);
}

/**
 * Get all active categories
 */
export async function getActiveCategories() {
  const db = getDb();
  const results = await db
    .select()
    .from(categories)
    .where(eq(categories.isActive, true))
    .orderBy(categories.name);
  return results.map(toCategory);
}

/**
 * Get categories by type (income or expense)
 */
export async function getCategoriesByType(type: CategoryType) {
  const db = getDb();
  const results = await db
    .select()
    .from(categories)
    .where(and(eq(categories.type, type), eq(categories.isActive, true)))
    .orderBy(categories.name);
  return results.map(toCategory);
}

/**
 * Get a category by ID
 */
export async function getCategoryById(id: string) {
  const db = getDb();
  const results = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
  return results.length > 0 ? toCategory(results[0]) : null;
}

/**
 * Get a category by name
 */
export async function getCategoryByName(name: string) {
  const db = getDb();
  const results = await db.select().from(categories).where(eq(categories.name, name)).limit(1);
  return results.length > 0 ? toCategory(results[0]) : null;
}

/**
 * Create a new category
 */
export async function createCategory(data: CreateCategoryDTO) {
  const db = getDb();
  const id = randomUUID();
  const now = new Date().toISOString();

  const newCategory: NewCategoryRecord = {
    id,
    name: data.name,
    type: data.type,
    icon: data.icon,
    color: data.color,
    isActive: true,
    createdAt: now,
  };

  await db.insert(categories).values(newCategory);

  return toCategory({
    ...newCategory,
    createdAt: now,
  } as CategoryRecord);
}

/**
 * Update a category
 */
export async function updateCategory(id: string, data: UpdateCategoryDTO) {
  const db = getDb();

  const updateData: Partial<NewCategoryRecord> = {};

  if (data.name !== undefined) {
    updateData.name = data.name;
  }
  if (data.type !== undefined) {
    updateData.type = data.type;
  }
  if (data.icon !== undefined) {
    updateData.icon = data.icon;
  }
  if (data.color !== undefined) {
    updateData.color = data.color;
  }
  if (data.isActive !== undefined) {
    updateData.isActive = data.isActive;
  }

  await db.update(categories).set(updateData).where(eq(categories.id, id));

  return getCategoryById(id);
}

/**
 * Deactivate a category (soft delete)
 */
export async function deactivateCategory(id: string) {
  return updateCategory(id, { isActive: false });
}

/**
 * Activate a category
 */
export async function activateCategory(id: string) {
  return updateCategory(id, { isActive: true });
}

/**
 * Delete a category (hard delete)
 * Note: This will set categoryId to null for all transactions using this category
 */
export async function deleteCategory(id: string) {
  const db = getDb();
  await db.delete(categories).where(eq(categories.id, id));
}

/**
 * Get category count
 */
export async function getCategoryCount(): Promise<number> {
  const db = getDb();
  const result = await db.select({ count: sql<number>`count(*)` }).from(categories);
  return result[0]?.count ?? 0;
}

/**
 * Get active category count
 */
export async function getActiveCategoryCount(): Promise<number> {
  const db = getDb();
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(categories)
    .where(eq(categories.isActive, true));
  return result[0]?.count ?? 0;
}

/**
 * Check if default categories have been seeded
 */
export async function hasDefaultCategories(): Promise<boolean> {
  const count = await getCategoryCount();
  return count > 0;
}

/**
 * Seed default categories
 * Only seeds if no categories exist
 */
export async function seedDefaultCategories() {
  const hasCategories = await hasDefaultCategories();
  if (hasCategories) {
    return false; // Already seeded
  }

  return withTransaction(async () => {
    const db = getDb();
    const now = new Date().toISOString();

    for (const category of DEFAULT_CATEGORIES) {
      const id = randomUUID();
      const newCategory: NewCategoryRecord = {
        id,
        name: category.name,
        type: category.type,
        icon: category.icon,
        color: category.color,
        isActive: true,
        createdAt: now,
      };

      await db.insert(categories).values(newCategory);
    }

    return true; // Successfully seeded
  });
}

/**
 * Force seed default categories (even if categories exist)
 * Useful for testing or resetting to defaults
 */
export async function forceSeedDefaultCategories() {
  return withTransaction(async () => {
    const db = getDb();
    const now = new Date().toISOString();
    const results: CategoryRecord[] = [];

    for (const category of DEFAULT_CATEGORIES) {
      // Check if category with same name exists
      const existing = await getCategoryByName(category.name);
      if (existing) {
        results.push({
          ...existing,
          createdAt: existing.createdAt.toISOString(),
        } as unknown as CategoryRecord);
        continue;
      }

      const id = randomUUID();
      const newCategory: NewCategoryRecord = {
        id,
        name: category.name,
        type: category.type,
        icon: category.icon,
        color: category.color,
        isActive: true,
        createdAt: now,
      };

      await db.insert(categories).values(newCategory);
      results.push({
        ...newCategory,
        createdAt: now,
      } as CategoryRecord);
    }

    return results.map(toCategory);
  });
}

/**
 * Get category with transaction count
 */
export async function getCategoryWithTransactionCount(id: string) {
  const db = getDb();

  const categoryResult = await db.select().from(categories).where(eq(categories.id, id)).limit(1);

  if (categoryResult.length === 0) return null;

  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(transactions)
    .where(eq(transactions.categoryId, id));

  return {
    ...toCategory(categoryResult[0]),
    transactionCount: countResult[0]?.count ?? 0,
  };
}

/**
 * Get all categories with transaction counts
 */
export async function getCategoriesWithTransactionCounts() {
  const db = getDb();

  const results = await db
    .select({
      category: categories,
      transactionCount: sql<number>`(
        SELECT COUNT(*) FROM ${transactions} 
        WHERE ${transactions.categoryId} = ${categories.id}
      )`,
    })
    .from(categories)
    .orderBy(categories.name);

  return results.map(({ category, transactionCount }) => ({
    ...toCategory(category),
    transactionCount: transactionCount ?? 0,
  }));
}

/**
 * Search categories by name
 */
export async function searchCategories(query: string) {
  const db = getDb();
  const results = await db
    .select()
    .from(categories)
    .where(and(eq(categories.isActive, true), sql`${categories.name} LIKE ${'%' + query + '%'}`))
    .orderBy(categories.name);
  return results.map(toCategory);
}
