/**
 * Category query functions using Drizzle ORM
 *
 * Provides CRUD operations for categories including default categories seeding.
 */
import { eq, and, sql } from 'drizzle-orm';
import { randomUUID } from 'expo-crypto';
import { getDb, withTransaction } from '../client';
import { categories, transactions, type CategoryRecord, type NewCategoryRecord } from '../schema';
import type {
  Category,
  CreateCategoryDTO,
  UpdateCategoryDTO,
  CategoryType,
  ExpenseGroup,
} from '../../types';

/**
 * Default categories to seed on first app launch
 */
export const DEFAULT_CATEGORIES: Array<{
  name: string;
  type: CategoryType;
  icon: string;
  color: string;
  expenseGroup: ExpenseGroup;
}> = [
  // Fixed expense categories (30)
  { name: 'Aluguel (Pix)', type: 'expense', icon: '🏠', color: '#E63946', expenseGroup: 'fixed' },
  {
    name: 'Condominio (Pix)',
    type: 'expense',
    icon: '🏢',
    color: '#457B9D',
    expenseGroup: 'fixed',
  },
  {
    name: 'Seguro Fiança (Pix)',
    type: 'expense',
    icon: '🛡️',
    color: '#1D3557',
    expenseGroup: 'fixed',
  },
  { name: 'Energia (Pix)', type: 'expense', icon: '⚡', color: '#F4A261', expenseGroup: 'fixed' },
  {
    name: 'Anuidade cartão',
    type: 'expense',
    icon: '💳',
    color: '#2A9D8F',
    expenseGroup: 'fixed',
  },
  { name: 'Crunchroll', type: 'expense', icon: '📺', color: '#E76F51', expenseGroup: 'fixed' },
  { name: 'Apple', type: 'expense', icon: '📱', color: '#264653', expenseGroup: 'fixed' },
  {
    name: 'YouTube Premium',
    type: 'expense',
    icon: '▶️',
    color: '#FF0000',
    expenseGroup: 'fixed',
  },
  { name: 'Meli+', type: 'expense', icon: '📦', color: '#FFE600', expenseGroup: 'fixed' },
  { name: 'Amazon Prime', type: 'expense', icon: '📦', color: '#FF9900', expenseGroup: 'fixed' },
  { name: 'Netflix', type: 'expense', icon: '🎬', color: '#E50914', expenseGroup: 'fixed' },
  { name: 'Google', type: 'expense', icon: '🌐', color: '#4285F4', expenseGroup: 'fixed' },
  { name: 'Serasa', type: 'expense', icon: '📄', color: '#6C757D', expenseGroup: 'fixed' },
  { name: 'W1', type: 'expense', icon: '💼', color: '#343A40', expenseGroup: 'fixed' },
  {
    name: 'Contabilizei',
    type: 'expense',
    icon: '🧮',
    color: '#28A745',
    expenseGroup: 'fixed',
  },
  {
    name: 'Exercicios',
    type: 'expense',
    icon: '🏋️',
    color: '#6F42C1',
    expenseGroup: 'fixed',
  },
  {
    name: 'Aluguel PJ',
    type: 'expense',
    icon: '🏢',
    color: '#D63384',
    expenseGroup: 'fixed',
  },
  {
    name: 'Conta de telefone e internet',
    type: 'expense',
    icon: '📶',
    color: '#0DCAF0',
    expenseGroup: 'fixed',
  },
  {
    name: 'Nutricionista (Pix)',
    type: 'expense',
    icon: '🍎',
    color: '#198754',
    expenseGroup: 'fixed',
  },
  { name: 'Cabelo', type: 'expense', icon: '✂️', color: '#FFC107', expenseGroup: 'fixed' },
  {
    name: 'Plano de saude (Pix)',
    type: 'expense',
    icon: '❤️',
    color: '#DC3545',
    expenseGroup: 'fixed',
  },
  {
    name: 'Marmita (Pix)',
    type: 'expense',
    icon: '☕',
    color: '#795548',
    expenseGroup: 'fixed',
  },
  { name: 'Tio Celmo', type: 'expense', icon: '👥', color: '#607D8B', expenseGroup: 'fixed' },
  { name: 'Unja', type: 'expense', icon: '👤', color: '#9C27B0', expenseGroup: 'fixed' },
  { name: 'Rogol', type: 'expense', icon: '✅', color: '#3F51B5', expenseGroup: 'fixed' },
  {
    name: 'Peparcelas random',
    type: 'expense',
    icon: '🔄',
    color: '#FF5722',
    expenseGroup: 'fixed',
  },
  { name: 'Azul', type: 'expense', icon: '✈️', color: '#03A9F4', expenseGroup: 'fixed' },
  { name: 'Parcelas casa', type: 'expense', icon: '🏠', color: '#8BC34A', expenseGroup: 'fixed' },
  { name: 'Faxina', type: 'expense', icon: '💧', color: '#00BCD4', expenseGroup: 'fixed' },
  {
    name: 'Outros',
    type: 'expense',
    icon: '➕',
    color: '#9E9E9E',
    expenseGroup: 'fixed',
  },
  // Variable expense categories (31)
  {
    name: 'Farmacia',
    type: 'expense',
    icon: '💊',
    color: '#E91E63',
    expenseGroup: 'variable',
  },
  { name: 'Uber', type: 'expense', icon: '🚗', color: '#000000', expenseGroup: 'variable' },
  {
    name: 'Super Mercado',
    type: 'expense',
    icon: '🛒',
    color: '#4CAF50',
    expenseGroup: 'variable',
  },
  { name: 'Eletronicos', type: 'expense', icon: '💻', color: '#2196F3', expenseGroup: 'variable' },
  { name: 'PC', type: 'expense', icon: '🖥️', color: '#3F51B5', expenseGroup: 'variable' },
  { name: 'Jogo', type: 'expense', icon: '🎮', color: '#9C27B0', expenseGroup: 'variable' },
  {
    name: 'Lazer (viajens, passeios)',
    type: 'expense',
    icon: '🧭',
    color: '#FF9800',
    expenseGroup: 'variable',
  },
  { name: 'Tatoo', type: 'expense', icon: '🖊️', color: '#795548', expenseGroup: 'variable' },
  { name: 'Roupas', type: 'expense', icon: '👕', color: '#E91E63', expenseGroup: 'variable' },
  { name: 'Presentes', type: 'expense', icon: '🎁', color: '#F44336', expenseGroup: 'variable' },
  {
    name: 'Streaming',
    type: 'expense',
    icon: '▶️',
    color: '#673AB7',
    expenseGroup: 'variable',
  },
  { name: 'Ifood', type: 'expense', icon: '🍽️', color: '#EA1D2C', expenseGroup: 'variable' },
  { name: 'Nutrição', type: 'expense', icon: '🥗', color: '#4CAF50', expenseGroup: 'variable' },
  {
    name: 'Consertos',
    type: 'expense',
    icon: '🔧',
    color: '#607D8B',
    expenseGroup: 'variable',
  },
  {
    name: 'Estetico',
    type: 'expense',
    icon: '✨',
    color: '#FF4081',
    expenseGroup: 'variable',
  },
  {
    name: 'Cinema',
    type: 'expense',
    icon: '🎬',
    color: '#311B92',
    expenseGroup: 'variable',
  },
  {
    name: 'Eventos',
    type: 'expense',
    icon: '📅',
    color: '#FF6F00',
    expenseGroup: 'variable',
  },
  { name: 'Role', type: 'expense', icon: '🎵', color: '#7C4DFF', expenseGroup: 'variable' },
  {
    name: 'Aluguel de carro',
    type: 'expense',
    icon: '🚗',
    color: '#00897B',
    expenseGroup: 'variable',
  },
  { name: 'Onibus', type: 'expense', icon: '🚌', color: '#5C6BC0', expenseGroup: 'variable' },
  {
    name: 'Restaurante',
    type: 'expense',
    icon: '🍽️',
    color: '#BF360C',
    expenseGroup: 'variable',
  },
  {
    name: 'Espaço de beach',
    type: 'expense',
    icon: '☀️',
    color: '#FFAB00',
    expenseGroup: 'variable',
  },
  {
    name: 'Podologa',
    type: 'expense',
    icon: '🦶',
    color: '#8D6E63',
    expenseGroup: 'variable',
  },
  {
    name: 'Postura',
    type: 'expense',
    icon: '🧘',
    color: '#26A69A',
    expenseGroup: 'variable',
  },
  {
    name: 'Exercicio',
    type: 'expense',
    icon: '💪',
    color: '#7B1FA2',
    expenseGroup: 'variable',
  },
  {
    name: 'Eletricista',
    type: 'expense',
    icon: '🔌',
    color: '#FDD835',
    expenseGroup: 'variable',
  },
  {
    name: 'Mecanico',
    type: 'expense',
    icon: '⚙️',
    color: '#455A64',
    expenseGroup: 'variable',
  },
  {
    name: 'Reembolso',
    type: 'expense',
    icon: '↩️',
    color: '#00C853',
    expenseGroup: 'variable',
  },
  {
    name: 'Itens pra casa',
    type: 'expense',
    icon: '🏠',
    color: '#FF7043',
    expenseGroup: 'variable',
  },
  {
    name: 'Criação de conteudo',
    type: 'expense',
    icon: '🎥',
    color: '#1565C0',
    expenseGroup: 'variable',
  },
  { name: 'Outros', type: 'expense', icon: '📋', color: '#757575', expenseGroup: 'variable' },
];

