CREATE TABLE IF NOT EXISTS `weekly_recurring_groups` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`amount` real NOT NULL,
	`day_of_week` integer NOT NULL,
	`category_id` text NOT NULL,
	`category_type` text NOT NULL DEFAULT 'expense',
	`description` text NOT NULL DEFAULT '',
	`origin_id` text,
	`start_date` text NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`origin_id`) REFERENCES `origins`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_weekly_groups_active` ON `weekly_recurring_groups` (`is_active`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_weekly_groups_day` ON `weekly_recurring_groups` (`day_of_week`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `weekly_occurrences` (
	`id` text PRIMARY KEY NOT NULL,
	`weekly_group_id` text NOT NULL,
	`date` text NOT NULL,
	`reference_month` text NOT NULL,
	`amount` real NOT NULL,
	`description` text NOT NULL DEFAULT '',
	`is_value_edited` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`weekly_group_id`) REFERENCES `weekly_recurring_groups`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_weekly_occurrences_group` ON `weekly_occurrences` (`weekly_group_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_weekly_occurrences_month` ON `weekly_occurrences` (`reference_month`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_weekly_occurrences_date` ON `weekly_occurrences` (`date`);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `idx_weekly_occurrences_group_date` ON `weekly_occurrences` (`weekly_group_id`, `date`);
