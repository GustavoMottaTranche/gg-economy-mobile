-- Create expense_groups reference table
CREATE TABLE IF NOT EXISTS `expense_groups` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL
);
--> statement-breakpoint
-- Insert default expense group records
INSERT INTO `expense_groups` (`id`, `name`) VALUES ('fixed', 'Custo Fixo');
--> statement-breakpoint
INSERT INTO `expense_groups` (`id`, `name`) VALUES ('variable', 'Variáveis');
--> statement-breakpoint
-- Add expense_group column to categories table with FK reference
ALTER TABLE `categories` ADD COLUMN `expense_group` text REFERENCES `expense_groups`(`id`);