/**
 * Convert a database record to a Category with proper date types
 */
function toCategory(record: CategoryRecord) {
  return {
    ...record,
    expenseGroup: record.expenseGroup as import('../../types').ExpenseGroup | null,
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
  const first = results[0];
  return first ? toCategory(first) : null;
}

/**
 * Get a category by name
 */
export async function getCategoryByName(name: string) {
  const db = getDb();
  const results = await db.select().from(categories).where(eq(categories.name, name)).limit(1);
  const first = results[0];
  return first ? toCategory(first) : null;
}

/**
 * Valid expense group values
 */
const VALID_EXPENSE_GROUPS: ExpenseGroup[] = ['fixed', 'variable'];

/**
 * Validate that an expenseGroup value is valid ('fixed', 'variable', or null/undefined)
 * Throws an error if the value is invalid.
 */
function validateExpenseGroup(expenseGroup: unknown): ExpenseGroup | null {
  if (expenseGroup === null || expenseGroup === undefined) {
    return null;
  }
  if (VALID_EXPENSE_GROUPS.includes(expenseGroup as ExpenseGroup)) {
    return expenseGroup as ExpenseGroup;
  }
  throw new Error(
    `Invalid expenseGroup value: '${String(expenseGroup)}'. Must be 'fixed', 'variable', or null.`
  );
}

/**
 * Create a new category
 */
export async function createCategory(data: CreateCategoryDTO) {
  const db = getDb();
  const id = randomUUID();
  const now = new Date().toISOString();

  // Validate expenseGroup value
  const validatedExpenseGroup = validateExpenseGroup(data.expenseGroup);

  // Force expenseGroup to null for income categories
  const expenseGroup = data.type === 'income' ? null : validatedExpenseGroup;

  const newCategory: NewCategoryRecord = {
    id,
    name: data.name,
    type: data.type,
    icon: data.icon,
    color: data.color,
    isActive: true,
    expenseGroup,
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

  // Handle expenseGroup field
  if (data.expenseGroup !== undefined) {
    const validatedExpenseGroup = validateExpenseGroup(data.expenseGroup);
    updateData.expenseGroup = validatedExpenseGroup;
  }

  // If type is changing to 'income', force expenseGroup to null
  if (data.type === 'income') {
    updateData.expenseGroup = null;
  } else if (data.type === undefined && data.expenseGroup === undefined) {
    // No type or expenseGroup change — check if existing category is income
    // to prevent setting expenseGroup via other means (no-op in this branch)
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
        expenseGroup: category.expenseGroup,
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
        expenseGroup: category.expenseGroup,
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
  const firstCategory = categoryResult[0];

  if (!firstCategory) return null;

  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(transactions)
    .where(eq(transactions.categoryId, id));

  return {
    ...toCategory(firstCategory),
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

/**
 * Get active categories filtered by expense group
 * Returns only active categories belonging to the specified group, sorted alphabetically.
 */
export async function getCategoriesByExpenseGroup(group: ExpenseGroup): Promise<Category[]> {
  const db = getDb();
  const results = await db
    .select()
    .from(categories)
    .where(and(eq(categories.isActive, true), eq(categories.expenseGroup, group)))
    .orderBy(categories.name);
  return results.map(toCategory);
}

/**
 * Get category counts grouped by expense group
 * Returns the number of active expense categories in each group plus uncategorized (null expenseGroup).
 */
export async function getCategoryCountsByExpenseGroup(): Promise<{
  fixed: number;
  variable: number;
  uncategorized: number;
}> {
  const db = getDb();

  const fixedResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(categories)
    .where(
      and(
        eq(categories.isActive, true),
        eq(categories.type, 'expense'),
        eq(categories.expenseGroup, 'fixed')
      )
    );

  const variableResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(categories)
    .where(
      and(
        eq(categories.isActive, true),
        eq(categories.type, 'expense'),
        eq(categories.expenseGroup, 'variable')
      )
    );

  const uncategorizedResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(categories)
    .where(
      and(
        eq(categories.isActive, true),
        eq(categories.type, 'expense'),
        sql`${categories.expenseGroup} IS NULL`
      )
    );

  return {
    fixed: fixedResult[0]?.count ?? 0,
    variable: variableResult[0]?.count ?? 0,
    uncategorized: uncategorizedResult[0]?.count ?? 0,
  };
}

/**
 * Get the number of transactions associated with a specific category
 */
export async function getTransactionCountByCategory(categoryId: string): Promise<number> {
  const db = getDb();
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(transactions)
    .where(eq(transactions.categoryId, categoryId));
  return result[0]?.count ?? 0;
}

/**
 * Delete a category with replacement — updates all transactions to the replacement category,
 * then deactivates the original category. Executed within a transaction for atomicity.
 *
 * @param categoryId - The category to deactivate
 * @param replacementCategoryId - The category to reassign transactions to
 * @throws Error if categoryId equals replacementCategoryId
 */
export async function deleteCategoryWithReplacement(
  categoryId: string,
  replacementCategoryId: string
): Promise<void> {
  if (categoryId === replacementCategoryId) {
    throw new Error('A categoria substituta deve ser diferente da categoria sendo excluída.');
  }

  await withTransaction(async () => {
    const db = getDb();

    // Update all transactions from the original category to the replacement
    await db
      .update(transactions)
      .set({ categoryId: replacementCategoryId })
      .where(eq(transactions.categoryId, categoryId));

    // Deactivate the original category
    await db.update(categories).set({ isActive: false }).where(eq(categories.id, categoryId));
  });
}
