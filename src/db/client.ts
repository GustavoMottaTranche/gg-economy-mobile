/**
 * Database client initialization for GG-Economy Mobile
 *
 * This module provides the Drizzle ORM client configured with expo-sqlite.
 * It supports Live Queries for reactive data updates.
 */
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync, SQLiteDatabase } from 'expo-sqlite';
import * as schema from './schema';

// Database file name
export const DATABASE_NAME = 'gg-economy.db';

// SQLite database instance (singleton)
let expoDb: SQLiteDatabase | null = null;

/**
 * Get or create the SQLite database instance
 * Enables change listener for Live Queries support
 */
export function getExpoDatabase(): SQLiteDatabase {
  if (!expoDb) {
    expoDb = openDatabaseSync(DATABASE_NAME, {
      enableChangeListener: true,
    });
  }
  return expoDb;
}

/**
 * Create a Drizzle ORM client instance
 * This is the main interface for database operations
 */
export function createDrizzleClient() {
  const sqlite = getExpoDatabase();
  return drizzle(sqlite, { schema });
}

// Default database client instance (singleton)
let dbInstance: ReturnType<typeof createDrizzleClient> | null = null;

/**
 * Get the singleton Drizzle database client
 * Use this for all database operations in the app
 */
export function getDb() {
  if (!dbInstance) {
    dbInstance = createDrizzleClient();
  }
  return dbInstance;
}

/**
 * Reset the database client (useful for testing)
 */
export function resetDbClient() {
  dbInstance = null;
  if (expoDb) {
    expoDb.closeSync();
    expoDb = null;
  }
}

// Track if we're already inside a transaction
let isInTransaction = false;

/**
 * Execute a function within a database transaction
 * Ensures atomicity - all changes are committed or rolled back together
 * Supports re-entrant calls (if already in a transaction, just runs the function)
 *
 * @param fn - Function to execute within the transaction
 * @returns The result of the function
 * @throws If the function throws, the transaction is rolled back
 */
export async function withTransaction<T>(fn: () => Promise<T>): Promise<T> {
  // If already in a transaction, just run the function (no nesting)
  if (isInTransaction) {
    return fn();
  }

  const sqlite = getExpoDatabase();
  isInTransaction = true;

  sqlite.execSync('BEGIN TRANSACTION');
  try {
    const result = await fn();
    sqlite.execSync('COMMIT');
    return result;
  } catch (error) {
    try {
      sqlite.execSync('ROLLBACK');
    } catch {
      // Ignore rollback errors
    }
    throw error;
  } finally {
    isInTransaction = false;
  }
}

/**
 * Synchronous version of withTransaction for operations that don't need async
 *
 * @param fn - Function to execute within the transaction
 * @returns The result of the function
 * @throws If the function throws, the transaction is rolled back
 */
export function withTransactionSync<T>(fn: () => T): T {
  const sqlite = getExpoDatabase();

  try {
    sqlite.execSync('BEGIN TRANSACTION');
    const result = fn();
    sqlite.execSync('COMMIT');
    return result;
  } catch (error) {
    sqlite.execSync('ROLLBACK');
    throw error;
  }
}

// Export the database type for use in other modules
export type Database = ReturnType<typeof createDrizzleClient>;

// Re-export useLiveQuery for reactive data
export { useLiveQuery } from 'drizzle-orm/expo-sqlite';
