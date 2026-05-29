-- Add installment_group_id column to transactions table for linking installment parcels
ALTER TABLE `transactions` ADD COLUMN `installment_group_id` text;
--> statement-breakpoint
-- Add index for efficient installment group queries
CREATE INDEX IF NOT EXISTS `idx_transactions_installment_group` ON `transactions` (`installment_group_id`);
