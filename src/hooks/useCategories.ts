/**
 * useCategories Hook
 *
 * Custom hook for managing categories with reactive updates using Drizzle's useLiveQuery.
 * Supports filtering by type (income/expense).
 *
 * **Validates: Requirements 17, 29**
 */
import { useMemo, useCallback, useState } from 'react';
import { eq, and, sql } from 'drizzle-orm';
import { useLiveQuery, getDb } from '../db/client';
import { categories, transactions } from '../db/schema';
import {
  createCategory,
  updateCategory,
  deactivateCategory,
  activateCategory,
  deleteCategory,
  getCategoryById,
  deleteCategoryWithReplacement,
} from '../db/queries/categories';
import type { Category, CategoryType, CreateCategoryDTO, UpdateCategoryDTO } from '../types';

/**
 * Category with transaction count
 */
export interface CategoryWithCount extends Category {
  transactionCount: number;
}

/**
 * Filter options for categories
 */
export interface CategoryFilters {
  /** Filter by category type */
  type?: CategoryType;
  /** Include inactive categories */
  includeInactive?: boolean;
}

/**
 * Return type for useCategories hook
 */
export interface UseCategoriesReturn {
  /** List of categories */
  categories: Category[];
  /** Categories with transaction counts */
  categoriesWithCounts: CategoryWithCount[];
  /** Income categories only */
  incomeCategories: Category[];
  /** Expense categories only */
  expenseCategories: Category[];
  /** Fixed expense categories (active, expenseGroup 'fixed') */
  fixedExpenseCategories: Category[];
  /** Variable expense categories (active, expenseGroup 'variable') */
  variableExpenseCategories: Category[];
  /** Whether data is loading */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
  /** Total count of categories */
  totalCount: number;
  /** Count of active categories */
  activeCount: number;
  /** Counts by expense group */
  countsByGroup: { fixed: number; variable: number; uncategorized: number };
  /** Get a category by ID */
  getById: (id: string) => Promise<Category | null>;
  /** Create a new category */
  create: (data: CreateCategoryDTO) => Promise<Category>;
  /** Update an existing category */
  update: (id: string, data: UpdateCategoryDTO) => Promise<Category | null>;
  /** Deactivate a category (soft delete) */
  deactivate: (id: string) => Promise<Category | null>;
  /** Activate a category */
  activate: (id: string) => Promise<Category | null>;
  /** Delete a category (hard delete) */
  remove: (id: string) => Promise<void>;
  /** Delete a category with replacement (reassign transactions, then deactivate) */
  deleteWithReplacement: (id: string, replacementId: string) => Promise<void>;
  /** Refresh the data */
  refresh: () => void;
}

/**
 * Convert database record to Category
 */
function toCategory(record: typeof categories.$inferSelect): Category {
  return {
    id: record.id,
    name: record.name,
    type: record.type as CategoryType,
    icon: record.icon,
    color: record.color,
    isActive: record.isActive,
    expenseGroup: (record.expenseGroup as Category['expenseGroup']) ?? null,
    createdAt: new Date(record.createdAt),
  };
}

/**
 * Hook for managing categories with reactive updates
 *
 * @param filters - Optional filters for categories
 * @returns Category management interface
 *
 * @example
 * ```tsx
 * const { categories, incomeCategories, expenseCategories, create, update } = useCategories();
 *
 * // Filter by type
 * const { categories: expenses } = useCategories({ type: 'expense' });
 * ```
 */
