/**
 * Categorization Rule query functions using Drizzle ORM
 *
 * Provides CRUD operations for categorization rules used in automatic
 * transaction categorization.
 */
import { eq, and, desc, sql } from 'drizzle-orm';
import { randomUUID } from 'expo-crypto';
import { getDb } from '../client';
import {
  categorizationRules,
  categories,
  type CategorizationRuleRecord,
  type NewCategorizationRuleRecord,
} from '../schema';
import type {
  CreateCategorizationRuleDTO,
  UpdateCategorizationRuleDTO,
  MatchType,
} from '../../types';

/**
 * Convert a database record to a CategorizationRule with proper date types
 */
function toCategorizationRule(record: CategorizationRuleRecord) {
  return {
    ...record,
    createdAt: new Date(record.createdAt),
  };
}

/**
 * Get all categorization rules
 */
export async function getAllCategorizationRules() {
  const db = getDb();
  const results = await db
    .select()
    .from(categorizationRules)
    .orderBy(desc(categorizationRules.priority), categorizationRules.pattern);
  return results.map(toCategorizationRule);
}

/**
 * Get all active categorization rules (ordered by priority)
 */
export async function getActiveCategorizationRules() {
  const db = getDb();
  const results = await db
    .select()
    .from(categorizationRules)
    .where(eq(categorizationRules.isActive, true))
    .orderBy(desc(categorizationRules.priority), categorizationRules.pattern);
  return results.map(toCategorizationRule);
}

/**
 * Get a categorization rule by ID
 */
export async function getCategorizationRuleById(id: string) {
  const db = getDb();
  const results = await db
    .select()
    .from(categorizationRules)
    .where(eq(categorizationRules.id, id))
    .limit(1);
  const first = results[0];
  return first ? toCategorizationRule(first) : null;
}

/**
 * Get categorization rules by category ID
 */
export async function getCategorizationRulesByCategoryId(categoryId: string) {
  const db = getDb();
  const results = await db
    .select()
    .from(categorizationRules)
    .where(eq(categorizationRules.categoryId, categoryId))
    .orderBy(desc(categorizationRules.priority));
  return results.map(toCategorizationRule);
}

/**
 * Get categorization rules by match type
 */
export async function getCategorizationRulesByMatchType(matchType: MatchType) {
  const db = getDb();
  const results = await db
    .select()
    .from(categorizationRules)
    .where(
      and(eq(categorizationRules.matchType, matchType), eq(categorizationRules.isActive, true))
    )
    .orderBy(desc(categorizationRules.priority));
  return results.map(toCategorizationRule);
}

/**
 * Create a new categorization rule
 */
export async function createCategorizationRule(data: CreateCategorizationRuleDTO) {
  const db = getDb();
  const id = randomUUID();
  const now = new Date().toISOString();

  const newRule: NewCategorizationRuleRecord = {
    id,
    pattern: data.pattern,
    categoryId: data.categoryId,
    matchType: data.matchType,
    priority: data.priority ?? 0,
    isActive: true,
    createdAt: now,
  };

  await db.insert(categorizationRules).values(newRule);

  return toCategorizationRule({
    ...newRule,
    createdAt: now,
  } as CategorizationRuleRecord);
}

/**
 * Update a categorization rule
 */
export async function updateCategorizationRule(id: string, data: UpdateCategorizationRuleDTO) {
  const db = getDb();

  const updateData: Partial<NewCategorizationRuleRecord> = {};

  if (data.pattern !== undefined) {
    updateData.pattern = data.pattern;
  }
  if (data.categoryId !== undefined) {
    updateData.categoryId = data.categoryId;
  }
  if (data.matchType !== undefined) {
    updateData.matchType = data.matchType;
  }
  if (data.priority !== undefined) {
    updateData.priority = data.priority;
  }
  if (data.isActive !== undefined) {
    updateData.isActive = data.isActive;
  }

  await db.update(categorizationRules).set(updateData).where(eq(categorizationRules.id, id));

  return getCategorizationRuleById(id);
}

/**
 * Deactivate a categorization rule
 */
export async function deactivateCategorizationRule(id: string) {
  return updateCategorizationRule(id, { isActive: false });
}

/**
 * Activate a categorization rule
 */
export async function activateCategorizationRule(id: string) {
  return updateCategorizationRule(id, { isActive: true });
}

