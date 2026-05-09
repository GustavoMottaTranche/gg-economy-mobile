// Auto-generated migration file - DO NOT EDIT
// Original: 0000_jittery_zodiak.sql

const sql = `CREATE TABLE \`categories\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`name\` text NOT NULL,
	\`type\` text NOT NULL,
	\`icon\` text NOT NULL,
	\`color\` text NOT NULL,
	\`is_active\` integer DEFAULT true NOT NULL,
	\`created_at\` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE \`categorization_rules\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`pattern\` text NOT NULL,
	\`category_id\` text NOT NULL,
	\`match_type\` text NOT NULL,
	\`priority\` integer DEFAULT 0 NOT NULL,
	\`is_active\` integer DEFAULT true NOT NULL,
	\`created_at\` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (\`category_id\`) REFERENCES \`categories\`(\`id\`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX \`idx_categorization_rules_pattern\` ON \`categorization_rules\` (\`pattern\`);--> statement-breakpoint
CREATE INDEX \`idx_categorization_rules_priority\` ON \`categorization_rules\` (\`priority\`);--> statement-breakpoint
CREATE TABLE \`import_batches\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`file_name\` text NOT NULL,
	\`file_type\` text NOT NULL,
	\`imported_at\` text DEFAULT (datetime('now')) NOT NULL,
	\`transaction_count\` integer DEFAULT 0 NOT NULL,
	\`status\` text DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
CREATE TABLE \`origins\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`name\` text NOT NULL,
	\`type\` text NOT NULL,
	\`created_at\` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE \`schema_version\` (
	\`version\` integer PRIMARY KEY NOT NULL,
	\`applied_at\` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE \`transactions\` (
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
	FOREIGN KEY (\`category_id\`) REFERENCES \`categories\`(\`id\`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (\`origin_id\`) REFERENCES \`origins\`(\`id\`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (\`batch_id\`) REFERENCES \`import_batches\`(\`id\`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX \`idx_transactions_reference_month\` ON \`transactions\` (\`reference_month\`);--> statement-breakpoint
CREATE INDEX \`idx_transactions_needs_review\` ON \`transactions\` (\`needs_review\`);--> statement-breakpoint
CREATE INDEX \`idx_transactions_category_id\` ON \`transactions\` (\`category_id\`);--> statement-breakpoint
CREATE INDEX \`idx_transactions_batch_id\` ON \`transactions\` (\`batch_id\`);--> statement-breakpoint
CREATE INDEX \`idx_transactions_date\` ON \`transactions\` (\`date\`);--> statement-breakpoint
CREATE TABLE \`user_preferences\` (
	\`key\` text PRIMARY KEY NOT NULL,
	\`value\` text NOT NULL,
	\`updated_at\` text DEFAULT (datetime('now')) NOT NULL
);`;

export default sql;
