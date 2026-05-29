// Migration to add installment_group_id column to transactions table
// This column links installment parcels together via a shared UUID,
// enabling group operations (delete all, recalculate) without a separate join table.

const sql = `ALTER TABLE \`transactions\` ADD COLUMN \`installment_group_id\` text;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS \`idx_transactions_installment_group\` ON \`transactions\` (\`installment_group_id\`);`;

export default sql;