/**
 * Delete a categorization rule
 */
export async function deleteCategorizationRule(id: string) {
  const db = getDb();
  await db.delete(categorizationRules).where(eq(categorizationRules.id, id));
}

/**
 * Get categorization rule count
 */
export async function getCategorizationRuleCount(): Promise<number> {
  const db = getDb();
  const result = await db.select({ count: sql<number>`count(*)` }).from(categorizationRules);
  return result[0]?.count ?? 0;
}

/**
 * Get active categorization rule count
 */
export async function getActiveCategorizationRuleCount(): Promise<number> {
  const db = getDb();
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(categorizationRules)
    .where(eq(categorizationRules.isActive, true));
  return result[0]?.count ?? 0;
}

/**
 * Get categorization rule with category details
 */
export async function getCategorizationRuleWithCategory(id: string) {
  const db = getDb();
  const results = await db
    .select({
      rule: categorizationRules,
      category: categories,
    })
    .from(categorizationRules)
    .leftJoin(categories, eq(categorizationRules.categoryId, categories.id))
    .where(eq(categorizationRules.id, id))
    .limit(1);

  if (results.length === 0) return null;

  const firstResult = results[0]!;
  const { rule, category } = firstResult;
  return {
    ...toCategorizationRule(rule),
    category: category ? { ...category, createdAt: new Date(category.createdAt) } : null,
  };
}

/**
 * Get all categorization rules with category details
 */
export async function getAllCategorizationRulesWithCategory() {
  const db = getDb();
  const results = await db
    .select({
      rule: categorizationRules,
      category: categories,
    })
    .from(categorizationRules)
    .leftJoin(categories, eq(categorizationRules.categoryId, categories.id))
    .orderBy(desc(categorizationRules.priority), categorizationRules.pattern);

  return results.map(({ rule, category }) => ({
    ...toCategorizationRule(rule),
    category: category ? { ...category, createdAt: new Date(category.createdAt) } : null,
  }));
}

/**
 * Find matching rule for a description
 * Returns the highest priority matching rule
 */
export async function findMatchingRule(description: string) {
  const rules = await getActiveCategorizationRules();

  for (const rule of rules) {
    if (rule.pattern && matchesRule(description, rule.pattern, rule.matchType)) {
      return rule;
    }
  }

  return null;
}

/**
 * Find all matching rules for a description
 */
export async function findAllMatchingRules(description: string) {
  const rules = await getActiveCategorizationRules();
  return rules.filter(
    (rule) => rule.pattern && matchesRule(description, rule.pattern, rule.matchType)
  );
}

/**
 * Check if a description matches a rule pattern
 */
function matchesRule(description: string, pattern: string, matchType: MatchType): boolean {
  const normalizedDescription = description.toLowerCase();
  const normalizedPattern = pattern.toLowerCase();

  switch (matchType) {
    case 'exact':
      return normalizedDescription === normalizedPattern;
    case 'contains':
      return normalizedDescription.includes(normalizedPattern);
    case 'starts_with':
      return normalizedDescription.startsWith(normalizedPattern);
    case 'ends_with':
      return normalizedDescription.endsWith(normalizedPattern);
    case 'regex':
      try {
        const regex = new RegExp(pattern, 'i');
        return regex.test(description);
      } catch {
        // Invalid regex, return false
        return false;
      }
    default:
      return false;
  }
}

/**
 * Check if a rule with the same pattern already exists
 */
export async function rulePatternExists(pattern: string): Promise<boolean> {
  const db = getDb();
  const results = await db
    .select()
    .from(categorizationRules)
    .where(eq(categorizationRules.pattern, pattern))
    .limit(1);
  return results.length > 0;
}

/**
 * Get the highest priority value (for setting new rule priority)
 */
export async function getHighestPriority(): Promise<number> {
  const db = getDb();
  const result = await db
    .select({ maxPriority: sql<number>`MAX(${categorizationRules.priority})` })
    .from(categorizationRules);
  return result[0]?.maxPriority ?? 0;
}

/**
 * Create a rule with auto-incremented priority
 */
export async function createCategorizationRuleWithAutoPriority(
  data: Omit<CreateCategorizationRuleDTO, 'priority'>
) {
  const highestPriority = await getHighestPriority();
  return createCategorizationRule({
    ...data,
    priority: highestPriority + 1,
  });
}
