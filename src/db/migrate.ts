/**
 * Migration runner for GG-Economy Mobile
 *
 * This module handles database migrations using Drizzle's migrate API.
 * It tracks schema versions and applies pending migrations in order.
 */
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import { Alert } from 'react-native';
import { getDb, getExpoDatabase } from './client';
import migrations from './migrations/migrations';
import { seedDefaultCategories } from './queries/categories';
import { generateMonthlyTransactions } from '../services/recurring/RecurringTransactionService';

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
 * Sync the schema_version table after Drizzle migrations.
 *
 * The Drizzle migration 0004 adds the title column and recurring_transactions table,
 * but does not update the custom schema_version table. This function ensures
 * schema_version is kept in sync so other parts of the app can check it.
 *
 * Requirements: 6.1
 */
function syncSchemaVersion(): void {
  const sqlite = getExpoDatabase();

  try {
    // Check if schema_version table exists
    const tableExists = sqlite.getFirstSync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='schema_version'"
    );

    if (!tableExists) {
      return;
    }

    // Check current schema_version
    const current = sqlite.getFirstSync<{ version: number }>(
      'SELECT MAX(version) as version FROM schema_version'
    );

    const currentVersion = current?.version ?? 0;

    // If title column migration (version 5) hasn't been recorded yet,
    // check if the Drizzle migration already applied the schema changes
    if (currentVersion < 5) {
      // Verify the title column exists (Drizzle migration 0004 applied it)
      const titleColumn = sqlite.getFirstSync<{ name: string }>(
        "SELECT name FROM pragma_table_info('transactions') WHERE name='title'"
      );

      if (titleColumn) {
        // Drizzle migration already applied the changes, sync schema_version
        sqlite.runSync(
          "INSERT OR REPLACE INTO `schema_version` (`version`, `applied_at`) VALUES (5, datetime('now'))"
        );
        console.log('[Migration] schema_version synced to version 5 (addTitleField)');
      }
    }
  } catch (error) {
    // Non-critical: schema_version sync failure should not block app startup
    console.warn('[Migration] Failed to sync schema_version:', error);
  }
}

/**
 * Initialize the database with migrations
 * This is the main entry point for database setup
 *
 * Handles:
 * - Running pending Drizzle migrations (including 0004_add_title_and_recurring)
 * - Syncing schema_version table after migrations
 * - Seeding default categories
 * - User-facing error alerts on migration failure (Requirement 6.5)
 *
 * @returns Promise that resolves when database is ready
 * @throws MigrationError if migration fails
 */
export async function initializeDatabase(): Promise<void> {
  console.log('[Database] Initializing database...');

  const needsMigrations = await hasPendingMigrations();

  if (needsMigrations) {
    console.log('[Database] Running pending migrations...');
    try {
      await runMigrations();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown migration error';

      console.error('[Database] Migration failed:', errorMessage);

      // Show user-facing error alert (Requirement 6.5)
      Alert.alert(
        'Database Update Failed',
        'The database migration failed. Please restart the app to try again. If the problem persists, contact support.\n\nError: ' +
          errorMessage,
        [{ text: 'OK' }]
      );

      throw new MigrationError(
        `Database migration failed: ${errorMessage}`,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  } else {
    console.log('[Database] Database is up to date');
  }

  // Sync schema_version table after Drizzle migrations (Requirement 6.1)
  syncSchemaVersion();

  const version = await getCurrentSchemaVersion();
  console.log(`[Database] Current schema version: ${version}`);

  // Seed default categories if none exist
  const seeded = await seedDefaultCategories();
  if (seeded) {
    console.log('[Database] Default categories seeded successfully');
  }

  // Generate recurring transactions for the current month (idempotent)
  try {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    await generateMonthlyTransactions(currentMonth);
    console.log(`[Database] Recurring transactions generated for ${currentMonth}`);
  } catch (error) {
    // Log but don't fail initialization — recurring generation can retry next time
    console.warn('[Database] Failed to generate recurring transactions:', error);
  }
}
