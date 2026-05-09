/**
 * Migration runner for GG-Economy Mobile
 *
 * This module handles database migrations using Drizzle's migrate API.
 * It tracks schema versions and applies pending migrations in order.
 */
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import { getDb, getExpoDatabase } from './client';
import migrations from './migrations/migrations';

/**
 * Error class for migration failures
 */
export class MigrationError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'MigrationError';
  }
}

/**
 * Run all pending database migrations
 *
 * This function:
 * 1. Checks for pending migrations
 * 2. Applies them in sequential order
 * 3. Updates the schema version after each migration
 *
 * @throws MigrationError if migration fails
 */
export async function runMigrations(): Promise<void> {
  try {
    const db = getDb();

    // Run Drizzle migrations
    await migrate(db, migrations);

    console.log('[Migration] All migrations applied successfully');
  } catch (error) {
    console.error('[Migration] Migration failed:', error);
    throw new MigrationError(
      'Failed to run database migrations',
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

/**
 * Check if the database needs migrations
 *
 * @returns true if there are pending migrations
 */
export async function hasPendingMigrations(): Promise<boolean> {
  try {
    const sqlite = getExpoDatabase();

    // Check if the __drizzle_migrations table exists
    const result = sqlite.getFirstSync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='__drizzle_migrations'"
    );

    if (!result) {
      // No migrations table means we need to run migrations
      return true;
    }

    // Get the count of applied migrations
    const countResult = sqlite.getFirstSync<{ count: number }>(
      'SELECT COUNT(*) as count FROM __drizzle_migrations'
    );

    const appliedCount = countResult?.count ?? 0;

    // Compare with the number of migrations in the journal
    const totalMigrations = Object.keys(migrations.migrations).length;

    return appliedCount < totalMigrations;
  } catch {
    // If we can't check, assume we need migrations
    return true;
  }
}

/**
 * Get the current schema version
 *
 * @returns The current schema version number, or 0 if no migrations have been applied
 */
export async function getCurrentSchemaVersion(): Promise<number> {
  try {
    const sqlite = getExpoDatabase();

    // Check if the __drizzle_migrations table exists
    const tableExists = sqlite.getFirstSync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='__drizzle_migrations'"
    );

    if (!tableExists) {
      return 0;
    }

    // Get the count of applied migrations as the version
    const result = sqlite.getFirstSync<{ count: number }>(
      'SELECT COUNT(*) as count FROM __drizzle_migrations'
    );

    return result?.count ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Get list of applied migrations
 *
 * @returns Array of applied migration hashes
 */
export async function getAppliedMigrations(): Promise<string[]> {
  try {
    const sqlite = getExpoDatabase();

    // Check if the __drizzle_migrations table exists
    const tableExists = sqlite.getFirstSync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='__drizzle_migrations'"
    );

    if (!tableExists) {
      return [];
    }

    const results = sqlite.getAllSync<{ hash: string }>(
      'SELECT hash FROM __drizzle_migrations ORDER BY created_at'
    );

    return results.map((r) => r.hash);
  } catch {
    return [];
  }
}

/**
 * Initialize the database with migrations
 * This is the main entry point for database setup
 *
 * @returns Promise that resolves when database is ready
 */
export async function initializeDatabase(): Promise<void> {
  console.log('[Database] Initializing database...');

  const needsMigrations = await hasPendingMigrations();

  if (needsMigrations) {
    console.log('[Database] Running pending migrations...');
    await runMigrations();
  } else {
    console.log('[Database] Database is up to date');
  }

  const version = await getCurrentSchemaVersion();
  console.log(`[Database] Current schema version: ${version}`);
}
