ALTER TABLE `weekly_occurrences` ADD COLUMN `is_paid` INTEGER NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `transactions` ADD COLUMN `is_paid` INTEGER NOT NULL DEFAULT 0;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_weekly_occurrences_month_paid` ON `weekly_occurrences` (`reference_month`, `is_paid`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_transactions_month_paid_recurring` ON `transactions` (`reference_month`, `is_paid`, `recurring_id`);
