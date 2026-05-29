// Migration to add title column to transactions, create recurring_transactions table,
// and add recurring_id column to transactions.
// This migration also copies existing description values to title and clears description.
// Requirements: 6.1, 6.2, 6.3, 6.4, 6.5

const sql = `ALTER TABLE \`transactions\` ADD COLUMN \`title\` text NOT NULL DEFAULT '';
--> statement-breakpoint
UPDATE \`transactions\` SET \`title\` = \`description\`;
--> statement-breakpoint
UPDATE \`transactions\` SET \`description\` = '';
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS \`recurring_transactions\` (
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
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS \`idx_recurring_active\` ON \`recurring_transactions\` (\`is_active\`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS \`idx_recurring_start_month\` ON \`recurring_transactions\` (\`start_month\`);
--> statement-breakpoint
ALTER TABLE \`transactions\` ADD COLUMN \`recurring_id\` text REFERENCES \`recurring_transactions\`(\`id\`) ON DELETE SET NULL;`;

export default sql;
