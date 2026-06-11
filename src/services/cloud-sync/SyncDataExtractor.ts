/**
 * SyncDataExtractor - Reads all relevant tables from the local SQLite database.
 *
 * Extracts all records from 9 tables via Drizzle ORM for the cloud sync
 * import pipeline. Applies a 30-second overall timeout and fails fast
 * on any individual table read error.
 *
 * @module services/cloud-sync/SyncDataExtractor
 */

import type { Database } from '@db/client';
import {
  categories,
  expenseGroups,
  funds,
  fundAllocations,
  transactions,
  recurringTransactions,
  weeklyRecurringGroups,
  weeklyOccurrences,
  recurringFundLinks,
  categoryGoals,
} from '@db/schema';

import { CloudSyncError } from './CloudSyncError';
import type { ExtractedData } from './types';

/** Timeout for the entire extraction process (30 seconds). */
const EXTRACTION_TIMEOUT_MS = 30_000;

/**
 * Extracts all records from the 9 relevant local database tables.
 *
 * - Reads all records regardless of active/inactive status
 * - Preserves all field values exactly as stored (no type coercion)
 * - Returns empty arrays for tables with zero records
 * - Applies a 30-second overall timeout
 * - On any table read failure: aborts, discards partial data, throws CloudSyncError
 *
 * @param db - Drizzle ORM database client instance
 * @returns Structured ExtractedData object with all 9 tables
 * @throws CloudSyncError with EXTRACTION_FAILED on any failure
 */
export async function extractAll(db: Database): Promise<ExtractedData> {
  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    setTimeout(() => {
      reject(new CloudSyncError('Data extraction timed out after 30 seconds', 'EXTRACTION_FAILED'));
    }, EXTRACTION_TIMEOUT_MS);
  });

  const extractionPromise = performExtraction(db);

  return Promise.race([extractionPromise, timeoutPromise]);
}

/**
 * Performs the actual extraction of all 9 tables sequentially.
 * If any table read fails, aborts and throws with the table name.
 */
async function performExtraction(db: Database): Promise<ExtractedData> {
  const result: ExtractedData = {
    expenseGroups: [],
    categories: [],
    funds: [],
    fundAllocations: [],
    transactions: [],
    recurringTransactions: [],
    weeklyRecurringGroups: [],
    weeklyOccurrences: [],
    recurringFundLinks: [],
    categoryGoals: [],
  };

  result.expenseGroups = await readTable(db, expenseGroups, 'expenseGroups');
  result.categories = await readTable(db, categories, 'categories');
  result.funds = await readTable(db, funds, 'funds');
  result.fundAllocations = await readTable(db, fundAllocations, 'fundAllocations');
  result.transactions = await readTable(db, transactions, 'transactions');
  result.recurringTransactions = await readTable(
    db,
    recurringTransactions,
    'recurringTransactions'
  );
  result.weeklyRecurringGroups = await readTable(
    db,
    weeklyRecurringGroups,
    'weeklyRecurringGroups'
  );
  result.weeklyOccurrences = await readTable(db, weeklyOccurrences, 'weeklyOccurrences');
  result.recurringFundLinks = await readTable(db, recurringFundLinks, 'recurringFundLinks');
  result.categoryGoals = await readTable(db, categoryGoals, 'categoryGoals');

  return result;
}

/**
 * Reads all records from a single table.
 * Wraps errors to identify which table failed.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function readTable<T>(db: Database, table: any, tableName: string): Promise<T[]> {
  try {
    return await db.select().from(table);
  } catch (_error) {
    throw new CloudSyncError(
      `Failed to read local data (table: ${tableName})`,
      'EXTRACTION_FAILED'
    );
  }
}
