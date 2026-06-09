-- Migration: Add fund-related tables for the Future Plans feature.
-- Creates funds, fund_allocations, fund_balances, fund_transactions, recurring_fund_links.
-- Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8

CREATE TABLE IF NOT EXISTS `funds` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`icon` text,
	`color` text,
	`is_active` integer NOT NULL DEFAULT 1,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `fund_allocations` (
	`id` text PRIMARY KEY NOT NULL,
	`fund_id` text NOT NULL,
	`reference_month` text NOT NULL,
	`amount` real NOT NULL CHECK(`amount` > 0),
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`fund_id`) REFERENCES `funds`(`id`) ON UPDATE no action ON DELETE CASCADE
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `idx_fund_allocations_fund_month` ON `fund_allocations` (`fund_id`, `reference_month`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `fund_balances` (
	`id` text PRIMARY KEY NOT NULL,
	`fund_id` text NOT NULL UNIQUE,
	`base_amount` real NOT NULL DEFAULT 0 CHECK(`base_amount` >= 0),
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`fund_id`) REFERENCES `funds`(`id`) ON UPDATE no action ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `fund_transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`fund_id` text NOT NULL,
	`transaction_id` text NOT NULL UNIQUE,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`fund_id`) REFERENCES `funds`(`id`) ON UPDATE no action ON DELETE CASCADE,
	FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_fund_transactions_fund` ON `fund_transactions` (`fund_id`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `recurring_fund_links` (
	`id` text PRIMARY KEY NOT NULL,
	`recurring_id` text NOT NULL UNIQUE,
	`fund_id` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`recurring_id`) REFERENCES `recurring_transactions`(`id`) ON UPDATE no action ON DELETE CASCADE,
	FOREIGN KEY (`fund_id`) REFERENCES `funds`(`id`) ON UPDATE no action ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_recurring_fund_links_fund` ON `recurring_fund_links` (`fund_id`);
