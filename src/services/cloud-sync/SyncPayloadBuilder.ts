/**
 * SyncPayloadBuilder
 *
 * Transforms extracted local database data into the JSON structure
 * expected by the server's import API.
 *
 * Responsibilities:
 * - Convert camelCase field names to snake_case
 * - Map categoryGoals → budget_goals
 * - Derive installment_groups from transactions
 * - Preserve id, monetary values, dates, and boolean integers (0/1)
 * - Produce JSON-serializable output
 *
 * @module services/cloud-sync/SyncPayloadBuilder
 */

import type { ExtractedData, ImportPayload } from './types';

/**
 * Converts a camelCase string to snake_case.
 *
 * Inserts an underscore before each uppercase letter and lowercases the result.
 * Already-lowercase strings (e.g., "id", "name") pass through unchanged.
 *
 * @example
 * camelToSnake("categoryId") // "category_id"
 * camelToSnake("isExcludedFromTotals") // "is_excluded_from_totals"
 * camelToSnake("id") // "id"
 */
export function camelToSnake(key: string): string {
  return key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

/**
 * Converts all keys of a record from camelCase to snake_case,
 * preserving values exactly as they are.
 */
function convertRecord(record: Record<string, unknown>): Record<string, unknown> {
  const converted: Record<string, unknown> = {};
  for (const key of Object.keys(record)) {
    converted[camelToSnake(key)] = record[key];
  }
  return converted;
}

/**
 * Converts an array of records, transforming all keys to snake_case.
 */
function convertRecords(records: Record<string, unknown>[]): Record<string, unknown>[] {
  return records.map(convertRecord);
}

/**
 * Derives installment_groups from transactions.
 *
 * Extracts distinct non-null installmentGroupId values and produces
 * entries with id, parcel_count (number of txs in group), start_month, and total amount.
 */
function deriveInstallmentGroups(
  transactions: Record<string, unknown>[]
): Record<string, unknown>[] {
  const groups = new Map<string, { count: number; total: number; startMonth: string }>();

  for (const tx of transactions) {
    const groupId = tx.installmentGroupId as string | null | undefined;
    if (!groupId) continue;

    const existing = groups.get(groupId);
    const amount = typeof tx.amount === 'number' ? tx.amount : 0;
    const month = (tx.referenceMonth as string) ?? '';

    if (existing) {
      existing.count += 1;
      existing.total += amount;
      if (month && (!existing.startMonth || month < existing.startMonth)) {
        existing.startMonth = month;
      }
    } else {
      groups.set(groupId, { count: 1, total: amount, startMonth: month });
    }
  }

  return Array.from(groups.entries()).map(([id, info]) => ({
    id,
    parcel_count: info.count,
    total_cents: Math.round(Math.abs(info.total) * 100),
    start_month: info.startMonth || new Date().toISOString().slice(0, 7),
  }));
}

/**
 * Builds the import payload from extracted local database data.
 *
 * - Converts all camelCase field names to snake_case
 * - Enriches transactions with `type` derived from categories
 * - Maps categoryGoals → budget_goals
 * - Derives installment_groups with counts from transactions
 * - Preserves id fields, monetary values, dates, and boolean integers (0/1)
 * - Includes empty arrays for tables with zero records
 * - Produces JSON-serializable output
 */
export function buildPayload(data: ExtractedData): ImportPayload {
  // Build expense group name lookup (resolves FK UUIDs to "fixed"/"variable" strings)
  const expenseGroupNames = new Map<string, string>();
  for (const group of (data.expenseGroups ?? []) as unknown as Record<string, unknown>[]) {
    if (group.id && group.name) {
      expenseGroupNames.set(group.id as string, group.name as string);
    }
  }

  // Build category type lookup for enriching transactions
  const categoryTypeMap = new Map<string, string>();
  for (const cat of data.categories as unknown as Record<string, unknown>[]) {
    if (cat.id && cat.type) {
      categoryTypeMap.set(cat.id as string, cat.type as string);
    }
  }

  // Process categories: resolve expense_group FK to name string
  const processedCategories = (data.categories as unknown as Record<string, unknown>[]).map(
    (cat) => {
      const converted = convertRecord(cat);
      if (converted.expense_group && typeof converted.expense_group === 'string') {
        const name = expenseGroupNames.get(converted.expense_group as string);
        converted.expense_group = name ?? 'variable';
      }
      return converted;
    }
  );

  // Enrich transactions with type from their category
  const enrichedTransactions = (data.transactions as unknown as Record<string, unknown>[]).map(
    (tx) => {
      const categoryId = tx.categoryId as string | null;
      const type = categoryId ? (categoryTypeMap.get(categoryId) ?? 'expense') : 'expense';
      return { ...tx, type };
    }
  );

  return {
    tables: {
      categories: processedCategories,
      funds: convertRecords(data.funds as unknown as Record<string, unknown>[]),
      installment_groups: deriveInstallmentGroups(enrichedTransactions),
      recurring_transactions: convertRecords(
        data.recurringTransactions as unknown as Record<string, unknown>[]
      ),
      weekly_recurring_groups: convertRecords(
        data.weeklyRecurringGroups as unknown as Record<string, unknown>[]
      ),
      fund_allocations: convertRecords(
        data.fundAllocations as unknown as Record<string, unknown>[]
      ),
      transactions: convertRecords(enrichedTransactions),
      recurring_fund_links: convertRecords(
        data.recurringFundLinks as unknown as Record<string, unknown>[]
      ),
      weekly_occurrences: convertRecords(
        data.weeklyOccurrences as unknown as Record<string, unknown>[]
      ),
      budget_goals: convertRecords(data.categoryGoals as unknown as Record<string, unknown>[]),
    },
  };
}
