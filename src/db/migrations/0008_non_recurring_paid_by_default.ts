// Migration to set all existing non-recurring transactions as paid and
// add a trigger ensuring future non-recurring inserts default to is_paid=true.
// Non-recurring transactions (recurring_id IS NULL) represent one-off expenses
// that should always be considered paid.

const sql = `UPDATE \`transactions\` SET \`is_paid\` = 1, \`updated_at\` = datetime('now') WHERE \`recurring_id\` IS NULL AND \`is_paid\` = 0;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS \`set_paid_for_non_recurring\` AFTER INSERT ON \`transactions\` FOR EACH ROW WHEN NEW.\`recurring_id\` IS NULL AND NEW.\`is_paid\` = 0 BEGIN UPDATE \`transactions\` SET \`is_paid\` = 1 WHERE \`id\` = NEW.\`id\`; END;`;

export default sql;