export function useCategories(filters: CategoryFilters = {}): UseCategoriesReturn {
  const db = getDb();
  const { type, includeInactive = false } = filters;

  // Build where conditions
  const whereConditions = useMemo(() => {
    const conditions = [];

    if (type) {
      conditions.push(eq(categories.type, type));
    }

    if (!includeInactive) {
      conditions.push(eq(categories.isActive, true));
    }

    return conditions.length > 0 ? and(...conditions) : undefined;
  }, [type, includeInactive]);

  // Live query for categories
  const { data: categoryData, error: queryError } = useLiveQuery(
    whereConditions
      ? db.select().from(categories).where(whereConditions).orderBy(categories.name)
      : db.select().from(categories).orderBy(categories.name),
    [whereConditions]
  );

  // Live query for categories with transaction counts
  const { data: categoriesWithCountsData } = useLiveQuery(
    db
      .select({
        category: categories,
        transactionCount: sql<number>`(
          SELECT COUNT(*) FROM ${transactions} 
          WHERE ${transactions.categoryId} = ${categories.id}
        )`,
      })
      .from(categories)
      .where(includeInactive ? undefined : eq(categories.isActive, true))
      .orderBy(categories.name),
    [includeInactive]
  );

  // Live query for income categories
  const { data: incomeCategoryData } = useLiveQuery(
    db
      .select()
      .from(categories)
      .where(and(eq(categories.type, 'income'), eq(categories.isActive, true)))
      .orderBy(categories.name)
  );

  // Live query for expense categories
  const { data: expenseCategoryData } = useLiveQuery(
    db
      .select()
      .from(categories)
      .where(and(eq(categories.type, 'expense'), eq(categories.isActive, true)))
      .orderBy(categories.name)
  );

  // Live query for fixed expense categories
  const { data: fixedExpenseCategoryData } = useLiveQuery(
    db
      .select()
      .from(categories)
      .where(
        and(
          eq(categories.type, 'expense'),
          eq(categories.isActive, true),
          eq(categories.expenseGroup, 'fixed')
        )
      )
      .orderBy(categories.name)
  );

  // Live query for variable expense categories
  const { data: variableExpenseCategoryData } = useLiveQuery(
    db
      .select()
      .from(categories)
      .where(
        and(
          eq(categories.type, 'expense'),
          eq(categories.isActive, true),
          eq(categories.expenseGroup, 'variable')
        )
      )
      .orderBy(categories.name)
  );

  // Live query for counts by expense group
  const { data: countsByGroupData } = useLiveQuery(
    db
      .select({
        fixed: sql<number>`sum(case when ${categories.expenseGroup} = 'fixed' then 1 else 0 end)`,
        variable: sql<number>`sum(case when ${categories.expenseGroup} = 'variable' then 1 else 0 end)`,
        uncategorized: sql<number>`sum(case when ${categories.expenseGroup} IS NULL AND ${categories.type} = 'expense' then 1 else 0 end)`,
      })
      .from(categories)
      .where(and(eq(categories.isActive, true), eq(categories.type, 'expense')))
  );

  // Live query for counts
  const { data: countData } = useLiveQuery(
    db
      .select({
        total: sql<number>`count(*)`,
        active: sql<number>`sum(case when ${categories.isActive} = 1 then 1 else 0 end)`,
      })
      .from(categories)
  );

  // Transform data
  const transformedCategories = useMemo(() => {
    if (!categoryData) return [];
    return categoryData.map(toCategory);
  }, [categoryData]);

  const transformedCategoriesWithCounts = useMemo<CategoryWithCount[]>(() => {
    if (!categoriesWithCountsData) return [];
    return categoriesWithCountsData.map(({ category, transactionCount }) => ({
      ...toCategory(category),
      transactionCount: transactionCount ?? 0,
    }));
  }, [categoriesWithCountsData]);

  const transformedIncomeCategories = useMemo(() => {
    if (!incomeCategoryData) return [];
    return incomeCategoryData.map(toCategory);
  }, [incomeCategoryData]);

  const transformedExpenseCategories = useMemo(() => {
    if (!expenseCategoryData) return [];
    return expenseCategoryData.map(toCategory);
  }, [expenseCategoryData]);

  const transformedFixedExpenseCategories = useMemo(() => {
    if (!fixedExpenseCategoryData) return [];
    return fixedExpenseCategoryData.map(toCategory);
  }, [fixedExpenseCategoryData]);

  const transformedVariableExpenseCategories = useMemo(() => {
    if (!variableExpenseCategoryData) return [];
    return variableExpenseCategoryData.map(toCategory);
  }, [variableExpenseCategoryData]);

  // Calculate counts by group
  const countsByGroup = useMemo(
    () => ({
      fixed: countsByGroupData?.[0]?.fixed ?? 0,
      variable: countsByGroupData?.[0]?.variable ?? 0,
      uncategorized: countsByGroupData?.[0]?.uncategorized ?? 0,
    }),
    [countsByGroupData]
  );

  // Calculate counts
  const totalCount = countData?.[0]?.total ?? 0;
  const activeCount = countData?.[0]?.active ?? 0;

  // CRUD operations
  const getById = useCallback(async (id: string): Promise<Category | null> => {
    return getCategoryById(id);
  }, []);

  const create = useCallback(async (data: CreateCategoryDTO): Promise<Category> => {
    return createCategory(data);
  }, []);

  const update = useCallback(
    async (id: string, data: UpdateCategoryDTO): Promise<Category | null> => {
      return updateCategory(id, data);
    },
    []
  );

  const deactivate = useCallback(async (id: string): Promise<Category | null> => {
    return deactivateCategory(id);
  }, []);

  const activate = useCallback(async (id: string): Promise<Category | null> => {
    return activateCategory(id);
  }, []);

  const remove = useCallback(async (id: string): Promise<void> => {
    return deleteCategory(id);
  }, []);

  const deleteWithReplacementFn = useCallback(
    async (id: string, replacementId: string): Promise<void> => {
      return deleteCategoryWithReplacement(id, replacementId);
    },
    []
  );

  // Refresh function (triggers re-render)
  const [, setRefreshKey] = useState(0);
  const refresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  return {
    categories: transformedCategories,
    categoriesWithCounts: transformedCategoriesWithCounts,
    incomeCategories: transformedIncomeCategories,
    expenseCategories: transformedExpenseCategories,
    fixedExpenseCategories: transformedFixedExpenseCategories,
    variableExpenseCategories: transformedVariableExpenseCategories,
    isLoading: !categoryData,
    error: queryError ? String(queryError) : null,
    totalCount,
    activeCount,
    countsByGroup,
    getById,
    create,
    update,
    deactivate,
    activate,
    remove,
    deleteWithReplacement: deleteWithReplacementFn,
    refresh,
  };
}

export default useCategories;
