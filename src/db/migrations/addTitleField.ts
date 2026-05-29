/**
 * Migration: Add title column, restructure description, create recurring_transactions table
 *
 * This migration:
 * 1. Adds a `title` column to the transactions table
 * 2. Copies existing `description` values into `title`
 * 3. Clears the `description` column (data moved to title)
 * 4. Creates the `recurring_transactions` table with indexes
 * 5. Adds `recurring_id` column to transactions table
 * 6. Updates schema_version
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */
import { getExpoDatabase } from '../client';

/**
 * Execute the migration to add title field and recurring transactions support.
 * All operations are wrapped in a transaction for atomicity.
 *
 * @throws Error if migration fails (transaction is rolled back)
 */
export async function migrateAddTitleField(): Promise<void> {
  const db = getExpoDatabase();

  try {
    db.execSync('BEGIN TRANSACTION');

    // Step 1: Add title column to transactions table
    db.execSync(`ALTER TABLE \`transactions\` ADD COLUMN \`title\` TEXT NOT NULL DEFAULT ''`);

    // Step 2: Copy description values into title (preserving existing data)
    db.execSync(`UPDATE \`transactions\` SET \`title\` = \`description\``);

    // Step 3: Clear description column (data has been moved to title)
    db.execSync(`UPDATE \`transactions\` SET \`description\` = ''`);

    // Step 4: Create recurring_transactions table
    db.execSync(`CREATE TABLE IF NOT EXISTS \`recurring_transactions\` (
      \`id\` text PRIMARY KEY NOT NULL,
      \`title\` text NOT NULL,
      \`amount\` real NOT NULL,
      \`category_id\` text NOT NULL,
      \`category_type\` text NOT NULL,
      \`start_month\` text NOT NULL,
      \`description\` text NOT NULL DEFAULT '',
      \`origin_id\` text,
      \`is_active\` integer DEFAULT 1 NOT NULL,
      \`created_at\` text DEFAULT (datetime('now')) NOT NULL,
      \`updated_at\` text DEFAULT (datetime('now')) NOT NULL,
      FOREIGN KEY (\`category_id\`) REFERENCES \`categories\`(\`id\`) ON UPDATE no action ON DELETE cascade,
      FOREIGN KEY (\`origin_id\`) REFERENCES \`origins\`(\`id\`) ON UPDATE no action ON DELETE set null
    )`);

    // Step 5: Create indexes for recurring_transactions
    db.execSync(
      `CREATE INDEX IF NOT EXISTS \`idx_recurring_active\` ON \`recurring_transactions\` (\`is_active\`)`
    );
    db.execSync(
      `CREATE INDEX IF NOT EXISTS \`idx_recurring_start_month\` ON \`recurring_transactions\` (\`start_month\`)`
    );

    // Step 6: Add recurring_id column to transactions table
    db.execSync(
      `ALTER TABLE \`transactions\` ADD COLUMN \`recurring_id\` text REFERENCES \`recurring_transactions\`(\`id\`) ON DELETE SET NULL`
    );

    // Step 7: Update schema_version
    db.execSync(
      `INSERT OR REPLACE INTO \`schema_version\` (\`version\`, \`applied_at\`) VALUES (5, datetime('now'))`
    );

    db.execSync('COMMIT');
    console.log('[Migration] addTitleField migration applied successfully');
  } catch (error) {
    db.execSync('ROLLBACK');
    console.error('[Migration] addTitleField migration failed, rolled back:', error);
    throw new Error(
      `Migration addTitleField failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Rollback the title field migration.
 * Reverts all changes made by migrateAddTitleField.
 * All operations are wrapped in a transaction for atomicity.
 *
 * Note: SQLite does not support DROP COLUMN directly in older versions.
 * This rollback uses table rebuild approach for full compatibility.
 *
 * @throws Error if rollback fails (transaction is rolled back)
 */
export async function rollbackAddTitleField(): Promise<void> {
  const db = getExpoDatabase();

  try {
    db.execSync('BEGIN TRANSACTION');

    // Step 1: Copy title back to description (restore original data)
    db.execSync(`UPDATE \`transactions\` SET \`description\` = \`title\``);

    // Step 2: Rebuild transactions table without title and recurring_id columns
    // SQLite requires table rebuild to remove columns in older versions
    db.execSync(`CREATE TABLE \`transactions_backup\` AS SELECT
      \`id\`, \`date\`, \`amount\`, \`description\`, \`category_id\`, \`origin_id\`,
      \`batch_id\`, \`reference_month\`, \`needs_review\`, \`is_excluded_from_totals\`,
      \`duplicate_of\`, \`created_at\`, \`updated_at\`, \`installment_group_id\`
    FROM \`transactions\``);

    db.execSync(`DROP TABLE \`transactions\``);

    db.execSync(`CREATE TABLE \`transactions\` (
      \`id\` text PRIMARY KEY NOT NULL,
      \`date\` text NOT NULL,
      \`amount\` real NOT NULL,
      \`description\` text NOT NULL,
      \`category_id\` text,
      \`origin_id\` text,
      \`batch_id\` text,
      \`reference_month\` text NOT NULL,
      \`needs_review\` integer DEFAULT true NOT NULL,
      \`is_excluded_from_totals\` integer DEFAULT false NOT NULL,
      \`duplicate_of\` text,
      \`created_at\` text DEFAULT (datetime('now')) NOT NULL,
      \`updated_at\` text DEFAULT (datetime('now')) NOT NULL,
      \`installment_group_id\` text,
      FOREIGN KEY (\`category_id\`) REFERENCES \`categories\`(\`id\`) ON UPDATE no action ON DELETE set null,
      FOREIGN KEY (\`origin_id\`) REFERENCES \`origins\`(\`id\`) ON UPDATE no action ON DELETE set null,
      FOREIGN KEY (\`batch_id\`) REFERENCES \`import_batches\`(\`id\`) ON UPDATE no action ON DELETE set null
    )`);

    db.execSync(`INSERT INTO \`transactions\` SELECT * FROM \`transactions_backup\``);
    db.execSync(`DROP TABLE \`transactions_backup\``);

    // Step 3: Recreate indexes on transactions table
    db.execSync(
      `CREATE INDEX \`idx_transactions_reference_month\` ON \`transactions\` (\`reference_month\`)`
    );
    db.execSync(
      `CREATE INDEX \`idx_transactions_needs_review\` ON \`transactions\` (\`needs_review\`)`
    );
    db.execSync(
      `CREATE INDEX \`idx_transactions_category_id\` ON \`transactions\` (\`category_id\`)`
    );
    db.execSync(`CREATE INDEX \`idx_transactions_batch_id\` ON \`transactions\` (\`batch_id\`)`);
    db.execSync(`CREATE INDEX \`idx_transactions_date\` ON \`transactions\` (\`date\`)`);
    db.execSync(
      `CREATE INDEX \`idx_transactions_date_id\` ON \`transactions\` (\`date\`, \`id\`)`
    );
    db.execSync(
      `CREATE INDEX \`idx_transactions_month_date\` ON \`transactions\` (\`reference_month\`, \`date\`)`
    );
    db.execSync(
      `CREATE INDEX \`idx_transactions_installment_group\` ON \`transactions\` (\`installment_group_id\`)`
    );

    // Step 4: Drop recurring_transactions table and its indexes
    db.execSync(`DROP INDEX IF EXISTS \`idx_recurring_active\``);
    db.execSync(`DROP INDEX IF EXISTS \`idx_recurring_start_month\``);
    db.execSync(`DROP TABLE IF EXISTS \`recurring_transactions\``);

    // Step 5: Revert schema_version
    db.execSync(`DELETE FROM \`schema_version\` WHERE \`version\` = 5`);

    db.execSync('COMMIT');
    console.log('[Migration] addTitleField rollback applied successfully');
  } catch (error) {
    db.execSync('ROLLBACK');
    console.error('[Migration] addTitleField rollback failed:', error);
    throw new Error(
      `Migration addTitleField rollback failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
