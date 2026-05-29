/**
 * useCategorizationRules Hook
 *
 * Custom hook for managing categorization rules with reactive updates using Drizzle's useLiveQuery.
 *
 * **Validates: Requirements 18, 29**
 */
import { useMemo, useCallback, useState } from 'react';
import { eq, desc, sql } from 'drizzle-orm';
import { useLiveQuery, getDb } from '../db/client';
import { categorizationRules, categories } from '../db/schema';
import {
  createCategorizationRule,
  createCategorizationRuleWithAutoPriority,
  updateCategorizationRule,
  deleteCategorizationRule,
  getCategorizationRuleById,
} from '../db/queries/categorizationRules';
import type {
  CategorizationRule,
  CreateCategorizationRuleDTO,
  UpdateCategorizationRuleDTO,
  Category,
} from '../types';

/**
 * Categorization rule with associated category
 */
export interface CategorizationRuleWithCategory extends CategorizationRule {
  category: Category | null;
}

/**
 * Return type for useCategorizationRules hook
 */
export interface UseCategorizationRulesReturn {
  /** List of rules with category details */
  rules: CategorizationRuleWithCategory[];
  /** Whether data is loading */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
  /** Total count of rules */
  totalCount: number;
  /** Count of active rules */
  activeCount: number;
  /** Get a rule by ID */
  getById: (id: string) => Promise<CategorizationRule | null>;
  /** Create a new rule */
  create: (data: CreateCategorizationRuleDTO) => Promise<CategorizationRule>;
  /** Create a new rule with auto-incremented priority */
  createWithAutoPriority: (
    data: Omit<CreateCategorizationRuleDTO, 'priority'>
  ) => Promise<CategorizationRule>;
  /** Update an existing rule */
  update: (id: string, data: UpdateCategorizationRuleDTO) => Promise<CategorizationRule | null>;
  /** Delete a rule */
  remove: (id: string) => Promise<void>;
  /** Refresh the data */
  refresh: () => void;
}

/**
 * Convert database record to CategorizationRule
 */
function toCategorizationRule(record: typeof categorizationRules.$inferSelect): CategorizationRule {
  return {
    id: record.id,
    pattern: record.pattern,
    categoryId: record.categoryId,
    matchType: record.matchType as CategorizationRule['matchType'],
    priority: record.priority,
    isActive: record.isActive,
    createdAt: new Date(record.createdAt),
  };
}

/**
 * Convert database record to Category
 */
function toCategory(record: typeof categories.$inferSelect): Category {
  return {
    id: record.id,
    name: record.name,
    type: record.type as Category['type'],
    icon: record.icon,
    color: record.color,
    isActive: record.isActive,
    expenseGroup: (record.expenseGroup as Category['expenseGroup']) ?? null,
    createdAt: new Date(record.createdAt),
  };
}

/**
 * Hook for managing categorization rules with reactive updates
 *
 * @returns Categorization rules management interface
 *
 * @example
 * ```tsx
 * const { rules, create, update, remove } = useCategorizationRules();
 *
 * // Create a new rule
 * await create({ pattern: 'UBER', categoryId: 'transport-id', matchType: 'contains' });
 * ```
 */
export function useCategorizationRules(): UseCategorizationRulesReturn {
  const db = getDb();

  // Live query for rules with category details
  const { data: rulesData, error: queryError } = useLiveQuery(
    db
      .select({
        rule: categorizationRules,
        category: categories,
      })
      .from(categorizationRules)
      .leftJoin(categories, eq(categorizationRules.categoryId, categories.id))
      .orderBy(desc(categorizationRules.priority), categorizationRules.pattern)
  );

  // Live query for counts
  const { data: countData } = useLiveQuery(
    db
      .select({
        total: sql<number>`count(*)`,
        active: sql<number>`sum(case when ${categorizationRules.isActive} = 1 then 1 else 0 end)`,
      })
      .from(categorizationRules)
  );

  // Transform data
  const transformedRules = useMemo<CategorizationRuleWithCategory[]>(() => {
    if (!rulesData) return [];
    return rulesData.map(({ rule, category }) => ({
      ...toCategorizationRule(rule),
      category: category ? toCategory(category) : null,
    }));
  }, [rulesData]);

  // Calculate counts
  const totalCount = countData?.[0]?.total ?? 0;
  const activeCount = countData?.[0]?.active ?? 0;

  // CRUD operations
  const getById = useCallback(async (id: string): Promise<CategorizationRule | null> => {
    return getCategorizationRuleById(id);
  }, []);

  const create = useCallback(
    async (data: CreateCategorizationRuleDTO): Promise<CategorizationRule> => {
      return createCategorizationRule(data);
    },
    []
  );

  const createWithAutoPriority = useCallback(
    async (data: Omit<CreateCategorizationRuleDTO, 'priority'>): Promise<CategorizationRule> => {
      return createCategorizationRuleWithAutoPriority(data);
    },
    []
  );

  const update = useCallback(
    async (id: string, data: UpdateCategorizationRuleDTO): Promise<CategorizationRule | null> => {
      return updateCategorizationRule(id, data);
    },
    []
  );

  const remove = useCallback(async (id: string): Promise<void> => {
    return deleteCategorizationRule(id);
  }, []);

  // Refresh function (triggers re-render)
  const [, setRefreshKey] = useState(0);
  const refresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  return {
    rules: transformedRules,
    isLoading: !rulesData,
    error: queryError ? String(queryError) : null,
    totalCount,
    activeCount,
    getById,
    create,
    createWithAutoPriority,
    update,
    remove,
    refresh,
  };
}

export default useCategorizationRules;
