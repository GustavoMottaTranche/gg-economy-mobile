-- Add batch_group_id column to import_batches table for multi-file imports
ALTER TABLE `import_batches` ADD COLUMN `batch_group_id` text;
--> statement-breakpoint
-- Add composite indexes for better pagination performance
CREATE INDEX IF NOT EXISTS `idx_transactions_date_id` ON `transactions` (`date`, `id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_transactions_month_date` ON `transactions` (`reference_month`, `date`);
