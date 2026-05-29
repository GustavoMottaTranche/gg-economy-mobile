// Migration to add expense_groups reference table and expense_group column to categories
// This enables categorizing expense categories as 'fixed' (Custo Fixo) or 'variable' (Variáveis)

const sql = `CREATE TABLE IF NOT EXISTS \`expense_groups\` (
  \`id\` text PRIMARY KEY NOT NULL,
  \`name\` text NOT NULL
);
--> statement-breakpoint
INSERT INTO \`expense_groups\` (\`id\`, \`name\`) VALUES ('fixed', 'Custo Fixo');
--> statement-breakpoint
INSERT INTO \`expense_groups\` (\`id\`, \`name\`) VALUES ('variable', 'Variáveis');
--> statement-breakpoint
ALTER TABLE \`categories\` ADD COLUMN \`expense_group\` text REFERENCES \`expense_groups\`(\`id\`);`;

export default sql;
