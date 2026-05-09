/**
 * Database module exports for GG-Economy Mobile
 *
 * This file re-exports all database-related functionality for convenient imports.
 */

// Schema exports
export * from './schema';

// Client exports
export {
  getDb,
  getExpoDatabase,
  createDrizzleClient,
  resetDbClient,
  withTransaction,
  withTransactionSync,
  useLiveQuery,
  DATABASE_NAME,
  type Database,
} from './client';

// Migration exports
export {
  runMigrations,
  hasPendingMigrations,
  getCurrentSchemaVersion,
  getAppliedMigrations,
  initializeDatabase,
  MigrationError,
} from './migrate';

// Provider exports
export { DatabaseProvider, useDatabase, useDrizzle } from './DatabaseProvider';

// Query exports
export * from './queries';
