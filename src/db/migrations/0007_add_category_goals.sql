CREATE TABLE IF NOT EXISTS `category_goals` (
	`id` text PRIMARY KEY NOT NULL,
	`category_id` text NOT NULL UNIQUE,
	`amount` real NOT NULL CHECK(`amount` > 0),
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_category_goals_category` ON `category_goals` (`category_id`);
